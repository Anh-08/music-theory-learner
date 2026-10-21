import { useSyncExternalStore } from 'react'
import type { Score } from '../theory/score'
import type { EventRef } from '../theory/scoreEdit'
import { beatsPerBar as barBeats, scoreToEvents, type PlaybackOptions } from '../theory/scorePlayback'
import { getClick } from './click'
import { getTone, getVoice, type InstrumentId, type Voice } from './instruments'
import { claimTransport, ownsTransport, releaseTransport } from './transportOwner'

/**
 * Plays a score from the sheet editor (Phase 10.4). The timing comes from `scoreToEvents` in seconds;
 * events are placed on the shared Transport (so starting the Jam Room or the metronome stops it, and the other way round).
 */

export interface ScorePlayerState {
  playing: boolean
  /** Event being played (for the cursor highlight and the fretboard). */
  current: EventRef | null
  /** True during the count-in bar. */
  countIn: boolean
}

let state: ScorePlayerState = { playing: false, current: null, countIn: false }
const listeners = new Set<() => void>()

export const scorePlayerStore = {
  get: () => state,
  set(next: Partial<ScorePlayerState>) {
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export function useScorePlayer(): ScorePlayerState {
  return useSyncExternalStore(scorePlayerStore.subscribe, scorePlayerStore.get)
}

export interface ScorePlayOptions extends PlaybackOptions {
  instrument: InstrumentId
  /** Play the bars again and again (with `bars`, or the whole score). */
  loop?: boolean
  /** One bar of clicks before the music. */
  countIn?: boolean
  /** Clicks on every beat while playing. */
  metronome?: boolean
}

let session = 0
let activeVoice: Voice | null = null
const timers = new Set<ReturnType<typeof setTimeout>>()

function later(fn: () => void, ms: number) {
  const id = setTimeout(() => {
    timers.delete(id)
    fn()
  }, Math.max(0, ms))
  timers.add(id)
}

function release() {
  session++
  timers.forEach(clearTimeout)
  timers.clear()
  scorePlayerStore.set({ playing: false, current: null, countIn: false })
}

export async function playScore(score: Score, opts: ScorePlayOptions): Promise<void> {
  const plan = scoreToEvents(score, opts)
  if (plan.events.length === 0) return
  const [T, voice, click] = await Promise.all([getTone(), getVoice(opts.instrument), getClick()])
  claimTransport(release)
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  transport.loop = false
  transport.position = 0
  const my = ++session

  activeVoice = voice
  const beatsPerBar = Math.max(1, Math.round(barBeats(score.timeSig)))
  const lead = opts.countIn ? beatsPerBar * plan.beat : 0
  const show = (time: number, next: Partial<ScorePlayerState>) => later(() => my === session && scorePlayerStore.set(next), (time - T.now()) * 1000)

  if (opts.countIn) {
    for (let b = 0; b < beatsPerBar; b++) transport.schedule((time) => click.tick(time, b === 0, 1), b * plan.beat)
    transport.schedule((time) => show(time, { countIn: true }), 0)
  }
  for (const e of plan.events) {
    transport.schedule((time) => {
      for (const s of e.sounds) voice.play([s.midi], time + (s.at - e.at), s.duration, s.velocity)
      show(time, { current: e.ref, countIn: false })
    }, lead + e.at)
  }
  if (opts.metronome) {
    for (const b of plan.beats) transport.schedule((time) => click.tick(time, b.downbeat, 0.8), lead + b.at)
  }

  const end = lead + plan.total
  if (opts.loop) {
    // The count-in plays once; the loop covers the music only.
    transport.loopStart = lead
    transport.loopEnd = end
    transport.loop = true
  } else {
    transport.schedule((time) => later(() => my === session && void stopScore(), (time - T.now()) * 1000 + 300), end)
  }
  scorePlayerStore.set({ playing: true, current: null, countIn: !!opts.countIn })
  transport.start('+0.05')
}

export async function stopScore(): Promise<void> {
  if (!ownsTransport(release)) return release()
  const T = await getTone()
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  transport.loop = false
  releaseTransport(release)
  release()
  activeVoice?.releaseAll()
}

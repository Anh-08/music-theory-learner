import type * as ToneNs from 'tone'
import type { ProgressionChord } from '../theory'
import type { Groove } from './grooves'
import { getClick, type Click } from './click'
import { getTone, getVoice, type InstrumentId } from './instruments'
import { buildJamEvents, loopBeats, type JamEvent, type JamTrack } from './jamEvents'
import type { Rhythm } from './rhythms'
import { jamStore } from './jamStore'
import { claimTransport, ownsTransport, releaseTransport } from './transportOwner'

type Tone = typeof ToneNs

export interface JamOptions {
  ownerId: string
  chords: ProgressionChord[]
  groove: Groove
  tempo: number
  instrument: InstrumentId
  mutes: Record<JamTrack, boolean>
  /** Guitar rhythm replacing the groove's default chord comping. */
  rhythm?: Rhythm
  /** Raise the tempo by 5 bpm after every loop, up to this tempo. */
  rampTo?: number
  /** Guitar shape chosen for each chord (by symbol). */
  shapes?: Record<string, (number | null)[]>
}

interface Kit {
  kick: ToneNs.MembraneSynth
  snare: ToneNs.NoiseSynth
  hat: ToneNs.NoiseSynth
  bass: ToneNs.MonoSynth
  click: Click
  chop: ToneNs.NoiseSynth
}

let kitPromise: Promise<Kit> | null = null

/** The click sits a little under the band (about −4 dB) so it does not cover the drums. */
const JAM_CLICK_LEVEL = 0.63

function createKit(T: Tone, click: Click): Kit {
  const kick = new T.MembraneSynth({ pitchDecay: 0.03, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } }).toDestination()
  kick.volume.value = -4
  const snareFilter = new T.Filter(1800, 'highpass').toDestination()
  const snare = new T.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.14, sustain: 0 } }).connect(snareFilter)
  snare.volume.value = -14
  const hatFilter = new T.Filter(8000, 'highpass').toDestination()
  const hat = new T.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.035, sustain: 0 } }).connect(hatFilter)
  hat.volume.value = -22
  const bass = new T.MonoSynth({
    oscillator: { type: 'sawtooth' },
    filter: { type: 'lowpass', Q: 1 },
    filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.3, baseFrequency: 110, octaves: 2.2 },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.7, release: 0.15 },
  }).toDestination()
  bass.volume.value = -9
  // Muted "chop": a short, dull knock.
  const chopFilter = new T.Filter(1400, 'bandpass').toDestination()
  const chop = new T.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 } }).connect(chopFilter)
  chop.volume.value = -4
  return { kick, snare, hat, bass, click, chop }
}

let part: ToneNs.Part | null = null
const hitListeners = new Set<(time: number) => void>()

/**
 * Hears the timing of every hit in the guitar rhythm (strum / pick / chop), even when the Guitar part is muted —
 * used to score steadiness. Times include the device output latency (when the player actually hears it).
 */
export function onRhythmHit(l: (time: number) => void): () => void {
  hitListeners.add(l)
  return () => hitListeners.delete(l)
}
let mutes: Record<JamTrack, boolean> = { drums: false, bass: false, chords: false, click: true }

function release() {
  part?.dispose()
  part = null
  jamStore.set({ ownerId: null, bar: 0, step: -1 })
}

/** Calls `fn` exactly at `time` (AudioContext time) using a timer — Draw stops when the tab is hidden. */
function at(T: Tone, time: number, fn: () => void) {
  setTimeout(fn, Math.max(0, (time - T.now()) * 1000))
}

/** Plays the progression loop with drums, bass and chord comping. Calling again while playing restarts with the new settings. */
export async function startJam(opts: JamOptions): Promise<void> {
  const T = await getTone()
  kitPromise ??= getClick().then((click) => createKit(T, click))
  const [kit, voice] = await Promise.all([kitPromise, getVoice(opts.instrument)])

  claimTransport(release)
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  part?.dispose()
  transport.position = 0
  transport.bpm.value = opts.tempo
  mutes = { ...opts.mutes }

  const ppq = transport.PPQ
  const ticks = (beats: number) => `${Math.round(beats * ppq)}i`
  const seconds = (beats: number) => (beats * 60) / transport.bpm.value
  const roll = opts.instrument === 'guitar' ? 0.012 : 0
  const raw = T.getContext().rawContext as AudioContext
  const outputLatency = (raw.outputLatency ?? 0) + (raw.baseLatency ?? 0)

  const events = buildJamEvents(opts.chords, opts.groove, opts.instrument, opts.rhythm, opts.shapes)
  let loops = 0
  const thisPart: ToneNs.Part = new T.Part<JamEvent & { time: string }>(
    (time, ev) => {
      switch (ev.kind) {
        case 'bar':
          if (ev.bar === 0 && loops++ > 0 && opts.rampTo && transport.bpm.value < opts.rampTo) {
            const next = Math.min(opts.rampTo, Math.round(transport.bpm.value) + 5)
            transport.bpm.setValueAtTime(next, time)
            at(T, time, () => part === thisPart && jamStore.set({ tempo: next }))
          }
          at(T, time, () => part === thisPart && jamStore.set({ bar: ev.bar }))
          break
        case 'pos':
          at(T, time, () => part === thisPart && jamStore.set({ step: ev.step }))
          break
        case 'click':
          if (!mutes.click) kit.click.tick(time, ev.accent, JAM_CLICK_LEVEL)
          break
        case 'strum':
          if (hitListeners.size) hitListeners.forEach((l) => l(time + outputLatency))
          if (!mutes.chords) ev.midis.forEach((m, i) => voice.play([m], time + i * ev.spread, seconds(ev.beats) * 0.95, ev.velocity))
          break
        case 'mute':
          if (hitListeners.size) hitListeners.forEach((l) => l(time + outputLatency))
          if (!mutes.chords) {
            voice.releaseAll(time)
            kit.chop.triggerAttackRelease('32n', time)
          }
          break
        case 'kick':
          if (!mutes.drums) kit.kick.triggerAttackRelease('C1', '8n', time, ev.accent ? 1 : 0.8)
          break
        case 'snare':
          if (!mutes.drums) kit.snare.triggerAttackRelease('16n', time)
          break
        case 'hat':
          if (!mutes.drums) kit.hat.triggerAttackRelease('32n', time, ev.accent ? 0.9 : 0.5)
          break
        case 'bass':
          if (!mutes.bass) kit.bass.triggerAttackRelease(T.Frequency(ev.midi, 'midi').toFrequency(), seconds(ev.beats) * 0.92, time)
          break
        case 'chord':
          if (!mutes.chords) ev.midis.forEach((m, i) => voice.play([m], time + i * roll, seconds(ev.beats) * 0.95))
          break
      }
    },
    events.map((e) => ({ ...e, time: ticks(e.beat) })),
  )
  part = thisPart
  part.loop = true
  part.loopStart = 0
  part.loopEnd = ticks(loopBeats(opts.chords, opts.groove.beatsPerBar))
  part.start(0)
  jamStore.set({ ownerId: opts.ownerId, bar: 0, step: -1, tempo: opts.tempo })
  transport.start('+0.1')
}

/** Change tempo / mute parts without stopping the music. */
export async function updateJam(next: { tempo?: number; mutes?: Record<JamTrack, boolean> }): Promise<void> {
  if (next.mutes) mutes = { ...next.mutes }
  if (next.tempo !== undefined && part) {
    const T = await getTone()
    T.getTransport().bpm.rampTo(next.tempo, 0.1)
    jamStore.set({ tempo: next.tempo })
  }
}

/** Stops the Jam. With `ownerId`, only stops if that player is the one playing. */
export async function stopJam(ownerId?: string): Promise<void> {
  if (!ownsTransport(release)) return
  if (ownerId !== undefined && jamStore.get().ownerId !== ownerId) return
  const T = await getTone()
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  releaseTransport(release)
  release()
}

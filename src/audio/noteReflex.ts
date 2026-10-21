import { useSyncExternalStore } from 'react'
import { getClick } from './click'
import { getTone } from './instruments'
import { claimTransport, ownsTransport, releaseTransport } from './transportOwner'

/**
 * Metronome for the fretboard note reflex drill: one bar of count-in, then a click every beat.
 * The drill itself decides when the note changes (every N beats) through `onBeat`.
 */

export interface NoteMetronomeOptions {
  ownerId: string
  tempo: number
  beatsPerBar: number
  /** Called exactly when each beat sounds: negative during the count-in (-4…-1), then 0, 1, 2… */
  onBeat: (beat: number) => void
}

export interface NoteMetronomeState {
  ownerId: string | null
  /** Count-in beats left (0 = running). */
  countIn: number
}

let state: NoteMetronomeState = { ownerId: null, countIn: 0 }
const listeners = new Set<() => void>()

function set(next: Partial<NoteMetronomeState>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

export const noteMetronomeStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export function useNoteMetronome(): NoteMetronomeState {
  return useSyncExternalStore(noteMetronomeStore.subscribe, noteMetronomeStore.get)
}

let repeatId: number | null = null

function release() {
  if (repeatId !== null) void getTone().then((T) => repeatId !== null && T.getTransport().clear(repeatId))
  repeatId = null
  set({ ownerId: null, countIn: 0 })
}

export async function startNoteMetronome(opts: NoteMetronomeOptions): Promise<void> {
  const T = await getTone()
  const c = await getClick()
  claimTransport(release)
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  transport.position = 0
  transport.bpm.value = opts.tempo

  let beat = -opts.beatsPerBar
  const id = transport.scheduleRepeat((time) => {
    if (repeatId !== id) return
    const b = beat++
    const accent = ((b % opts.beatsPerBar) + opts.beatsPerBar) % opts.beatsPerBar === 0
    c.tick(time, accent)
    // A timer instead of Draw: Draw stops while the tab is hidden.
    setTimeout(
      () => {
        if (repeatId !== id) return
        set({ countIn: b < 0 ? -b : 0 })
        opts.onBeat(b)
      },
      Math.max(0, (time - T.now()) * 1000),
    )
  }, '4n', 0)
  repeatId = id
  set({ ownerId: opts.ownerId, countIn: opts.beatsPerBar })
  transport.start('+0.1')
}

/** Stops. With `ownerId`, only stops if that drill is the one running. */
export async function stopNoteMetronome(ownerId?: string): Promise<void> {
  if (!ownsTransport(release)) return
  if (ownerId !== undefined && state.ownerId !== ownerId) return
  const T = await getTone()
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  releaseTransport(release)
  release()
}

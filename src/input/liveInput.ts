import { getTone } from '../audio/instruments'
import { createOnsetDetector, detectPitch, freqToMidi, rms } from './pitch'

export type LiveSource = 'none' | 'midi' | 'mic'

export interface LiveState {
  source: LiveSource
  status: 'idle' | 'connecting' | 'on' | 'error' | 'unsupported'
  /** Error code for the UI to translate: 'denied' (permission refused), 'noDevice', 'other'. */
  error?: 'denied' | 'noDevice' | 'other'
  /** Name of the MIDI device being listened to. */
  devices: string[]
  /** MIDI: keys being held. */
  held: number[]
  /** Mic: note being heard (midi) and its cent offset, null when silent / unclear. */
  detected: { midi: number; cents: number } | null
  /** Mic: level 0–1. */
  level: number
}

const initial: LiveState = { source: 'none', status: 'idle', devices: [], held: [], detected: null, level: 0 }
let state: LiveState = initial
const stateListeners = new Set<() => void>()
const noteListeners = new Set<(midi: number) => void>()
const onsetListeners = new Set<(time: number) => void>()

function set(next: Partial<LiveState>) {
  state = { ...state, ...next }
  stateListeners.forEach((l) => l())
}

export const liveStore = {
  get: () => state,
  set,
  subscribe(l: () => void) {
    stateListeners.add(l)
    return () => stateListeners.delete(l)
  },
}

/** Listens for each new note played on a real instrument (MIDI: key pressed; mic: a newly stable note). */
export function onLiveNote(l: (midi: number) => void): () => void {
  noteListeners.add(l)
  return () => noteListeners.delete(l)
}

/** Listens for strums / plucks (mic), timed on Tone.js's AudioContext clock. */
export function onLiveOnset(l: (time: number) => void): () => void {
  onsetListeners.add(l)
  return () => onsetListeners.delete(l)
}

function emitNote(m: number) {
  noteListeners.forEach((l) => l(m))
}

let cleanup: (() => void) | null = null

export function disconnectLive() {
  cleanup?.()
  cleanup = null
  set(initial)
}

/** Handles one raw MIDI message (separate so it can be tested). */
export function handleMidiMessage(data: ArrayLike<number>) {
  const [status, note, velocity] = [data[0], data[1], data[2] ?? 0]
  const type = status & 0xf0
  if (type === 0x90 && velocity > 0) {
    if (!state.held.includes(note)) set({ held: [...state.held, note].sort((a, b) => a - b) })
    emitNote(note)
  } else if (type === 0x80 || (type === 0x90 && velocity === 0)) {
    set({ held: state.held.filter((n) => n !== note) })
  }
}

export async function connectMidi(): Promise<void> {
  disconnectLive()
  const nav = navigator as Navigator & { requestMIDIAccess?: () => Promise<MIDIAccess> }
  if (!nav.requestMIDIAccess) return set({ source: 'midi', status: 'unsupported' })
  set({ source: 'midi', status: 'connecting' })
  try {
    const access = await nav.requestMIDIAccess()
    const listen = () => {
      const inputs = [...access.inputs.values()]
      inputs.forEach((i) => (i.onmidimessage = (e) => e.data && handleMidiMessage(e.data)))
      set({ devices: inputs.map((i) => i.name ?? 'MIDI'), status: 'on', error: inputs.length ? undefined : 'noDevice' })
    }
    listen()
    access.onstatechange = listen
    cleanup = () => {
      access.onstatechange = null
      access.inputs.forEach((i) => (i.onmidimessage = null))
    }
  } catch (e) {
    set({ status: 'error', error: e instanceof DOMException && e.name === 'SecurityError' ? 'denied' : 'other' })
  }
}

/** Tracks stable notes from the mic: the same clear note over several consecutive frames counts as one new note. */
export function createNoteStabilizer(frames = 3) {
  let candidate: number | null = null
  let count = 0
  let current: number | null = null
  return (midi: number | null): number | null => {
    if (midi === null) {
      candidate = null
      count = 0
      current = null
      return null
    }
    if (midi === candidate) count++
    else {
      candidate = midi
      count = 1
    }
    if (count >= frames && midi !== current) {
      current = midi
      return midi
    }
    return null
  }
}

export async function connectMic(): Promise<void> {
  disconnectLive()
  if (!navigator.mediaDevices?.getUserMedia) return set({ source: 'mic', status: 'unsupported' })
  set({ source: 'mic', status: 'connecting' })
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
    // Share Tone.js's AudioContext so onset times line up with the backing track.
    const T = await getTone()
    const ctx = T.getContext().rawContext as AudioContext
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    const small = new Float32Array(512)
    const stable = createNoteStabilizer()
    const onset = createOnsetDetector()
    let pitchTick = 0

    const timer = setInterval(() => {
      // Short frames (512 samples) for onsets — better time resolution.
      analyser.getFloatTimeDomainData(buf)
      small.set(buf.subarray(buf.length - small.length))
      const level = rms(small)
      const now = ctx.currentTime - small.length / ctx.sampleRate / 2
      if (onset(level, now)) onsetListeners.forEach((l) => l(now))

      // Pitch: every 4th frame (~40 ms), using the full long frame.
      if (++pitchTick % 4) return
      const r = rms(buf) > 0.01 ? detectPitch(buf, ctx.sampleRate) : null
      const ok = r && r.clarity > 0.88 && r.freq > 60 && r.freq < 1400
      const detected = ok ? freqToMidi(r.freq) : null
      const fresh = stable(detected?.midi ?? null)
      set({ detected, level: Math.min(1, level * 4) })
      if (fresh !== null) emitNote(fresh)
    }, 10)

    set({ status: 'on' })
    cleanup = () => {
      clearInterval(timer)
      source.disconnect()
      stream.getTracks().forEach((t) => t.stop())
    }
  } catch (e) {
    set({ status: 'error', error: e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : e instanceof DOMException && e.name === 'NotFoundError' ? 'noDevice' : 'other' })
  }
}

import { getTone } from '../audio/instruments'
import { createOnsetDetector, detectPitch, freqToMidi, rms } from './pitch'

export type LiveSource = 'none' | 'midi' | 'mic'

export interface LiveState {
  source: LiveSource
  status: 'idle' | 'connecting' | 'on' | 'error' | 'unsupported'
  /** Mã lỗi để giao diện dịch: 'denied' (không được cấp quyền), 'noDevice', 'other'. */
  error?: 'denied' | 'noDevice' | 'other'
  /** Tên thiết bị MIDI đang nghe. */
  devices: string[]
  /** MIDI: các phím đang giữ. */
  held: number[]
  /** Micro: nốt đang nghe thấy (midi) và độ lệch cent, null khi im lặng / không rõ. */
  detected: { midi: number; cents: number } | null
  /** Micro: âm lượng 0–1. */
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

/** Nghe từng nốt mới được chơi trên đàn thật (MIDI: phím được nhấn; micro: nốt mới ổn định). */
export function onLiveNote(l: (midi: number) => void): () => void {
  noteListeners.add(l)
  return () => noteListeners.delete(l)
}

/** Nghe các tiếng gảy / quạt (micro), thời điểm tính theo đồng hồ AudioContext của Tone.js. */
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

/** Nhận một tin nhắn MIDI thô (tách riêng để kiểm thử). */
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

/** Theo dõi nốt ổn định từ micro: cùng một nốt rõ ràng trong vài khung liên tiếp mới tính là một nốt mới. */
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
    // Dùng chung AudioContext với Tone.js để thời điểm onset so được với nhạc nền.
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
      // Khung ngắn (512 mẫu) cho onset — độ phân giải thời gian tốt hơn.
      analyser.getFloatTimeDomainData(buf)
      small.set(buf.subarray(buf.length - small.length))
      const level = rms(small)
      const now = ctx.currentTime - small.length / ctx.sampleRate / 2
      if (onset(level, now)) onsetListeners.forEach((l) => l(now))

      // Cao độ: mỗi khung thứ 4 (~40 ms), dùng cả khung dài.
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

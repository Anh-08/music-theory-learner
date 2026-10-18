import { useSyncExternalStore } from 'react'
import type * as ToneNs from 'tone'
import { guitarVoicing, type ChordShape, type ProgressionChord } from '../theory'
import { getTone, getVoice } from './instruments'
import { rhythmBarEvents } from './jamEvents'
import type { Rhythm } from './rhythms'
import { claimTransport, ownsTransport, releaseTransport } from './transportOwner'

type Tone = typeof ToneNs

/** Một hợp âm trên băng chạy: hợp âm, thế bấm, số phách giữ. */
export interface ReflexSlot {
  chord: ProgressionChord
  shape?: ChordShape
  beats: number
  /** Hợp âm đầu một câu (dùng để tăng tempo sau mỗi câu). */
  phraseStart: boolean
}

export interface ReflexOptions {
  ownerId: string
  tempo: number
  /** Lấy hợp âm kế tiếp (chuỗi vô hạn). */
  next: () => ReflexSlot
  /** Số phách mỗi ô nhịp (phách mạnh của metronome). */
  beatsPerBar: number
  /** Chế độ "một lượt điệu": mỗi hợp âm là một ô nhịp của điệu này (dùng cho vạch chạy và tiếng mẫu). */
  rhythm?: Rhythm
  /** Phát tiếng hợp âm mẫu (mặc định chỉ có metronome). */
  sound: boolean
  /** Tăng 4 bpm sau mỗi câu, tới tempo này. */
  rampTo?: number
  /** Số hợp âm sắp tới được xem trước. */
  preview?: number
}

export interface ReflexState {
  ownerId: string | null
  /** Hợp âm đang chơi ở đầu, sau đó là các hợp âm sắp tới. */
  queue: ReflexSlot[]
  /** Phách trong hợp âm hiện tại (0…), -1 khi chưa bắt đầu. */
  beat: number
  /** Số phách đếm ngược còn lại trước khi vào hợp âm đầu (0 = đang chơi). */
  countIn: number
  /** Bước của điệu đang chơi (chế độ một lượt điệu). */
  step: number
  tempo: number
}

let state: ReflexState = { ownerId: null, queue: [], beat: -1, countIn: 0, step: -1, tempo: 0 }
const listeners = new Set<() => void>()

export const reflexStore = {
  get: () => state,
  set(next: Partial<ReflexState>) {
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export function useReflexState(): ReflexState {
  return useSyncExternalStore(reflexStore.subscribe, reflexStore.get)
}

interface Kit {
  click: ToneNs.Synth
  chop: ToneNs.NoiseSynth
}

let kit: Kit | null = null

function createKit(T: Tone): Kit {
  const click = new T.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 } }).toDestination()
  click.volume.value = -10
  const chopFilter = new T.Filter(1400, 'bandpass').toDestination()
  const chop = new T.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 } }).connect(chopFilter)
  chop.volume.value = -4
  return { click, chop }
}

let repeatId: number | null = null
let sound = false

function release() {
  if (repeatId !== null) void getTone().then((T) => repeatId !== null && T.getTransport().clear(repeatId))
  repeatId = null
  reflexStore.set({ ownerId: null, queue: [], beat: -1, countIn: 0, step: -1 })
}

/** Gọi `fn` đúng lúc `time` (giờ AudioContext) bằng hẹn giờ — Draw dừng khi tab bị ẩn. */
function at(T: Tone, time: number, fn: () => void) {
  setTimeout(fn, Math.max(0, (time - T.now()) * 1000))
}

/** Bắt đầu băng chạy hợp âm: đếm vào một ô nhịp, rồi mỗi phách một tiếng metronome; hợp âm đổi sau đủ số phách. */
export async function startReflex(opts: ReflexOptions): Promise<void> {
  const T = await getTone()
  kit ??= createKit(T)
  const voice = await getVoice('guitar')
  const k = kit

  claimTransport(release)
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  transport.position = 0
  transport.bpm.value = opts.tempo
  sound = opts.sound

  const preview = opts.preview ?? 2
  const queue: ReflexSlot[] = Array.from({ length: preview + 1 }, opts.next)
  let countLeft = opts.beatsPerBar
  let beatInSlot = -1
  let totalBeats = 0
  let slots = 0
  const secondsPerBeat = () => 60 / transport.bpm.value

  const id = transport.scheduleRepeat((time) => {
    if (repeatId !== id) return
    if (countLeft > 0) {
      k.click.triggerAttackRelease(countLeft === opts.beatsPerBar ? 'C6' : 'G5', 0.03, time)
      const n = countLeft
      at(T, time, () => repeatId === id && reflexStore.set({ countIn: n }))
      countLeft--
      return
    }
    if (beatInSlot === -1 || beatInSlot >= queue[0].beats) {
      if (beatInSlot !== -1) {
        queue.shift()
        queue.push(opts.next())
      }
      beatInSlot = 0
      if (slots++ > 0 && queue[0].phraseStart && opts.rampTo && transport.bpm.value < opts.rampTo) {
        const bpm = Math.min(opts.rampTo, Math.round(transport.bpm.value) + 4)
        transport.bpm.setValueAtTime(bpm, time)
        at(T, time, () => repeatId === id && reflexStore.set({ tempo: bpm }))
      }
    }
    const slot = queue[0]
    const beat = beatInSlot
    k.click.triggerAttackRelease(totalBeats % opts.beatsPerBar === 0 ? 'C6' : 'G5', 0.03, time, totalBeats % opts.beatsPerBar === 0 ? 1 : 0.6)

    const frets = slot.shape?.frets
    if (opts.rhythm) {
      const spb = secondsPerBeat()
      for (const ev of rhythmBarEvents(slot.chord, opts.rhythm, 0, frets)) {
        if (Math.floor(ev.beat + 1e-6) !== beat) continue
        const t = time + (ev.beat - beat) * spb
        if (ev.kind === 'pos') at(T, t, () => repeatId === id && reflexStore.set({ step: ev.step }))
        else if (sound && ev.kind === 'strum') ev.midis.forEach((m, i) => voice.play([m], t + i * ev.spread, spb * ev.beats * 0.95, ev.velocity))
        else if (sound && ev.kind === 'mute') {
          voice.releaseAll(t)
          k.chop.triggerAttackRelease('32n', t)
        }
      }
    } else if (sound) {
      const midis = guitarVoicing(slot.chord, frets).stringMidis.filter((m): m is number => m !== null)
      midis.forEach((m, i) => voice.play([m], time + i * 0.012, secondsPerBeat() * 0.95, beat === 0 ? 0.9 : 0.6))
    }

    const snapshot = [...queue]
    at(T, time, () => repeatId === id && reflexStore.set({ queue: snapshot, beat, countIn: 0 }))
    beatInSlot++
    totalBeats++
  }, '4n', 0)
  repeatId = id

  reflexStore.set({ ownerId: opts.ownerId, queue: [...queue], beat: -1, countIn: opts.beatsPerBar, step: -1, tempo: opts.tempo })
  transport.start('+0.1')
}

/** Đổi tempo / bật tắt tiếng hợp âm mẫu mà không dừng. */
export async function updateReflex(next: { tempo?: number; sound?: boolean }): Promise<void> {
  if (next.sound !== undefined) sound = next.sound
  if (next.tempo !== undefined && repeatId !== null) {
    const T = await getTone()
    T.getTransport().bpm.rampTo(next.tempo, 0.1)
    reflexStore.set({ tempo: next.tempo })
  }
}

/** Dừng. Có `ownerId` thì chỉ dừng nếu đúng trình phát đó đang phát. */
export async function stopReflex(ownerId?: string): Promise<void> {
  if (!ownsTransport(release)) return
  if (ownerId !== undefined && reflexStore.get().ownerId !== ownerId) return
  const T = await getTone()
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  releaseTransport(release)
  release()
}

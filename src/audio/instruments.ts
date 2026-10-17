import type * as ToneNs from 'tone'

export type InstrumentId = 'piano' | 'guitar'

export interface Voice {
  /** Phát các nốt tại `time` (giờ AudioContext) trong `duration` giây. */
  play(midis: number[], time: number, duration: number): void
  releaseAll(): void
}

type Tone = typeof ToneNs

// Sample Salamander Grand Piano (CC-BY 3.0) do Tone.js lưu trữ; nạp lúc chạy, không đóng gói vào repo.
const SALAMANDER_URL = 'https://tonejs.github.io/audio/salamander/'

function salamanderUrls(): Record<string, string> {
  const urls: Record<string, string> = {}
  for (let oct = 1; oct <= 7; oct++) {
    for (const [note, file] of [['C', 'C'], ['D#', 'Ds'], ['F#', 'Fs'], ['A', 'A']]) {
      urls[`${note}${oct}`] = `${file}${oct}.mp3`
    }
  }
  return urls
}

async function createPiano(T: Tone): Promise<Voice> {
  try {
    const sampler = await new Promise<ToneNs.Sampler>((resolve, reject) => {
      const s: ToneNs.Sampler = new T.Sampler({
        urls: salamanderUrls(),
        baseUrl: SALAMANDER_URL,
        release: 1,
        onload: () => resolve(s),
        onerror: reject,
      }).toDestination()
    })
    return {
      play: (midis, time, duration) => sampler.triggerAttackRelease(midis.map(toFreq(T)), duration, time),
      releaseAll: () => sampler.releaseAll(),
    }
  } catch {
    // Không tải được sample (mất mạng…): dùng synth thay thế để vẫn nghe được.
    const synth = new T.PolySynth(T.Synth, { envelope: { attack: 0.005, decay: 0.3, sustain: 0.3, release: 1 } }).toDestination()
    synth.volume.value = -8
    return {
      play: (midis, time, duration) => synth.triggerAttackRelease(midis.map(toFreq(T)), duration, time),
      releaseAll: () => synth.releaseAll(),
    }
  }
}

/** Guitar mô phỏng bằng thuật toán Karplus-Strong (PluckSynth) — không cần sample. */
function createGuitar(T: Tone): Voice {
  const POLYPHONY = 8
  const filter = new T.Filter(3500, 'lowpass').toDestination()
  const voices = Array.from({ length: POLYPHONY }, () => {
    const p = new T.PluckSynth({ attackNoise: 1.2, dampening: 3800, resonance: 0.97, release: 0.8 }).connect(filter)
    p.volume.value = 2
    return p
  })
  let next = 0
  return {
    play: (midis, time, duration) => {
      for (const m of midis) {
        const v = voices[next]
        next = (next + 1) % POLYPHONY
        v.triggerAttack(toFreq(T)(m), time)
        v.triggerRelease(time + duration)
      }
    },
    releaseAll: () => voices.forEach((v) => v.triggerRelease()),
  }
}

function toFreq(T: Tone) {
  return (m: number) => T.Frequency(m, 'midi').toFrequency()
}

let tonePromise: Promise<Tone> | null = null
const voices = new Map<InstrumentId, Promise<Voice>>()

/** Nạp Tone.js khi cần (giữ bundle ban đầu nhỏ) và mở AudioContext — phải gọi sau một thao tác của người dùng. */
export async function getTone(): Promise<Tone> {
  tonePromise ??= import('tone')
  const T = await tonePromise
  await T.start()
  return T
}

/** Các giọng đã được tạo (không tạo mới, không mở AudioContext). */
export function existingVoices(): Promise<Voice>[] {
  return [...voices.values()]
}

export function isToneLoaded(): boolean {
  return tonePromise !== null
}

export async function getVoice(id: InstrumentId): Promise<Voice> {
  let v = voices.get(id)
  if (!v) {
    v = getTone().then((T) => (id === 'piano' ? createPiano(T) : createGuitar(T)))
    voices.set(id, v)
  }
  return v
}

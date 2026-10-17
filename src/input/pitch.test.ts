import { describe, expect, it } from 'vitest'
import { createOnsetDetector, detectPitch, freqToMidi, rms } from './pitch'

const SR = 44100

function tone(freq: number, n = 2048, harmonics = [1, 0.5, 0.3]): Float32Array {
  const b = new Float32Array(n)
  for (let i = 0; i < n; i++) b[i] = harmonics.reduce((s, amp, h) => s + amp * Math.sin((2 * Math.PI * freq * (h + 1) * i) / SR), 0)
  return b
}

describe('detectPitch', () => {
  it('nhận đúng cao độ nốt đơn, kể cả có hài âm', () => {
    for (const [freq, midi] of [
      [82.41, 40], // E2 — dây 6 guitar
      [110, 45], // A2
      [196, 55], // G3
      [329.63, 64], // E4
      [440, 69], // A4
    ] as const) {
      const r = detectPitch(tone(freq), SR)!
      expect(r.clarity, String(freq)).toBeGreaterThan(0.85)
      expect(freqToMidi(r.freq).midi, String(freq)).toBe(midi)
    }
  })

  it('tín hiệu nhiễu / im lặng thì không rõ ràng', () => {
    expect(detectPitch(new Float32Array(2048), SR)).toBeNull()
    let seed = 1
    const noise = new Float32Array(2048).map(() => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1)
    const r = detectPitch(noise, SR)
    expect(r === null || r.clarity < 0.6).toBe(true)
  })
})

describe('tiện ích', () => {
  it('đổi tần số sang midi và cent', () => {
    expect(freqToMidi(440)).toEqual({ midi: 69, cents: 0 })
    expect(freqToMidi(446).midi).toBe(69)
    expect(freqToMidi(446).cents).toBeGreaterThan(20)
    expect(rms(new Float32Array([1, -1, 1, -1]))).toBe(1)
  })

  it('dò onset khi âm lượng tăng vọt, có khoảng cách tối thiểu', () => {
    const d = createOnsetDetector()
    const levels = [0.001, 0.001, 0.2, 0.18, 0.15, 0.01, 0.005, 0.3, 0.3]
    const hits = levels.map((l, i) => d(l, i * 0.05))
    expect(hits).toEqual([false, false, true, false, false, false, false, true, false])
  })
})

import { semitones } from './intervals'
import { type Chroma } from './notes'

/** Midi nhỏ nhất ≥ `low` có chroma cho trước. */
export function rootMidiAtOrAbove(c: Chroma, low: number): number {
  return low + ((((c - low) % 12) + 12) % 12)
}

/** Chồng các quãng lên một nốt gốc: ["1P","3M","5P"] trên 60 → [60, 64, 67]. */
export function stackIntervals(rootMidi: number, intervals: string[]): number[] {
  return intervals.map((i) => rootMidi + semitones(i))
}

/** Scale đi lên một quãng tám, kết thúc bằng chủ âm ở quãng tám trên. */
export function scaleRun(rootMidi: number, intervals: string[]): number[] {
  return [...stackIntervals(rootMidi, intervals), rootMidi + 12]
}

/** Khoảng cách giữa các bậc liên tiếp (tính cả bậc cuối về chủ âm), theo nửa cung. */
export function stepPattern(intervals: string[]): number[] {
  const s = [...intervals.map(semitones), 12]
  return s.slice(1).map((v, i) => v - s[i])
}

/** Hiển thị theo cung: 2 → "1", 1 → "½", 3 → "1½". */
export function stepLabel(semis: number): string {
  const whole = Math.floor(semis / 2)
  const half = semis % 2 === 1 ? '½' : ''
  return whole === 0 ? half : `${whole}${half}`
}

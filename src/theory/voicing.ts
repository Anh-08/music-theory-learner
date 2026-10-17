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

/**
 * Chọn cách xếp hợp âm (các chroma) trong khoảng [low, high] sao cho gần cách xếp trước nhất
 * — nốt di chuyển ít nhất (dẫn giọng). Không có cách xếp trước thì chọn cách xếp gần giữa khoảng nhất.
 */
export function voiceLead(chromas: number[], prev: number[] | null, low: number, high: number): number[] {
  const n = chromas.length
  const candidates: number[][] = []
  for (let rot = 0; rot < n; rot++) {
    const order = [...chromas.slice(rot), ...chromas.slice(0, rot)]
    for (let start = low; start < low + 12; start++) {
      if (start % 12 !== order[0]) continue
      const v = [start]
      for (const c of order.slice(1)) v.push(rootMidiAtOrAbove(c, v[v.length - 1] + 1))
      if (v[v.length - 1] <= high) candidates.push(v)
      const up = v.map((m) => m + 12)
      if (up[up.length - 1] <= high) candidates.push(up)
    }
  }
  if (candidates.length === 0) return chromas.map((c, i) => rootMidiAtOrAbove(c, low + i * 4))
  const center = (low + high) / 2
  const cost = (v: number[]) => {
    if (!prev) return Math.abs(v.reduce((a, b) => a + b, 0) / v.length - center)
    const sortedPrev = [...prev].sort((a, b) => a - b)
    const sorted = [...v].sort((a, b) => a - b)
    // So từng giọng theo thứ tự cao độ; số nốt khác nhau thì so với nốt gần nhất.
    return sorted.reduce((sum, m, i) => sum + Math.abs(m - (sortedPrev[i] ?? sortedPrev[sortedPrev.length - 1])), 0)
  }
  return candidates.reduce((best, v) => (cost(v) < cost(best) ? v : best))
}

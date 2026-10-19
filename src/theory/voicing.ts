import { semitones } from './intervals'
import { type Chroma } from './notes'

/** Smallest midi ≥ `low` with the given chroma. */
export function rootMidiAtOrAbove(c: Chroma, low: number): number {
  return low + ((((c - low) % 12) + 12) % 12)
}

/** Stacks intervals on a root: ["1P","3M","5P"] on 60 → [60, 64, 67]. */
export function stackIntervals(rootMidi: number, intervals: string[]): number[] {
  return intervals.map((i) => rootMidi + semitones(i))
}

/** Scale ascending one octave, ending on the tonic an octave up. */
export function scaleRun(rootMidi: number, intervals: string[]): number[] {
  return [...stackIntervals(rootMidi, intervals), rootMidi + 12]
}

/** Steps between consecutive degrees (including the last back to the tonic), in semitones. */
export function stepPattern(intervals: string[]): number[] {
  const s = [...intervals.map(semitones), 12]
  return s.slice(1).map((v, i) => v - s[i])
}

/** Shown in whole tones: 2 → "1", 1 → "½", 3 → "1½". */
export function stepLabel(semis: number): string {
  const whole = Math.floor(semis / 2)
  const half = semis % 2 === 1 ? '½' : ''
  return whole === 0 ? half : `${whole}${half}`
}

/**
 * Picks a voicing of the chord (chromas) within [low, high] closest to the previous voicing
 * — the least note movement (voice leading). Without a previous voicing, pick the one closest to the middle of the range.
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
    // Compare voices in pitch order; with different note counts, compare against the nearest note.
    return sorted.reduce((sum, m, i) => sum + Math.abs(m - (sortedPrev[i] ?? sortedPrev[sortedPrev.length - 1])), 0)
  }
  return candidates.reduce((best, v) => (cost(v) < cost(best) ? v : best))
}

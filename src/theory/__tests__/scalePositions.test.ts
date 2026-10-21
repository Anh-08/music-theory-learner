import { describe, expect, it } from 'vitest'
import { chroma, scaleFromRoot, scalePositions, tuning } from '..'

const STANDARD = tuning('standard')
const positionsOf = (root: string, scale: string, frets = 15) => scalePositions(STANDARD, scaleFromRoot(root, scale).notes.map(chroma), frets)
const fretsByString = (p: ReturnType<typeof positionsOf>[number]) =>
  [6, 5, 4, 3, 2, 1].map((s) => p.notes.filter((n) => n.string === s).map((n) => n.fret))

describe('scalePositions', () => {
  it('C major starts with the open position and moves up the neck', () => {
    const ps = positionsOf('C', 'major')
    expect(ps.map((p) => [p.lo, p.hi])).toEqual([
      [0, 3],
      [3, 7],
      [5, 9],
      [7, 10],
      [10, 14],
      [12, 15],
    ])
    expect(fretsByString(ps[0])).toEqual([[0, 1, 3], [0, 2, 3], [0, 2, 3], [0, 2], [0, 1, 3], [0, 1, 3]])
  })

  it('each position plays every scale note once, low to high, from string 6 to string 1', () => {
    for (const p of positionsOf('Bb', 'major')) {
      const midis = p.notes.map((n) => n.midi)
      expect(midis).toEqual([...midis].sort((a, b) => a - b))
      expect(new Set(midis).size).toBe(midis.length)
      expect(p.notes[0].string).toBe(6)
      expect(p.notes[p.notes.length - 1].string).toBe(1)
      expect(p.hi - p.lo).toBeLessThanOrEqual(4)
    }
  })

  it('stays within the neck', () => {
    for (const p of positionsOf('E', 'major', 12)) expect(p.hi).toBeLessThanOrEqual(12)
  })
})

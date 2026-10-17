import { describe, expect, it } from 'vitest'
import { fretX, fretboardPositions, tuning } from '../fretboard'

describe('fretboard', () => {
  const standard = tuning('standard')
  const positions = fretboardPositions(standard, 12)
  const at = (string: number, fret: number) => positions.find((p) => p.string === string && p.fret === fret)!

  it('có đủ vị trí cho 6 dây × 13 phím (tính dây buông)', () => {
    expect(positions).toHaveLength(6 * 13)
  })

  it('tính đúng nốt trên cần đàn', () => {
    expect(at(6, 0).midi).toBe(40) // E2
    expect(at(6, 5).chroma).toBe(9) // A
    expect(at(5, 3).chroma).toBe(0) // C
    expect(at(1, 12).midi).toBe(76) // E5
    expect(at(2, 1).chroma).toBe(0) // C
  })

  it('dây 6 phím 5 cùng cao độ với dây 5 buông', () => {
    expect(at(6, 5).midi).toBe(at(5, 0).midi)
    expect(at(3, 4).midi).toBe(at(2, 0).midi)
  })

  it('đổi tuning thì đổi nốt', () => {
    const dropD = fretboardPositions(tuning('drop-d'), 5)
    expect(dropD.find((p) => p.string === 6 && p.fret === 0)!.chroma).toBe(2)
  })

  it('vị trí phím tăng dần và khoảng cách thu hẹp dần', () => {
    expect(fretX(0, 12)).toBe(0)
    expect(fretX(12, 12)).toBeCloseTo(1)
    const w1 = fretX(1, 12) - fretX(0, 12)
    const w12 = fretX(12, 12) - fretX(11, 12)
    expect(w12).toBeLessThan(w1)
  })
})

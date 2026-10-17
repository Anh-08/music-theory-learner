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

describe('thế bấm và vị trí', async () => {
  const { parseShape, parsePositions, positionMidi } = await import('../fretboard')

  it('đọc thế bấm hợp âm', () => {
    expect(parseShape('x32010')).toEqual([
      { string: 5, fret: 3 },
      { string: 4, fret: 2 },
      { string: 3, fret: 0 },
      { string: 2, fret: 1 },
      { string: 1, fret: 0 },
    ])
    expect(parseShape('8,10,10,9,8,8')[1]).toEqual({ string: 5, fret: 10 })
    expect(() => parseShape('x3201')).toThrow()
  })

  it('đọc danh sách vị trí', () => {
    expect(parsePositions(' 6:3  5:2 ')).toEqual([
      { string: 6, fret: 3 },
      { string: 5, fret: 2 },
    ])
    expect(() => parsePositions('7:a')).toThrow()
  })

  it('tính cao độ của vị trí', () => {
    expect(positionMidi(tuning('standard'), { string: 5, fret: 3 })).toBe(48)
    expect(positionMidi(tuning('standard'), { string: 1, fret: 0 })).toBe(64)
  })
})

describe('nhạc cụ phím đàn khác', () => {
  it('bass 4 dây và ukulele (dây G cao)', () => {
    const bass = fretboardPositions(tuning('bass4'), 5)
    expect(bass).toHaveLength(4 * 6)
    expect(bass.find((p) => p.string === 4 && p.fret === 0)!.midi).toBe(28) // E1
    const uke = fretboardPositions(tuning('ukulele'), 3)
    expect(uke.find((p) => p.string === 4 && p.fret === 0)!.midi).toBe(67) // G4 — dây 4 cao hơn dây 3
    expect(uke.find((p) => p.string === 1 && p.fret === 3)!.chroma).toBe(0) // A + 3 = C
  })
})

describe('positionForMidi', async () => {
  const { positionForMidi } = await import('../fretboard')
  it('chọn phím thấp nhất, giới hạn theo dây, hoặc cùng tên nốt khi lệch quãng tám', () => {
    expect(positionForMidi(tuning('standard'), 45, 12)).toMatchObject({ string: 5, fret: 0 })
    expect(positionForMidi(tuning('standard'), 45, 12, 6)).toMatchObject({ string: 6, fret: 5 })
    expect(positionForMidi(tuning('standard'), 26, 12, 5)).toMatchObject({ string: 5, fret: 5 }) // D1 ngoài tầm → D trên dây 5
  })
})

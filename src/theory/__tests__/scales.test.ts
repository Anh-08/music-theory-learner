import { describe, expect, it } from 'vitest'
import { SCALE_TYPES, getScale } from '../scales'

describe('scales', () => {
  it('dựng scale trưởng', () => {
    const s = getScale(0, 'major')
    expect(s.notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    expect(s.labels).toEqual(['1', '2', '3', '4', '5', '6', '7'])
  })

  it('viết nốt đúng theo giọng', () => {
    expect(getScale(5, 'major').notes).toContain('Bb')
    expect(getScale(1, 'major').root).toBe('Db')
    expect(getScale(1, 'aeolian').root).toBe('C#')
  })

  it('dựng ngũ cung thứ và blues', () => {
    expect(getScale(9, 'minor pentatonic').notes).toEqual(['A', 'C', 'D', 'E', 'G'])
    expect(getScale(9, 'minor pentatonic').labels).toEqual(['1', '♭3', '4', '5', '♭7'])
    expect(getScale(9, 'blues').labels).toEqual(['1', '♭3', '4', '♭5', '5', '♭7'])
  })

  it('dựng được mọi scale trong danh sách với mọi chủ âm', () => {
    for (const t of SCALE_TYPES) {
      for (let c = 0; c < 12; c++) {
        const s = getScale(c, t.id)
        expect(s.notes.length, `${c} ${t.id}`).toBeGreaterThanOrEqual(5)
        expect(s.labels[0]).toBe('1')
      }
    }
  })

  it('báo lỗi với scale không có trong danh sách', () => {
    expect(() => getScale(0, 'bebop')).toThrow()
  })
})

describe('scaleFromRoot', () => {
  it('giữ nguyên cách viết chủ âm', async () => {
    const { scaleFromRoot } = await import('../scales')
    expect(scaleFromRoot('C#', 'major').notes).toEqual(['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'])
    expect(() => scaleFromRoot('H', 'major')).toThrow()
  })
})

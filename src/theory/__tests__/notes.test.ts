import { describe, expect, it } from 'vitest'
import { bestRootSpelling, chroma, displayNote, midi, noteFromMidi, rootLabel, spellingsOf } from '../notes'
import { Scale } from 'tonal'

describe('notes', () => {
  it('tính chroma và midi', () => {
    expect(chroma('C')).toBe(0)
    expect(chroma('Db')).toBe(1)
    expect(chroma('B#')).toBe(0)
    expect(midi('E2')).toBe(40)
    expect(midi('A4')).toBe(69)
  })

  it('báo lỗi với nốt không hợp lệ', () => {
    expect(() => chroma('H')).toThrow()
  })

  it('đổi midi sang tên nốt theo thăng hoặc giáng', () => {
    expect(noteFromMidi(61)).toBe('C#4')
    expect(noteFromMidi(61, true)).toBe('Db4')
  })

  it('hiển thị ký hiệu ♯ ♭', () => {
    expect(displayNote('Bb')).toBe('B♭')
    expect(displayNote('F#')).toBe('F♯')
    expect(displayNote('Bbb')).toBe('B♭♭')
    expect(rootLabel(1)).toBe('C♯ / D♭')
    expect(rootLabel(0)).toBe('C')
  })

  it('liệt kê các cách viết', () => {
    expect(spellingsOf(0)).toEqual(['C'])
    expect(spellingsOf(10)).toEqual(['A#', 'Bb'])
  })

  it('chọn cách viết chủ âm ít dấu hóa nhất', () => {
    const major = (r: string) => Scale.get(`${r} major`).notes
    const minor = (r: string) => Scale.get(`${r} minor`).notes
    expect(bestRootSpelling(1, major)).toBe('Db')
    expect(bestRootSpelling(10, major)).toBe('Bb')
    expect(bestRootSpelling(1, minor)).toBe('C#')
    expect(bestRootSpelling(8, minor)).toBe('G#')
  })
})

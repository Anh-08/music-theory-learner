import { describe, expect, it } from 'vitest'
import { intervalBetween, intervalLabel, intervalName, semitones } from '../intervals'

describe('intervals', () => {
  it('tạo nhãn quãng ngắn', () => {
    expect(intervalLabel('1P')).toBe('1')
    expect(intervalLabel('3M')).toBe('3')
    expect(intervalLabel('3m')).toBe('♭3')
    expect(intervalLabel('5d')).toBe('♭5')
    expect(intervalLabel('4A')).toBe('♯4')
    expect(intervalLabel('7d')).toBe('♭♭7')
    expect(intervalLabel('9M')).toBe('9')
  })

  it('tính quãng giữa hai nốt', () => {
    expect(intervalBetween('C', 'Eb')).toBe('3m')
    expect(intervalBetween('A', 'E')).toBe('5P')
    expect(semitones('5P')).toBe(7)
  })

  it('đặt tên quãng tiếng Việt kèm tiếng Anh', () => {
    expect(intervalName('3m')).toBe('Quãng 3 thứ (minor 3rd)')
    expect(intervalName('5P')).toBe('Quãng 5 đúng (perfect 5th)')
    expect(intervalName('1P')).toBe('Đồng âm (unison)')
    expect(intervalName('8P')).toBe('Quãng 8 đúng (octave)')
  })
})

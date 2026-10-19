import { describe, expect, it } from 'vitest'
import { intervalBetween, intervalLabel, intervalName, semitones } from '../intervals'

describe('intervals', () => {
  it('builds short interval labels', () => {
    expect(intervalLabel('1P')).toBe('1')
    expect(intervalLabel('3M')).toBe('3')
    expect(intervalLabel('3m')).toBe('♭3')
    expect(intervalLabel('5d')).toBe('♭5')
    expect(intervalLabel('4A')).toBe('♯4')
    expect(intervalLabel('7d')).toBe('♭♭7')
    expect(intervalLabel('9M')).toBe('9')
  })

  it('computes the interval between two notes', () => {
    expect(intervalBetween('C', 'Eb')).toBe('3m')
    expect(intervalBetween('A', 'E')).toBe('5P')
    expect(semitones('5P')).toBe(7)
  })

  it('names intervals in Vietnamese with the English name', () => {
    expect(intervalName('3m')).toBe('Quãng 3 thứ (minor 3rd)')
    expect(intervalName('5P')).toBe('Quãng 5 đúng (perfect 5th)')
    expect(intervalName('1P')).toBe('Đồng âm (unison)')
    expect(intervalName('8P')).toBe('Quãng 8 đúng (octave)')
  })
})

describe('English interval names', async () => {
  const { intervalName, intervalShortName } = await import('../intervals')
  it('names by language', () => {
    expect(intervalName('3m', 'en')).toBe('Minor 3rd')
    expect(intervalName('8P', 'en')).toBe('Octave')
    expect(intervalShortName('4A', 'vi')).toBe('Quãng 4 tăng')
    expect(intervalShortName('5P', 'en')).toBe('Perfect 5th')
  })
})

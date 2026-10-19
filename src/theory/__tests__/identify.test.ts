import { describe, expect, it } from 'vitest'
import { identifyChord } from '../identify'

describe('identifyChord', () => {
  it('recognises triads and seventh chords', () => {
    expect(identifyChord([60, 64, 67])[0]).toMatchObject({ name: 'C', formula: '1 3 5' })
    expect(identifyChord([57, 60, 64])[0].name).toBe('Am')
    expect(identifyChord([55, 59, 62, 65])[0].name).toBe('G7')
    expect(identifyChord([59, 62, 65, 69])[0].name).toBe('Bm7♭5')
  })

  it('real guitar shape (open C x32010)', () => {
    expect(identifyChord([48, 52, 55, 60, 64])[0].name).toBe('C')
  })

  it('a bass that is not the root gives a slash chord', () => {
    expect(identifyChord([52, 55, 60])[0].name).toBe('C/E')
  })

  it('fewer than 3 distinct note names: no guess', () => {
    expect(identifyChord([60, 72, 64])).toEqual([])
  })
})

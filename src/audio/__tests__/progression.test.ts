import { describe, expect, it } from 'vitest'
import { parseChordSymbol, progressionEvents } from '../progression'

describe('progression', () => {
  it('parses chord symbols', () => {
    expect(parseChordSymbol('F#m')).toEqual({ tonic: 'F#', intervals: ['1P', '3m', '5P'] })
    expect(parseChordSymbol('Bdim').intervals).toEqual(['1P', '3m', '5d'])
    expect(() => parseChordSymbol('Hm')).toThrow()
  })

  it('chains chords one after another', () => {
    const e = progressionEvents(['C', 'Am'], 48, 1, 0)
    expect(e).toEqual([
      { midis: [48, 52, 55], at: 0, duration: 1 },
      { midis: [57, 60, 64], at: 1, duration: 1 },
    ])
  })
})

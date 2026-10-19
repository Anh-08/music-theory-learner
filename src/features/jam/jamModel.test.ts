import { describe, expect, it } from 'vitest'
import { parseProgression } from '../../theory'
import { analyze, chordIndexAtBar, chordLabel, jamHighlights, transposeProgression, usesRomanNumerals } from './jamModel'

describe('jamModel', () => {
  it('recognises Roman numerals', () => {
    expect(usesRomanNumerals('ii-V-I')).toBe(true)
    expect(usesRomanNumerals('I V vi IV')).toBe(true)
    expect(usesRomanNumerals('C G Am F')).toBe(false)
    expect(usesRomanNumerals('Bdim Cmaj7')).toBe(false)
  })

  it('analysis: auto-detected key or a manually chosen key', () => {
    expect(analyze('G D Em C', null).key).toEqual({ tonic: 'G', mode: 'major' })
    expect(analyze('ii V I', 'Bb').chords.map((c) => c.symbol)).toEqual(['Cm', 'F', 'Bb'])
    expect(analyze('Am F C G', 'C').romans).toEqual(['vi', 'IV', 'I', 'V'])
  })

  it('finds the chord for a bar', () => {
    const p = parseProgression('C*2 G Am')
    expect([0, 1, 2, 3].map((b) => chordIndexAtBar(p, b))).toEqual([0, 0, 1, 2])
  })

  it('highlights chord notes and scale notes', () => {
    const [am] = parseProgression('Am')
    const h = jamHighlights(am, { root: 'A', typeId: 'minor pentatonic' }, 'interval')
    expect(h.get(9)).toEqual({ label: '1', isRoot: true })
    expect(h.get(0)?.label).toBe('♭3')
    expect(h.get(2)).toEqual({ label: '4', isRoot: false, color: 'neutral' })
    expect(h.get(7)).toEqual({ label: '♭7', isRoot: false, color: 'neutral' })
    expect(h.size).toBe(5)
  })

  it('displays chord names', () => {
    const [a, b] = parseProgression('Bm7b5 G/B')
    expect(chordLabel(a)).toBe('Bm7♭5')
    expect(chordLabel(b)).toBe('G/B')
  })

  it('transposes a progression', () => {
    const C = { tonic: 'C', mode: 'major' as const }
    expect(transposeProgression('C G Am F', C, { tonic: 'Eb', mode: 'major' })).toBe('Eb Bb Cm Ab')
    expect(transposeProgression('C - G/B | Am7*2 % F6/9', C, { tonic: 'D', mode: 'major' })).toBe('D - A/C# | Bm7*2 % G6/9')
    expect(transposeProgression('A7*4 D7*2', { tonic: 'A', mode: 'major' }, { tonic: 'Gb', mode: 'major' })).toBe('Gb7*4 Cb7*2')
    expect(transposeProgression('Am G F G', { tonic: 'A', mode: 'minor' }, { tonic: 'D#', mode: 'minor' })).toBe('D#m C# B C#')
    expect(transposeProgression('C G Am F', C, { tonic: 'A', mode: 'minor' })).toBe('C G Am F')
    expect(transposeProgression('I V vi IV', C, { tonic: 'E', mode: 'major' })).toBe('I V vi IV')
  })
})

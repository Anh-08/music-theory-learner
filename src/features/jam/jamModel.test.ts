import { describe, expect, it } from 'vitest'
import { GROOVES, groove } from '../../audio/grooves'
import { RHYTHMS } from '../../audio/rhythms'
import { parseProgression } from '../../theory'
import { GROOVE_RHYTHM, analyze, chordIndexAtBar, compingLink, chordLabel, jamHighlights, transposeProgression, usesRomanNumerals } from './jamModel'

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

  it('comping link: resolved chords, a rhythm that fits the groove, the same tempo', () => {
    const params = (href: string) => Object.fromEntries(new URLSearchParams(href.split('?')[1]))
    const { chords } = analyze('ii V I*2', 'Bb')
    expect(params(compingLink(chords, groove('pop'), 'default', 96))).toEqual({ r: 'ballad', p: 'Cm F Bb*2', tempo: '96' })
    expect(params(compingLink(chords, groove('pop'), 'travis', 96)).r).toBe('travis')
    // A comping style with another beat count is ignored, as in the Jam playback.
    expect(params(compingLink(chords, groove('waltz'), 'travis', 120)).r).toBe('valse')
    for (const g of GROOVES) {
      const r = RHYTHMS.find((x) => x.id === GROOVE_RHYTHM[g.id])
      expect(r?.beatsPerBar, g.id).toBe(g.beatsPerBar)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { parseProgression } from '../../theory'
import { analyze, chordIndexAtBar, chordLabel, jamHighlights, usesRomanNumerals } from './jamModel'

describe('jamModel', () => {
  it('nhận ra số La Mã', () => {
    expect(usesRomanNumerals('ii-V-I')).toBe(true)
    expect(usesRomanNumerals('I V vi IV')).toBe(true)
    expect(usesRomanNumerals('C G Am F')).toBe(false)
    expect(usesRomanNumerals('Bdim Cmaj7')).toBe(false)
  })

  it('phân tích: tự đoán giọng hoặc theo giọng chọn tay', () => {
    expect(analyze('G D Em C', null).key).toEqual({ tonic: 'G', mode: 'major' })
    expect(analyze('ii V I', 'Bb').chords.map((c) => c.symbol)).toEqual(['Cm', 'F', 'Bb'])
    expect(analyze('Am F C G', 'C').romans).toEqual(['vi', 'IV', 'I', 'V'])
  })

  it('tìm hợp âm theo ô nhịp', () => {
    const p = parseProgression('C*2 G Am')
    expect([0, 1, 2, 3].map((b) => chordIndexAtBar(p, b))).toEqual([0, 0, 1, 2])
  })

  it('tô nốt hợp âm và nốt scale', () => {
    const [am] = parseProgression('Am')
    const h = jamHighlights(am, { root: 'A', typeId: 'minor pentatonic' }, 'interval')
    expect(h.get(9)).toEqual({ label: '1', isRoot: true })
    expect(h.get(0)?.label).toBe('♭3')
    expect(h.get(2)).toEqual({ label: '4', isRoot: false, color: 'neutral' })
    expect(h.get(7)).toEqual({ label: '♭7', isRoot: false, color: 'neutral' })
    expect(h.size).toBe(5)
  })

  it('hiển thị tên hợp âm', () => {
    const [a, b] = parseProgression('Bm7b5 G/B')
    expect(chordLabel(a)).toBe('Bm7♭5')
    expect(chordLabel(b)).toBe('G/B')
  })
})

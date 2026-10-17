import { describe, expect, it } from 'vitest'
import { chordsPerBar, detectKey, isBluesLike, keyLabel, parseKey, parseProgression, romanNumeral } from '../progression'
import { suggestScales } from '../suggest'

const C = parseKey('C')
const symbols = (text: string, key = C) => parseProgression(text, key).map((c) => c.symbol)

describe('parseProgression', () => {
  it('đọc ký hiệu hợp âm với nhiều kiểu ngăn cách', () => {
    expect(symbols('C G Am F')).toEqual(['C', 'G', 'Am', 'F'])
    expect(symbols('Dm7 - G7 | Cmaj7')).toEqual(['Dm7', 'G7', 'Cmaj7'])
    expect(symbols('F♯m B♭')).toEqual(['F#m', 'Bb'])
  })

  it('đọc số La Mã theo giọng', () => {
    expect(symbols('I-V-vi-IV')).toEqual(['C', 'G', 'Am', 'F'])
    expect(symbols('ii7 V7 Imaj7', parseKey('Bb'))).toEqual(['Cm7', 'F7', 'Bbmaj7'])
    expect(symbols('vii° viiø7 bVII I+', C)).toEqual(['Bdim', 'Bm7b5', 'Bb', 'Caug'])
    expect(symbols('i iv v', parseKey('Am'))).toEqual(['Am', 'Dm', 'Em'])
    // Trong giọng thứ, bậc VI và VII đã là F và G; "bVI" hạ thêm nửa cung.
    expect(symbols('i VI VII V', parseKey('Am'))).toEqual(['Am', 'F', 'G', 'E'])
  })

  it('đọc hợp âm có bass và số ô nhịp', () => {
    const p = parseProgression('C G/B Am*2 %')
    expect(p.map((c) => [c.symbol, c.bars])).toEqual([
      ['C', 1],
      ['G/B', 1],
      ['Am', 3],
    ])
    expect(p[1].bass).toBe('B')
    expect(p[1].notes).toEqual(['G', 'B', 'D'])
    expect(chordsPerBar(p).map((c) => c.symbol)).toEqual(['C', 'G/B', 'Am', 'Am', 'Am'])
  })

  it('báo lỗi dễ hiểu', () => {
    expect(() => parseProgression('')).toThrow('Chưa có hợp âm')
    expect(() => parseProgression('C Hm')).toThrow('Hm')
    expect(() => parseProgression('% C')).toThrow()
    expect(() => parseProgression('C*0')).toThrow()
  })
})

describe('romanNumeral', () => {
  const romans = (text: string, key = C) => parseProgression(text, key).map((c) => romanNumeral(c, key))

  it('ghi số La Mã đúng loại hợp âm', () => {
    expect(romans('C Dm Em F G Am Bdim')).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
    expect(romans('Cmaj7 Dm7 G7 Bm7b5')).toEqual(['Imaj7', 'ii7', 'V7', 'viiø7'])
    expect(romans('Bb Ab Fm')).toEqual(['♭VII', '♭VI', 'iv'])
    expect(romans('C/E G/B')).toEqual(['I/E', 'V/B'])
  })

  it('theo giọng thứ', () => {
    const am = parseKey('Am')
    expect(romans('Am Dm E7 F G', am)).toEqual(['i', 'iv', 'V7', 'VI', 'VII'])
  })
})

describe('detectKey', () => {
  const key = (text: string) => keyLabel(detectKey(parseProgression(text)))

  it('đoán giọng trưởng', () => {
    expect(key('C G Am F')).toBe('C trưởng')
    expect(key('G D Em C')).toBe('G trưởng')
    expect(key('D A Bm G')).toBe('D trưởng')
    expect(key('Dm7 G7 Cmaj7')).toBe('C trưởng')
  })

  it('đoán giọng thứ khi hợp âm chủ là hợp âm thứ', () => {
    expect(key('Am F C G')).toBe('A thứ')
    expect(key('Em C G D Em')).toBe('E thứ')
    expect(key('Am Dm E7 Am')).toBe('A thứ')
  })

  it('nhận ra tiến trình blues', () => {
    const p = parseProgression('A7 D7 A7 E7')
    expect(isBluesLike(p)).toBe(true)
    expect(keyLabel(detectKey(p))).toBe('A trưởng')
  })
})

describe('suggestScales', () => {
  it('giọng trưởng: ngũ cung trưởng trước', () => {
    const s = suggestScales(parseProgression('C G Am F'), C)
    expect(s[0]).toMatchObject({ root: 'C', typeId: 'major pentatonic' })
    expect(s[2]).toMatchObject({ root: 'A', typeId: 'minor pentatonic' })
  })

  it('giọng thứ có V trưởng: gợi ý thứ hòa âm', () => {
    const am = parseKey('Am')
    const s = suggestScales(parseProgression('Am Dm E7 Am', am), am)
    expect(s[0]).toMatchObject({ root: 'A', typeId: 'minor pentatonic' })
    expect(s.map((x) => x.typeId)).toContain('harmonic minor')
  })

  it('blues: ngũ cung thứ của chủ âm', () => {
    const p = parseProgression('E7 A7 E7 B7')
    expect(suggestScales(p, detectKey(p))[0]).toMatchObject({ root: 'E', typeId: 'minor pentatonic' })
  })
})

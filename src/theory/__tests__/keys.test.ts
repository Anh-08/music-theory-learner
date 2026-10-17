import { describe, expect, it } from 'vitest'
import { diatonicChords, keySignature, relatedKeys } from '../keys'
import { parseKey } from '../progression'

describe('diatonicChords', () => {
  it('giọng trưởng: I ii iii IV V vi vii°', () => {
    const c = diatonicChords(parseKey('C'))
    expect(c.map((x) => x.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
    expect(c.map((x) => x.symbol)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'])
    expect(c.map((x) => x.function).join('')).toBe('TSTSDTD')
  })

  it('hợp âm 7 thuận giọng', () => {
    expect(diatonicChords(parseKey('G'), true).map((x) => x.symbol)).toEqual(['Gmaj7', 'Am7', 'Bm7', 'Cmaj7', 'D7', 'Em7', 'F#m7b5'])
    expect(diatonicChords(parseKey('C'), true).map((x) => x.roman)).toEqual(['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'])
  })

  it('giọng thứ tự nhiên', () => {
    const a = diatonicChords(parseKey('Am'))
    expect(a.map((x) => x.roman)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'])
    expect(diatonicChords(parseKey('Bbm')).map((x) => x.symbol)[0]).toBe('Bbm')
  })
})

describe('keySignature và giọng liên quan', () => {
  it('hóa biểu theo thứ tự', () => {
    expect(keySignature(parseKey('E'))).toEqual({ sharps: ['F#', 'C#', 'G#', 'D#'], flats: [] })
    expect(keySignature(parseKey('Eb'))).toEqual({ sharps: [], flats: ['Bb', 'Eb', 'Ab'] })
    expect(keySignature(parseKey('Dm'))).toEqual({ sharps: [], flats: ['Bb'] })
  })

  it('giọng tương ứng và cùng tên', () => {
    expect(relatedKeys(parseKey('G'))).toEqual({ relative: { tonic: 'E', mode: 'minor' }, parallel: { tonic: 'G', mode: 'minor' } })
    expect(relatedKeys(parseKey('Cm')).relative).toEqual({ tonic: 'Eb', mode: 'major' })
  })
})

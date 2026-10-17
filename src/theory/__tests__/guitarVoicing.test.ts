import { describe, expect, it } from 'vitest'
import { chordFrets, guitarVoicing, stringMidi } from '../guitarVoicing'
import { parseProgression } from '../progression'
import { chroma } from '../notes'

const chord = (s: string) => parseProgression(s)[0]
const pc = (ms: (number | null)[]) => ms.filter((m): m is number => m !== null).map((m) => m % 12)

describe('chordFrets', () => {
  it('dùng thế mở quen thuộc', () => {
    expect(chordFrets(chord('C'))).toEqual([null, 3, 2, 0, 1, 0])
    expect(chordFrets(chord('Am'))).toEqual([null, 0, 2, 2, 1, 0])
    expect(chordFrets(chord('G'))).toEqual([3, 2, 0, 0, 0, 3])
  })

  it('dùng hình chặn cho hợp âm không có thế mở', () => {
    expect(chordFrets(chord('F'))).toEqual([1, 3, 3, 2, 1, 1])
    expect(chordFrets(chord('Bm'))).toEqual([null, 2, 4, 4, 3, 2])
    expect(chordFrets(chord('F#m'))).toEqual([2, 4, 4, 2, 2, 2])
    expect(chordFrets(chord('Bm7b5'))).toEqual([null, 2, 3, 2, 3, null])
  })

  it('mọi thế bấm chỉ chứa nốt của hợp âm', () => {
    for (const s of ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb', 'Eb', 'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'C#m', 'G#m', 'Dmaj7', 'Fmaj7', 'Ab7', 'Csus4', 'Edim', 'Caug', 'C6', 'Am6', 'Gadd9', 'B7sus4', 'Ebdim7']) {
      const c = chord(s)
      const allowed = c.notes.map(chroma)
      for (const p of pc(guitarVoicing(c).stringMidis)) expect(allowed, `${s}: ${p}`).toContain(p)
    }
  })
})

describe('guitarVoicing', () => {
  it('xác định bass và bass luân phiên', () => {
    const c = guitarVoicing(chord('C'))
    expect(c.bass).toBe(48) // dây 5 phím 3
    expect(c.altBass).toBe(52) // dây 4 phím 2 (E)
    const g = guitarVoicing(chord('G'))
    expect(g.bass).toBe(43) // dây 6 phím 3
    expect(g.altBass).toBe(50) // dây 4 buông (D)
    const d = guitarVoicing(chord('D'))
    expect(d.bass).toBe(50) // dây 4 buông
    expect(d.altBass).toBe(45) // dây 5 buông (A) — được dùng dù thế bấm không đánh dây 5
    expect(guitarVoicing(chord('Em')).altBass).toBe(47) // dây 5 phím 2 (B, quãng 5)
    expect(guitarVoicing(chord('Am')).altBass).toBe(52) // dây 4 phím 2 (E)
    expect(guitarVoicing(chord('F')).altBass).toBe(48) // dây 5 phím 3 (C)
  })

  it('hợp âm có bass riêng', () => {
    expect(guitarVoicing(chord('G/B')).bass % 12).toBe(11)
    expect(guitarVoicing(chord('C/G')).bass).toBe(43)
  })

  it('lấy nốt theo dây, dây câm thì lấy dây thấp hơn', () => {
    const v = guitarVoicing(chord('Bm7b5'))
    expect(stringMidi(v, 1)).toBe(stringMidi(v, 2))
    expect(stringMidi(guitarVoicing(chord('C')), 1)).toBe(64)
  })

  it('dựng tạm cách xếp khi không có thế bấm', () => {
    const v = guitarVoicing(chord('Cmaj9'))
    expect(v.frets).toBeNull()
    expect(v.stringMidis.filter((m) => m !== null).length).toBeGreaterThanOrEqual(5)
    expect(v.bass % 12).toBe(0)
  })
})

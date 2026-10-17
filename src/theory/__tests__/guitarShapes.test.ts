import { describe, expect, it } from 'vitest'
import { CHORD_TYPES, chordFromRoot } from '../chords'
import { chordShapes, shapeId, shapeMidis, toneRules } from '../guitarShapes'
import { chroma } from '../notes'
import { parseProgression } from '../progression'

const shapes = (s: string) => chordShapes(parseProgression(s)[0]).map(shapeId)

describe('chordShapes', () => {
  it('có các thế bấm quen thuộc, thế chuẩn đứng đầu', () => {
    expect(shapes('C')[0]).toBe('x32010')
    expect(shapes('C')).toEqual(expect.arrayContaining(['x35553', '8,10,10,9,8,8', 'x,x,10,12,13,12']))
    expect(shapes('F')[0]).toBe('133211')
    expect(shapes('G7')[0]).toBe('320001')
    expect(shapes('E7#9')).toContain('x7678x')
    expect(shapes('Am')[0]).toBe('x02210')
  })

  it('mọi loại hợp âm ở mọi chủ âm: thế bấm hợp lệ', () => {
    const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
    for (const t of CHORD_TYPES) {
      for (const root of roots) {
        const info = chordFromRoot(root, t.id)
        const chord = { root, intervals: info.intervals, symbol: root + t.id }
        const list = chordShapes(chord)
        expect(list.length, chord.symbol).toBeGreaterThan(0)
        const allowed = new Set(info.notes.map(chroma))
        const required = new Set(toneRules(chord).filter((r) => r.required).map((r) => r.chroma))
        for (const sh of list) {
          const midis = shapeMidis(sh).filter((m): m is number => m !== null)
          const pcs = new Set(midis.map((m) => m % 12))
          for (const p of pcs) expect(allowed.has(p), `${chord.symbol} ${shapeId(sh)}`).toBe(true)
          for (const r of required) expect(pcs.has(r), `${chord.symbol} ${shapeId(sh)} thiếu nốt`).toBe(true)
          expect(Math.min(...midis) % 12, `${chord.symbol} ${shapeId(sh)} bass`).toBe(chroma(root))
          expect(new Set(sh.fingers.filter((f) => f !== null)).size, `${chord.symbol} ${shapeId(sh)} ngón`).toBeLessThanOrEqual(4)
          const fretted = sh.frets.filter((f): f is number => f !== null && f > 0)
          if (fretted.length) expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThanOrEqual(3)
        }
      }
    }
  })

  it('ngón bấm và ngón chặn', () => {
    const [f] = chordShapes(parseProgression('F')[0])
    expect(f.barre).toEqual({ fret: 1, from: 6, to: 1 })
    expect(f.fingers).toEqual([1, 3, 4, 2, 1, 1])
    const [c] = chordShapes(parseProgression('C')[0])
    expect(c.barre).toBeUndefined()
    expect(c.fingers).toEqual([null, 3, 2, null, 1, null])
    expect(c.position).toBe(0)
  })

  it('quy tắc nốt: quãng 5 đúng và quãng 9 trong hợp âm 13 được bỏ', () => {
    const rules = toneRules({ root: 'G', intervals: ['1P', '3M', '5P', '7m', '9M', '13M'] })
    expect(rules.filter((r) => !r.required).map((r) => r.chroma).sort()).toEqual([2, 9]) // D (5), A (9)
  })

  it('hợp âm có bass riêng: nốt thấp nhất là bass', () => {
    const list = chordShapes(parseProgression('G/B')[0])
    for (const sh of list) expect(Math.min(...(shapeMidis(sh).filter((m) => m !== null) as number[])) % 12).toBe(11)
  })
})

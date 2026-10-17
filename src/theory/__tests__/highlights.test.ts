import { describe, expect, it } from 'vitest'
import { makeHighlights } from '../highlights'
import { getChord } from '../chords'

describe('highlights', () => {
  const am7 = getChord(9, 'm7')

  it('gắn nhãn theo tên nốt và đánh dấu chủ âm', () => {
    const h = makeHighlights(am7.notes, am7.labels, 'note')
    expect(h.size).toBe(4)
    expect(h.get(9)).toEqual({ label: 'A', isRoot: true })
    expect(h.get(0)).toEqual({ label: 'C', isRoot: false })
  })

  it('gắn nhãn theo quãng', () => {
    const h = makeHighlights(am7.notes, am7.labels, 'interval')
    expect(h.get(0)?.label).toBe('♭3')
    expect(h.get(7)?.label).toBe('♭7')
  })

  it('gắn nhãn Đô Rê Mi', () => {
    const h = makeHighlights(am7.notes, am7.labels, 'solfege')
    expect(h.get(9)?.label).toBe('La')
  })
})

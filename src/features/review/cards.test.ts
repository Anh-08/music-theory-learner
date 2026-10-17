import { describe, expect, it } from 'vitest'
import { DECKS, buildQuestion, cardIds, deckStats, pickSession } from './cards'

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

describe('thẻ ôn tập', () => {
  it('mọi thẻ dựng được câu hỏi 4 lựa chọn khác nhau, đáp án nằm trong lựa chọn', () => {
    const random = seeded(42)
    for (const id of cardIds(DECKS.map((d) => d.id))) {
      for (const locale of ['vi', 'en'] as const) {
        const q = buildQuestion(id, locale, random)
        expect(q.options.length, id).toBeGreaterThanOrEqual(3)
        expect(new Set(q.options).size, id).toBe(q.options.length)
        expect(q.answer, id).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('câu hỏi đúng nội dung', () => {
    const r = seeded(7)
    const q = buildQuestion('chord-spell:m7', 'vi', r)
    expect(q.params.chord).toMatch(/m7$/)
    const key = buildQuestion('key-sig:E', 'en', r)
    expect(key.options[key.answer]).toBe('4♯')
    expect(key.params.key).toBe('E major')
    const ear = buildQuestion('interval-ear:5P', 'vi', r)
    expect(ear.events![1].midis[0] - ear.events![0].midis[0]).toBe(7)
    expect(ear.options[ear.answer]).toBe('Quãng 5 đúng')
  })

  it('chọn thẻ đến hạn trước rồi tới thẻ mới', () => {
    const srs = { 'key-sig:G': { box: 2, due: 50 }, 'key-sig:D': { box: 1, due: 10 }, 'key-sig:A': { box: 3, due: 999 } }
    const s = pickSession(srs, ['key-sig'], 100, 5, seeded(1))
    expect(s.slice(0, 2)).toEqual(['key-sig:D', 'key-sig:G'])
    expect(s).not.toContain('key-sig:A')
    expect(s).toHaveLength(5)
  })

  it('thống kê bộ thẻ', () => {
    const srs = { 'diatonic:0': { box: 5, due: 999 }, 'diatonic:1': { box: 0, due: 0 } }
    expect(deckStats(srs, 'diatonic', 100)).toEqual({ total: 7, due: 1, fresh: 5, learned: 1 })
  })
})

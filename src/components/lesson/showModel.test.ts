import { describe, expect, it } from 'vitest'
import { ascendingMidis, buildShow, pianoRangeFor } from './showModel'

describe('buildShow', () => {
  it('dựng scale và phát lên – xuống', () => {
    const m = buildShow({ root: 'C', scale: 'major' }, 'piano')
    expect(m.notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    expect(m.events.map((e) => e.midis[0])).toEqual([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60])
  })

  it('nốt có quãng tám thì piano chỉ tô đúng các phím đó', () => {
    const m = buildShow({ notes: 'E4 G4 C5', labels: 'interval' }, 'piano')
    expect([...m.onlyMidis!]).toEqual([64, 67, 72])
    expect(m.highlights.get(4)).toEqual({ label: '1', isRoot: true })
    expect(m.highlights.get(0)?.label).toBe('♭6')
  })

  it('thế bấm guitar: chỉ tô các vị trí trong thế bấm và phát đúng cao độ', () => {
    const m = buildShow({ root: 'C', chord: 'M', shape: 'x32010' }, 'guitar')
    expect(m.only).toHaveLength(5)
    expect(m.events.map((e) => e.midis[0])).toEqual([48, 52, 55, 60, 64])
  })

  it('báo lỗi khi thiếu thông tin', () => {
    expect(() => buildShow({}, 'guitar')).toThrow()
    expect(() => buildShow({ scale: 'major' }, 'guitar')).toThrow()
  })

  it('xếp nốt đi lên và tính khoảng phím piano', () => {
    expect(ascendingMidis(['G', 'C', 'E'], 60)).toEqual([67, 72, 76])
    expect(pianoRangeFor(new Set([43, 76]))).toEqual([36, 83])
    expect(pianoRangeFor()).toEqual([48, 71])
  })
})

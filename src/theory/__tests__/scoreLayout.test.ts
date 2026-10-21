import { describe, expect, it } from 'vitest'
import { newScore, type Measure } from '../score'
import { LAYOUT, cursorBox, eventWidth, hitTest, layoutScore, measureContentWidth, systemHeight, type ScoreGeometry } from '../scoreLayout'

const quarters = (n: number): Measure => ({ events: Array.from({ length: n }, () => ({ duration: 'q' as const, dots: 0 as const, notes: [{ midi: 64, string: 1 }] })) })
const sixteenths = (n: number): Measure => ({ events: Array.from({ length: n }, () => ({ duration: '16' as const, dots: 0 as const, notes: [{ midi: 64, string: 1 }] })) })

describe('score layout', () => {
  it('gives longer values more room, but not proportionally', () => {
    expect(eventWidth(480)).toBeGreaterThan(eventWidth(120))
    expect(eventWidth(1920)).toBeLessThan(eventWidth(120) * 4)
    expect(measureContentWidth(sixteenths(16))).toBeGreaterThan(measureContentWidth(quarters(4)))
    expect(measureContentWidth({ events: [] })).toBe(70)
  })

  it('puts bars on lines that fit the width and fills every line but a short last one', () => {
    const score = newScore('a', { measures: Array.from({ length: 10 }, () => quarters(4)) })
    const layout = layoutScore(score, { width: 800, view: 'both', strings: 6, keyAccidentals: 0 })
    expect(layout.systems.length).toBeGreaterThan(1)
    expect(layout.systems.flatMap((s) => s.measures.map((m) => m.index))).toEqual([...Array(10).keys()])
    for (const sys of layout.systems.slice(0, -1)) {
      const last = sys.measures[sys.measures.length - 1]
      expect(last.x + last.width).toBe(800 - LAYOUT.marginX)
      expect(sys.measures[0].first).toBe(true)
      expect(sys.measures.slice(1).every((m) => !m.first)).toBe(true)
    }
  })

  it('does not stretch a nearly empty last line', () => {
    const score = newScore('a', { measures: [quarters(4)] })
    const layout = layoutScore(score, { width: 1200, view: 'tab', strings: 6, keyAccidentals: 0 })
    expect(layout.systems[0].measures[0].width).toBeLessThan(600)
  })

  it('always places a very wide bar, alone on its line', () => {
    const score = newScore('a', { measures: [sixteenths(32), quarters(1)] })
    const layout = layoutScore(score, { width: 300, view: 'both', strings: 6, keyAccidentals: 3 })
    expect(layout.systems).toHaveLength(2)
  })

  it('stacks systems with staff and tab positions per view', () => {
    const both = systemHeight('both', 6)
    const tab = systemHeight('tab', 6)
    const staff = systemHeight('staff', 6)
    expect(both.staffOffset).toBeDefined()
    expect(both.tabOffset!).toBeGreaterThan(both.staffOffset!)
    expect(tab.staffOffset).toBeUndefined()
    expect(staff.tabOffset).toBeUndefined()
    expect(both.height).toBeGreaterThan(tab.height)
    expect(systemHeight('tab', 4).height).toBeLessThan(tab.height)
    const layout = layoutScore(newScore('a', { measures: Array.from({ length: 12 }, () => quarters(4)) }), { width: 500, view: 'both', strings: 6, keyAccidentals: 0 })
    const [a, b] = layout.systems
    expect(b.y).toBe(a.y + a.height + LAYOUT.systemGap)
    expect(layout.height).toBe(layout.systems.at(-1)!.y + both.height)
  })
})

describe('hit-testing', () => {
  const geo: ScoreGeometry = {
    systems: [
      { top: 0, bottom: 200, stringYs: [100, 113, 126, 139, 152, 165] },
      { top: 220, bottom: 420, stringYs: [320, 333, 346, 359, 372, 385] },
    ],
    measures: [
      { index: 0, system: 0, x: 10, width: 200, appendX: 190 },
      { index: 1, system: 0, x: 210, width: 200, appendX: 300 },
      { index: 2, system: 1, x: 10, width: 200, appendX: 60 },
    ],
    events: [
      { measure: 0, event: 0, x: 60 },
      { measure: 0, event: 1, x: 120 },
      { measure: 1, event: 0, x: 250 },
    ],
  }

  it('finds the nearest event and string', () => {
    expect(hitTest(geo, 118, 128)).toEqual({ measure: 0, event: 1, string: 3 })
    expect(hitTest(geo, 62, 99)).toEqual({ measure: 0, event: 0, string: 1 })
  })

  it('finds the append slot', () => {
    expect(hitTest(geo, 180, 155)).toEqual({ measure: 0, event: 2, string: 5 })
    expect(hitTest(geo, 50, 322)).toEqual({ measure: 2, event: 0, string: 1 })
  })

  it('gives no string on the standard staff', () => {
    expect(hitTest(geo, 250, 40)).toEqual({ measure: 1, event: 0, string: undefined })
  })

  it('snaps clicks between systems or past the edges', () => {
    expect(hitTest(geo, 5, 205)!.measure).toBe(0)
    expect(hitTest(geo, 900, 50)!.measure).toBe(1)
    expect(hitTest({ systems: [], measures: [], events: [] }, 0, 0)).toBeNull()
  })

  it('places the cursor on an event or the append slot', () => {
    expect(cursorBox(geo, 0, 1, 2)).toEqual({ x: 120, top: 0, bottom: 200, stringY: 113 })
    expect(cursorBox(geo, 1, 1, 1)!.x).toBe(300)
    expect(cursorBox(geo, 9, 0, 1)).toBeNull()
  })
})

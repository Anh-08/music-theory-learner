import { eventTicks, type Measure, type Score } from './score'

/**
 * Page layout of a score (Phase 10): how wide each bar is, which bars share a line ("system"), and where each
 * system sits. Pure numbers — the renderer (VexFlow) only draws into these boxes.
 * Also hit-testing: mapping a click on the drawing back to a bar, event and string.
 */

export type ScoreViewMode = 'both' | 'tab' | 'staff'

export const LAYOUT = {
  marginX: 10,
  /** Space above each system for chord symbols and volta brackets. */
  topSpace: 34,
  /** Standard staff: VexFlow puts the top line 4 spaces (40px) below the stave's y; bottom line at +80. */
  staffBlock: 92,
  staffTopLine: 40,
  staffBottomLine: 80,
  /** Tab staff: lines 13px apart, top line 2 spaces below the stave's y. */
  tabSpacing: 13,
  tabSpaceAboveLines: 2,
  tabBelow: 34,
  systemGap: 18,
  /** Bars wider than this share of a line on the last line get stretched like the others. */
  stretchLastLine: 0.6,
} as const

export interface LayoutOptions {
  width: number
  view: ScoreViewMode
  /** Number of strings of the tuning (tab lines). */
  strings: number
  /** Accidentals in the key signature (to reserve room at the start of each line). */
  keyAccidentals: number
}

export interface LayoutMeasure {
  index: number
  x: number
  width: number
  /** First bar of its line: carries clef, key signature (and tab glyph). */
  first: boolean
}

export interface LayoutSystem {
  y: number
  height: number
  staffY?: number
  tabY?: number
  measures: LayoutMeasure[]
}

export interface ScoreLayout {
  width: number
  height: number
  systems: LayoutSystem[]
}

/** Horizontal room an event needs: longer values get a little more space (logarithmic, like engraved music). */
export function eventWidth(ticks: number): number {
  return 20 + 6 * Math.log2(Math.max(1, ticks / 60))
}

/** Natural width of a bar's content, without the clef / key / time signature. */
export function measureContentWidth(m: Measure): number {
  if (m.events.length === 0) return 70
  const notes = m.events.reduce((sum, e) => sum + eventWidth(eventTicks(e)) + (e.dots ? 6 : 0), 0)
  return Math.max(70, 24 + notes)
}

/** Extra room at the start of a bar for what is drawn before the notes. */
export function measurePrefixWidth(index: number, m: Measure, first: boolean, opts: Pick<LayoutOptions, 'view' | 'keyAccidentals'>): number {
  let w = 0
  if (first) w += opts.view === 'tab' ? 32 : 36 + opts.keyAccidentals * 10 + (opts.keyAccidentals ? 8 : 0)
  if (index === 0) w += 30 // time signature
  if (m.repeatStart) w += 14
  return w
}

export function systemHeight(view: ScoreViewMode, strings: number): { height: number; staffOffset?: number; tabOffset?: number } {
  let h = LAYOUT.topSpace
  let staffOffset: number | undefined
  let tabOffset: number | undefined
  if (view !== 'tab') {
    staffOffset = h - LAYOUT.staffTopLine + 10
    h = staffOffset + LAYOUT.staffBlock
  }
  if (view !== 'staff') {
    tabOffset = view === 'tab' ? h - LAYOUT.tabSpaceAboveLines * LAYOUT.tabSpacing + 10 : h
    h = tabOffset + LAYOUT.tabSpaceAboveLines * LAYOUT.tabSpacing + (strings - 1) * LAYOUT.tabSpacing + LAYOUT.tabBelow
  }
  return { height: h, staffOffset, tabOffset }
}

/** Breaks the bars into lines that fit `opts.width` and stretches each line to the full width. */
export function layoutScore(score: Pick<Score, 'measures'>, opts: LayoutOptions): ScoreLayout {
  const available = Math.max(120, opts.width - 2 * LAYOUT.marginX)
  const lines: { index: number; natural: number }[][] = []
  let line: { index: number; natural: number }[] = []
  let used = 0
  score.measures.forEach((m, index) => {
    const asFirst = measureContentWidth(m) + measurePrefixWidth(index, m, true, opts)
    const asNext = measureContentWidth(m) + measurePrefixWidth(index, m, false, opts)
    if (line.length > 0 && used + asNext > available) {
      lines.push(line)
      line = []
      used = 0
    }
    const natural = line.length === 0 ? asFirst : asNext
    line.push({ index, natural })
    used += natural
  })
  if (line.length) lines.push(line)

  const { height, staffOffset, tabOffset } = systemHeight(opts.view, opts.strings)
  const systems: LayoutSystem[] = lines.map((items, i) => {
    const total = items.reduce((s, x) => s + x.natural, 0)
    const last = i === lines.length - 1
    const stretch = !last || total > available * LAYOUT.stretchLastLine || total > available
    const scale = stretch ? available / total : 1
    let x = LAYOUT.marginX
    const measures = items.map((item, k) => {
      const width = k === items.length - 1 && stretch ? LAYOUT.marginX + available - x : Math.round(item.natural * scale)
      const lm = { index: item.index, x, width, first: k === 0 }
      x += width
      return lm
    })
    const y = i * (height + LAYOUT.systemGap)
    return {
      y,
      height,
      staffY: staffOffset === undefined ? undefined : y + staffOffset,
      tabY: tabOffset === undefined ? undefined : y + tabOffset,
      measures,
    }
  })
  const totalHeight = systems.length ? systems[systems.length - 1].y + height : 0
  return { width: opts.width, height: totalHeight, systems }
}

// ---------------------------------------------------------------------------------------------
// Geometry after drawing + hit-testing

export interface EventBox {
  measure: number
  event: number
  /** Horizontal centre of the event's notes. */
  x: number
}

export interface MeasureBox {
  index: number
  system: number
  x: number
  width: number
  /** Where the append slot (after the last event) is drawn. */
  appendX: number
}

export interface SystemBox {
  top: number
  bottom: number
  /** y of each tab line: index 0 = string 1. Empty when the tab is hidden. */
  stringYs: number[]
}

export interface ScoreGeometry {
  systems: SystemBox[]
  measures: MeasureBox[]
  events: EventBox[]
}

export interface Hit {
  measure: number
  /** Event index, or the number of events for the append slot. */
  event: number
  /** Nearest string when the click was on the tab; undefined on the standard staff. */
  string?: number
}

/** Maps a click position to a bar, an event (or the append slot) and a string. */
export function hitTest(geo: ScoreGeometry, x: number, y: number): Hit | null {
  if (geo.systems.length === 0) return null
  let sys = geo.systems.findIndex((s) => y >= s.top && y <= s.bottom)
  if (sys < 0) {
    // Between systems: take the nearest.
    let best = Infinity
    geo.systems.forEach((s, i) => {
      const d = Math.min(Math.abs(y - s.top), Math.abs(y - s.bottom))
      if (d < best) {
        best = d
        sys = i
      }
    })
  }
  const measures = geo.measures.filter((m) => m.system === sys)
  if (measures.length === 0) return null
  const m = measures.find((mm) => x >= mm.x && x < mm.x + mm.width) ?? (x < measures[0].x ? measures[0] : measures[measures.length - 1])
  const events = geo.events.filter((e) => e.measure === m.index)
  const slots = [...events.map((e) => ({ event: e.event, x: e.x })), { event: events.length, x: m.appendX }]
  const nearest = slots.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a))
  const ys = geo.systems[sys].stringYs
  let string: number | undefined
  if (ys.length && y >= ys[0] - LAYOUT.tabSpacing && y <= ys[ys.length - 1] + LAYOUT.tabSpacing) {
    string = ys.reduce((best, yy, i) => (Math.abs(yy - y) < Math.abs(ys[best] - y) ? i : best), 0) + 1
  }
  return { measure: m.index, event: nearest.event, string }
}

/** Where to draw the cursor: x, the system's box and (if the tab is shown) the y of the selected string. */
export function cursorBox(geo: ScoreGeometry, measure: number, event: number, string: number): { x: number; top: number; bottom: number; stringY?: number } | null {
  const m = geo.measures.find((mm) => mm.index === measure)
  if (!m) return null
  const e = geo.events.find((ev) => ev.measure === measure && ev.event === event)
  const sys = geo.systems[m.system]
  return { x: e ? e.x : m.appendX, top: sys.top, bottom: sys.bottom, stringY: sys.stringYs[string - 1] }
}

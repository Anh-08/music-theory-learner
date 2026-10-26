import type { PickNote, Step } from '../../audio/rhythms'

export type GridRow = 'strum' | 'bass' | 1 | 2 | 3 | 4

const STRUM_CYCLE: Step[] = [
  { kind: 'rest' },
  { kind: 'strum', dir: 'down', light: false },
  { kind: 'strum', dir: 'up', light: false },
  { kind: 'strum', dir: 'down', light: true },
  { kind: 'strum', dir: 'up', light: true },
  { kind: 'mute' },
]

function sameStrum(a: Step, b: Step): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'strum' && b.kind === 'strum') return a.dir === b.dir && a.light === b.light
  return true
}

function picks(step: Step): PickNote[] {
  return step.kind === 'pick' ? step.notes : []
}

function fromPicks(notes: PickNote[]): Step {
  return notes.length ? { kind: 'pick', notes } : { kind: 'rest' }
}

/**
 * Changes one step when the user clicks a cell in row `row`:
 * the Strum row cycles rest → ↓ → ↑ → light ↓ → light ↑ → ✕ (clearing picked notes); the Bass row cycles none → B → B′;
 * string rows toggle a picked note (clearing any strum).
 */
export function toggleCell(step: Step, row: GridRow): Step {
  if (row === 'strum') {
    // A step holding picked notes counts as a "rest": the first click turns it into a downstroke.
    const i = Math.max(0, STRUM_CYCLE.findIndex((s) => sameStrum(s, step)))
    return STRUM_CYCLE[(i + 1) % STRUM_CYCLE.length]
  }
  const notes = picks(step)
  if (row === 'bass') {
    const others = notes.filter((n) => n !== 'B' && n !== "B'")
    const cur = notes.includes('B') ? 'B' : notes.includes("B'") ? "B'" : null
    const next: PickNote[] = cur === null ? ['B'] : cur === 'B' ? ["B'"] : []
    return fromPicks([...next, ...others])
  }
  return fromPicks(notes.includes(row) ? notes.filter((n) => n !== row) : [...notes, row])
}

/** Rows to show: the ones in use (all of them while editing). */
export function visibleRows(steps: Step[], editing: boolean): GridRow[] {
  if (editing) return ['strum', 'bass', 1, 2, 3, 4]
  const rows: GridRow[] = []
  if (steps.some((s) => s.kind === 'strum' || s.kind === 'mute')) rows.push('strum')
  const all = steps.flatMap(picks)
  if (all.some((n) => n === 'B' || n === "B'")) rows.push('bass')
  for (const n of [1, 2, 3, 4] as const) if (all.includes(n)) rows.push(n)
  // Highest string on top, as in tab.
  return [...rows.filter((r) => typeof r === 'string'), ...rows.filter((r): r is 1 | 2 | 3 | 4 => typeof r === 'number').sort((a, b) => a - b)]
}

/** Beat count label for each step: "1 & 2 &", "1 e & a", or "1 · ·" for triplets. */
export function countLabels(beatsPerBar: number, stepsPerBeat: number): string[] {
  const sub = stepsPerBeat === 2 ? ['&'] : stepsPerBeat === 4 ? ['e', '&', 'a'] : ['·', '·']
  return Array.from({ length: beatsPerBar }, (_, b) => [String(b + 1), ...sub]).flat()
}

export interface GridCell {
  row: GridRow
  step: number
}

function bassOf(step: Step): 'B' | "B'" | null {
  const notes = picks(step)
  return notes.includes('B') ? 'B' : notes.includes("B'") ? "B'" : null
}

function withBass(step: Step, bass: 'B' | "B'" | null): Step {
  const others = picks(step).filter((n) => n !== 'B' && n !== "B'")
  return fromPicks(bass ? [bass, ...others] : others)
}

function withString(step: Step, string: 1 | 2 | 3 | 4, on: boolean): Step {
  const notes = picks(step).filter((n) => n !== string)
  return fromPicks(on ? [...notes, string] : notes)
}

/**
 * Drag-to-paint, like selecting photos by dragging on a phone: the first cell is toggled as by a click,
 * and every cell in the rectangle from `start` to `end` takes the same state. Dragging back shrinks the
 * rectangle and restores the cells it leaves, since it is always applied to the steps as they were when
 * the drag began.
 * - Starting on the Strum row paints that strum (↓, ↑, ✕…) along the row.
 * - Starting on the Bass row or a string row paints across those rows: if the first cell was switched on,
 *   every cell is switched on (bass cells take the first cell's B / B′, or B); if it was switched off,
 *   every cell is cleared.
 */
export function paintCells(steps: Step[], start: GridCell, end: GridCell, rows: GridRow[], visible?: ReadonlyArray<number>): Step[] {
  const first = toggleCell(steps[start.step], start.row)
  const lo = Math.min(start.step, end.step)
  const hi = Math.max(start.step, end.step)
  // Hidden steps (the e / a of a beat shown in eighths) are never painted.
  const inCols = (i: number) => i >= lo && i <= hi && (!visible || visible.includes(i))

  if (start.row === 'strum') return steps.map((s, i) => (inCols(i) ? first : s))

  const pickRows = rows.filter((r) => r !== 'strum')
  const a = pickRows.indexOf(start.row)
  // Dragging onto the Strum row stops at the first pick row.
  const b = end.row === 'strum' ? 0 : pickRows.indexOf(end.row)
  const covered = pickRows.slice(Math.min(a, b), Math.max(a, b) + 1)
  const bass = start.row === 'bass' ? bassOf(first) : null
  const on = start.row === 'bass' ? bass !== null : picks(first).includes(start.row)

  return steps.map((s, i) => {
    if (!inCols(i)) return s
    let next = s
    for (const row of covered) {
      if (row === 'bass') next = withBass(next, start.row === 'bass' ? bass : on ? (bassOf(next) ?? 'B') : null)
      else next = withString(next, row, on)
    }
    return next
  })
}

/**
 * Re-divides a bar to `to` steps per beat (e.g. eighths 2 → sixteenths 4): finer steps keep every hit in place with rests
 * in between; coarser steps keep only the hits that still fall on a step (the in-between sixteenths are dropped).
 */
export function resubdivide(steps: Step[], from: number, to: number): Step[] {
  if (from === to) return steps
  if (to > from) {
    const k = to / from
    return steps.flatMap((s) => [s, ...Array.from({ length: k - 1 }, (): Step => ({ kind: 'rest' }))])
  }
  const k = from / to
  return steps.filter((_, i) => i % k === 0)
}

/**
 * Which beats are split into sixteenths. A bar with sixteenth steps (4 per beat) can show some beats in eighths only:
 * `splitBeats` lists the beats shown in sixteenths (undefined = all of them). Other step sizes have no split beats.
 */
export function splitOf(r: { beatsPerBar: number; stepsPerBeat: number; splitBeats?: number[] }): boolean[] | undefined {
  if (r.stepsPerBeat !== 4) return undefined
  return Array.from({ length: r.beatsPerBar }, (_, b) => !r.splitBeats || r.splitBeats.includes(b))
}

/** Steps shown in the grid: everything, except the e / a of beats kept in eighths. */
export function visibleSteps(beatsPerBar: number, stepsPerBeat: number, split?: boolean[]): number[] {
  const all = Array.from({ length: beatsPerBar * stepsPerBeat }, (_, i) => i)
  if (stepsPerBeat !== 4 || !split) return all
  return all.filter((i) => split[Math.floor(i / 4)] || i % 2 === 0)
}

export interface Subdivided {
  steps: Step[]
  stepsPerBeat: number
  split?: boolean[]
}

/**
 * Splits beat `beat` into sixteenths, or back into eighths. An eighth-note bar becomes a sixteenth bar with only that
 * beat split; unsplitting a beat clears its e / a; when no beat is split any more the bar goes back to eighths.
 */
export function toggleSplit(bar: Subdivided, beatsPerBar: number, beat: number): Subdivided {
  if (bar.stepsPerBeat === 2) {
    return { steps: resubdivide(bar.steps, 2, 4), stepsPerBeat: 4, split: Array.from({ length: beatsPerBar }, (_, b) => b === beat) }
  }
  if (bar.stepsPerBeat !== 4) return bar
  const split = (bar.split ?? Array.from({ length: beatsPerBar }, () => true)).map((on, b) => (b === beat ? !on : on))
  const steps = split[beat] ? bar.steps : bar.steps.map((s, i): Step => (Math.floor(i / 4) === beat && i % 2 === 1 ? { kind: 'rest' } : s))
  if (split.some(Boolean)) return { steps, stepsPerBeat: 4, split }
  return { steps: resubdivide(steps, 4, 2), stepsPerBeat: 2 }
}

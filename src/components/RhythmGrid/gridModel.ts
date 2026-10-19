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

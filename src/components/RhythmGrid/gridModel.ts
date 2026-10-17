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
 * Đổi một bước khi người dùng bấm vào ô của hàng `row`:
 * hàng Quạt đổi vòng nghỉ → ↓ → ↑ → ↓nhẹ → ↑nhẹ → ✕ (xóa nốt móc); hàng Bass đổi không → B → B′;
 * hàng dây bật / tắt nốt móc (xóa tiếng quạt nếu có).
 */
export function toggleCell(step: Step, row: GridRow): Step {
  if (row === 'strum') {
    // Bước đang là nốt móc được coi như "nghỉ": bấm lần đầu thành quạt xuống.
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

/** Các hàng cần hiện: hàng nào có dùng tới (luôn hiện đủ khi đang sửa). */
export function visibleRows(steps: Step[], editing: boolean): GridRow[] {
  if (editing) return ['strum', 'bass', 1, 2, 3, 4]
  const rows: GridRow[] = []
  if (steps.some((s) => s.kind === 'strum' || s.kind === 'mute')) rows.push('strum')
  const all = steps.flatMap(picks)
  if (all.some((n) => n === 'B' || n === "B'")) rows.push('bass')
  for (const n of [1, 2, 3, 4] as const) if (all.includes(n)) rows.push(n)
  // Dây cao nhất ở trên, như tab.
  return [...rows.filter((r) => typeof r === 'string'), ...rows.filter((r): r is 1 | 2 | 3 | 4 => typeof r === 'number').sort((a, b) => a - b)]
}

/** Nhãn đếm phách cho từng bước: "1 & 2 &", "1 e & a", hoặc "1 · ·" cho chùm ba. */
export function countLabels(beatsPerBar: number, stepsPerBeat: number): string[] {
  const sub = stepsPerBeat === 2 ? ['&'] : stepsPerBeat === 4 ? ['e', '&', 'a'] : ['·', '·']
  return Array.from({ length: beatsPerBar }, (_, b) => [String(b + 1), ...sub]).flat()
}

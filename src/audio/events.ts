/** Một lần phát: các nốt (midi) cùng vang lên tại thời điểm `at` (giây, tính từ lúc bắt đầu). */
export interface PlayEvent {
  midis: number[]
  at: number
  duration: number
}

/** Các nốt lần lượt từng nốt một. */
export function sequenceEvents(midis: number[], step = 0.35, duration = step * 1.6): PlayEvent[] {
  return midis.map((m, i) => ({ midis: [m], at: i * step, duration }))
}

/**
 * Hợp âm. `roll` > 0 rải các nốt từ trầm lên cao cách nhau `roll` giây
 * (giống tiếng quạt xuống trên guitar); 0 là bấm cùng lúc.
 */
export function chordEvents(midis: number[], roll = 0, duration = 2): PlayEvent[] {
  const sorted = [...midis].sort((a, b) => a - b)
  if (roll === 0) return [{ midis: sorted, at: 0, duration }]
  return sorted.map((m, i) => ({ midis: [m], at: i * roll, duration: duration - i * roll }))
}

/** Rải hợp âm từng nốt rồi đánh cả hợp âm. */
export function arpeggioThenChord(midis: number[], step = 0.3, roll = 0): PlayEvent[] {
  const arp = sequenceEvents(midis, step)
  const start = midis.length * step + 0.2
  return [...arp, ...chordEvents(midis, roll).map((e) => ({ ...e, at: e.at + start }))]
}

export function totalDuration(events: PlayEvent[]): number {
  return events.reduce((max, e) => Math.max(max, e.at + e.duration), 0)
}

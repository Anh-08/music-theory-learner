/** One playback event: the notes (midi) sounding together at `at` (seconds from the start). */
export interface PlayEvent {
  midis: number[]
  at: number
  duration: number
}

/** Notes one at a time. */
export function sequenceEvents(midis: number[], step = 0.35, duration = step * 1.6): PlayEvent[] {
  return midis.map((m, i) => ({ midis: [m], at: i * step, duration }))
}

/**
 * A chord. `roll` > 0 rolls the notes from low to high, `roll` seconds apart
 * (like a guitar downstroke); 0 strikes them together.
 */
export function chordEvents(midis: number[], roll = 0, duration = 2): PlayEvent[] {
  const sorted = [...midis].sort((a, b) => a - b)
  if (roll === 0) return [{ midis: sorted, at: 0, duration }]
  return sorted.map((m, i) => ({ midis: [m], at: i * roll, duration: duration - i * roll }))
}

/** Arpeggiate the chord note by note, then strike the whole chord. */
export function arpeggioThenChord(midis: number[], step = 0.3, roll = 0): PlayEvent[] {
  const arp = sequenceEvents(midis, step)
  const start = midis.length * step + 0.2
  return [...arp, ...chordEvents(midis, roll).map((e) => ({ ...e, at: e.at + start }))]
}

export function totalDuration(events: PlayEvent[]): number {
  return events.reduce((max, e) => Math.max(max, e.at + e.duration), 0)
}

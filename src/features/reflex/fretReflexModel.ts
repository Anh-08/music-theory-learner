import { NECK_FRETS, clampFrets, neckEnd, positionKey, type FretMode, type FretZone, type StringFret, type TargetOptions, type Tuning } from '../../theory'

export type FretPace = 'timer' | 'metronome'

export interface FretReflexSettings {
  mode: FretMode
  /** 1: one fixed zone; 2: a random zone each note. Level 3 is the advanced mode. */
  level: 1 | 2
  /** Level 1: the zone practised. */
  zone: FretZone
  /** Octave names (E2, E3) instead of the mini fretboard; unlocks the exact-pitch mode. */
  advanced: boolean
  /** Enabled strings (several-string modes). */
  strings: number[]
  /** One-string mode: the string practised. */
  string: number
  /** One-string mode: move to the next enabled string every N notes (0 = never). */
  rotateEvery: 0 | 4 | 8
  /** Position mode: first fret of the window. */
  boxStart: number
  naturalsOnly: boolean
  pace: FretPace
  /** Time limit per note, in seconds. */
  seconds: number
  tempo: number
  /** Metronome pace: beats per note. */
  beatsPerNote: 1 | 2 | 4
  /** Notes per session. */
  rounds: 10 | 20 | 40
  tuning: string
  /** Play the note after each answer. */
  sound: boolean
  /** Number of frets on the user's neck. */
  neckFrets: number
  /** Advanced: strings have different fret counts (`stringFrets`). */
  perString: boolean
  /** String number → last fret, used when `perString` is on. */
  stringFrets: Partial<Record<number, number>>
}

export const DEFAULT_FRET_REFLEX: FretReflexSettings = {
  mode: 'string',
  level: 1,
  zone: 0,
  advanced: false,
  strings: [1, 2, 3, 4, 5, 6],
  string: 6,
  rotateEvery: 0,
  boxStart: 5,
  naturalsOnly: false,
  pace: 'timer',
  seconds: 5,
  tempo: 60,
  beatsPerNote: 4,
  rounds: 20,
  tuning: 'standard',
  sound: true,
  neckFrets: NECK_FRETS,
  perString: false,
  stringFrets: {},
}

export const SECONDS_OPTIONS = [5, 4, 3, 2, 1.5]

/** Strings of a tuning, from the highest (1). */
export function stringNumbers(t: Tuning): number[] {
  return Array.from({ length: t.strings.length }, (_, i) => i + 1)
}

/** Keeps the string settings valid for the tuning (a ukulele has 4 strings…). */
export function fitStrings(s: FretReflexSettings, t: Tuning): Pick<FretReflexSettings, 'strings' | 'string'> {
  const n = t.strings.length
  const strings = s.strings.filter((x) => x >= 1 && x <= n)
  return { strings: strings.length ? strings : stringNumbers(t), string: s.string >= 1 && s.string <= n ? s.string : n }
}

/** Neck length options for the target generator: per-string fret counts only when enabled. */
export function neckOptions(s: FretReflexSettings): { neckFrets: number; stringFrets?: Partial<Record<number, number>> } {
  return { neckFrets: clampFrets(s.neckFrets), ...(s.perString ? { stringFrets: s.stringFrets } : {}) }
}

/** Last fret of the longest string of the tuning (how many frets to draw). */
export function neckLength(s: FretReflexSettings, t: Tuning): number {
  return neckEnd(neckOptions(s), stringNumbers(t))
}

/** Target options for the `round`-th note (one-string mode may rotate through the enabled strings). */
export function targetOptions(s: FretReflexSettings, t: Tuning, round: number): TargetOptions {
  const { strings, string } = fitStrings(s, t)
  let one = string
  if (s.mode === 'string' && s.rotateEvery > 0) {
    const cycle = [...new Set([string, ...strings.filter((x) => x !== string)])]
    one = cycle[Math.floor(round / s.rotateEvery) % cycle.length]
  }
  return {
    mode: s.mode === 'pitch' && !s.advanced ? 'noteString' : s.mode,
    tuning: t,
    strings: s.mode === 'string' ? [one] : strings,
    zone: s.level === 1 ? s.zone : null,
    advanced: s.advanced,
    boxStart: s.boxStart,
    naturalsOnly: s.naturalsOnly,
    ...neckOptions(s),
  }
}

/** Time allowed for a round: the per-note limit, multiplied by the number of positions to find. */
export function roundLimitMs(s: FretReflexSettings, answers: number): number {
  const perNote = s.pace === 'timer' ? s.seconds * 1000 : (60_000 / s.tempo) * s.beatsPerNote
  return perNote * Math.max(1, answers)
}

/** A correct answer slower than this counts as weak in the review schedule. */
export function slowMs(s: FretReflexSettings): number {
  return roundLimitMs(s, 1) * 0.75
}

/** Records are kept per mode and difficulty. */
export function recordId(s: FretReflexSettings): string {
  return `fret-reflex:${s.mode}:${s.advanced ? 'adv' : `l${s.level}`}`
}

export interface CellStat {
  string: number
  fret: number
  attempts: number
  misses: number
  totalMs: number
}

export interface SessionStats {
  startedAt: number
  /** Positions answered (each position of a "find all" round counts once). */
  answered: number
  correct: number
  /** Reaction times of the correct answers. */
  reactions: number[]
  cells: Record<string, CellStat>
}

export function emptyStats(now: number): SessionStats {
  return { startedAt: now, answered: 0, correct: 0, reactions: [], cells: {} }
}

export function recordAttempt(st: SessionStats, p: StringFret, correct: boolean, ms: number): SessionStats {
  const key = positionKey(p)
  const prev = st.cells[key] ?? { string: p.string, fret: p.fret, attempts: 0, misses: 0, totalMs: 0 }
  return {
    ...st,
    answered: st.answered + 1,
    correct: st.correct + (correct ? 1 : 0),
    reactions: correct ? [...st.reactions, ms] : st.reactions,
    cells: { ...st.cells, [key]: { ...prev, attempts: prev.attempts + 1, misses: prev.misses + (correct ? 0 : 1), totalMs: prev.totalMs + ms } },
  }
}

/** How "blind" a cell is (0–1): mostly the miss rate, plus how slow the answers were against the time limit. */
export function heat(c: CellStat, limitMs: number): number {
  if (!c.attempts) return 0
  const missRate = c.misses / c.attempts
  const slowness = Math.min(1, c.totalMs / c.attempts / limitMs)
  return Math.min(1, missRate * 0.7 + slowness * 0.3)
}

/** The weakest cells first (only cells with a real weakness). */
export function blindSpots(st: SessionStats, limitMs: number, n = 3): CellStat[] {
  return Object.values(st.cells)
    .filter((c) => heat(c, limitMs) >= 0.35)
    .sort((a, b) => heat(b, limitMs) - heat(a, limitMs) || a.string - b.string || a.fret - b.fret)
    .slice(0, n)
}

export interface SessionSummary {
  correct: number
  answered: number
  perMinute: number
  /** Average reaction of correct answers (0 if none). */
  avgMs: number
}

export function summarize(st: SessionStats, now: number): SessionSummary {
  const minutes = Math.max(1 / 60, (now - st.startedAt) / 60_000)
  const avgMs = st.reactions.length ? st.reactions.reduce((a, b) => a + b, 0) / st.reactions.length : 0
  return { correct: st.correct, answered: st.answered, perMinute: Math.round((st.correct / minutes) * 10) / 10, avgMs: Math.round(avgMs) }
}

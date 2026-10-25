/**
 * Pure logic of the standalone metronome: meters, accents, subdivisions, the speed and gap trainers, tap tempo.
 * A "pulse" is one counted beat — one beat dot on screen and one Transport beat (the BPM counts pulses).
 */

export type Meter = '2/4' | '3/4' | '4/4' | '5/4' | '6/8' | '7/8' | '9/8' | '12/8' | 'custom'
export type Subdivision = 'none' | 'eighths' | 'triplets' | 'sixteenths' | 'swing'
/** Accent of one beat dot; clicking a dot cycles through them in this order. */
export type BeatLevel = 'strong' | 'medium' | 'normal' | 'silent'
export type Grouping7 = '2+2+3' | '3+2+2' | '2+3+2'

export const METERS: Meter[] = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8', 'custom']
export const GROUPINGS_7: Grouping7[] = ['2+2+3', '3+2+2', '2+3+2']
export const BEAT_LEVELS: BeatLevel[] = ['strong', 'medium', 'normal', 'silent']
/** Lower numbers of a custom time signature: the note value one beat dot stands for (2 = half note, 8 = eighth…). */
export const CUSTOM_UNITS = [1, 2, 4, 8, 16, 32] as const
export type CustomUnit = (typeof CUSTOM_UNITS)[number]
export const MAX_CUSTOM_BEATS = 32
export const MIN_BPM = 30
export const MAX_BPM = 300

export interface MetronomeSettings {
  tempo: number
  meter: Meter
  /** Upper number of the custom time signature: beats per bar (1–32). */
  customBeats: number
  /** Lower number of the custom time signature: which note is one beat (the BPM counts it). */
  customUnit: CustomUnit
  /** Optional grouping of the custom meter, e.g. "3+3+2"; empty or invalid = the default. */
  customGrouping: string
  /** 6/8, 9/8, 12/8: count the dotted quarter (felt beat) or every eighth. */
  compoundUnit: 'dotted' | 'eighth'
  grouping7: Grouping7
  /** Per-dot accents chosen by the user; null (or the wrong length) = the meter's default. */
  accents: BeatLevel[] | null
  subdivision: Subdivision
  /** Swung eighths: where the second eighth falls, as a fraction of the beat (0.5 = straight, 2/3 = triplet swing). */
  swing: number
  /** Volume of the subdivision clicks relative to a normal beat (0–1). */
  subVolume: number
  /** Flash the screen and play no sound. */
  visualOnly: boolean
  trainer: SpeedTrainer
  gap: GapTrainer
  timer: { on: boolean; minutes: number }
}

export interface SpeedTrainer {
  on: boolean
  start: number
  target: number
  /** BPM added at each step. */
  step: number
  /** A step every `every` bars or seconds. */
  every: number
  unit: 'bars' | 'seconds'
}

export interface GapTrainer {
  on: boolean
  /** Bars with sound… */
  play: number
  /** …then bars of silence (the beat dots keep moving). */
  mute: number
}

export const DEFAULT_METRONOME: MetronomeSettings = {
  tempo: 90,
  meter: '4/4',
  customBeats: 4,
  customUnit: 4,
  customGrouping: '',
  compoundUnit: 'dotted',
  grouping7: '2+2+3',
  accents: null,
  subdivision: 'none',
  swing: 2 / 3,
  subVolume: 0.6,
  visualOnly: false,
  trainer: { on: false, start: 60, target: 100, step: 5, every: 4, unit: 'bars' },
  gap: { on: false, play: 3, mute: 1 },
  timer: { on: false, minutes: 10 },
}

export const clampBpm = (bpm: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)))

/** Fills settings read from storage with defaults (older or damaged data never breaks the page). */
export function normalizeSettings(raw: Partial<MetronomeSettings> | null | undefined): MetronomeSettings {
  const s = { ...DEFAULT_METRONOME, ...raw }
  return {
    ...s,
    tempo: clampBpm(Number(s.tempo) || DEFAULT_METRONOME.tempo),
    meter: METERS.includes(s.meter) ? s.meter : DEFAULT_METRONOME.meter,
    customBeats: Math.min(MAX_CUSTOM_BEATS, Math.max(1, Math.round(Number(s.customBeats) || 4))),
    customUnit: CUSTOM_UNITS.includes(s.customUnit) ? s.customUnit : 4,
    customGrouping: typeof s.customGrouping === 'string' ? s.customGrouping.slice(0, 64) : '',
    compoundUnit: s.compoundUnit === 'eighth' ? 'eighth' : 'dotted',
    grouping7: GROUPINGS_7.includes(s.grouping7) ? s.grouping7 : DEFAULT_METRONOME.grouping7,
    subdivision: allowedSubdivisions('quarter').includes(s.subdivision) ? s.subdivision : 'none',
    swing: Math.min(0.75, Math.max(0.5, Number(s.swing) || DEFAULT_METRONOME.swing)),
    subVolume: Math.min(1, Math.max(0, Number(s.subVolume ?? DEFAULT_METRONOME.subVolume))),
    visualOnly: Boolean(s.visualOnly),
    accents: Array.isArray(s.accents) && s.accents.every((a) => BEAT_LEVELS.includes(a)) ? s.accents : null,
    trainer: { ...DEFAULT_METRONOME.trainer, ...s.trainer },
    gap: { ...DEFAULT_METRONOME.gap, ...s.gap },
    timer: { ...DEFAULT_METRONOME.timer, ...s.timer },
  }
}

/** How the BPM is counted: quarter notes, dotted quarters, or eighths. Decides which subdivisions make sense. */
export type PulseKind = 'quarter' | 'dotted' | 'eighth'

export interface MeterLayout {
  pulses: number
  kind: PulseKind
  /** Group sizes (summing to `pulses`); the first pulse of each group gets a medium accent by default. */
  groups: number[]
}

/** Parses a grouping like "3+2+2" that must add up to `beats`; null when empty or wrong. */
export function parseGrouping(text: string, beats: number): number[] | null {
  const parts = text.split('+').map((x) => x.trim())
  if (!text.trim() || parts.some((x) => !/^\d+$/.test(x))) return null
  const groups = parts.map(Number)
  return groups.every((g) => g > 0) && groups.reduce((a, b) => a + b, 0) === beats ? groups : null
}

/** Custom meters with an eighth (or shorter) beat and a multiple of 3 beats are compound: groups of 3 (9/16 = 3+3+3). */
export function defaultCustomGroups(beats: number, unit: CustomUnit): number[] {
  return unit >= 8 && beats > 3 && beats % 3 === 0 ? Array<number>(beats / 3).fill(3) : [beats]
}

export function meterLayout(s: Pick<MetronomeSettings, 'meter' | 'customBeats' | 'customUnit' | 'customGrouping' | 'compoundUnit' | 'grouping7'>): MeterLayout {
  switch (s.meter) {
    case 'custom': {
      // Every beat dot is one lower-number note; the pulse can be split like a quarter note (in 2, 3, 4 or swung).
      const groups = parseGrouping(s.customGrouping, s.customBeats) ?? defaultCustomGroups(s.customBeats, s.customUnit)
      return { pulses: s.customBeats, kind: 'quarter', groups }
    }
    case '7/8': {
      const groups = s.grouping7.split('+').map(Number)
      return { pulses: 7, kind: 'eighth', groups }
    }
    case '6/8':
    case '9/8':
    case '12/8': {
      const dotted = Number(s.meter.split('/')[0]) / 3
      return s.compoundUnit === 'dotted'
        ? { pulses: dotted, kind: 'dotted', groups: [dotted] }
        : { pulses: dotted * 3, kind: 'eighth', groups: Array<number>(dotted).fill(3) }
    }
    default: {
      const n = Number(s.meter.split('/')[0])
      return { pulses: n, kind: 'quarter', groups: [n] }
    }
  }
}

/** Default accents: strong on beat 1, medium on the start of every other group, normal elsewhere. */
export function defaultAccents(layout: MeterLayout): BeatLevel[] {
  const levels = Array<BeatLevel>(layout.pulses).fill('normal')
  let at = 0
  for (const g of layout.groups) {
    levels[at] = at === 0 ? 'strong' : 'medium'
    at += g
  }
  return levels
}

export function beatLevels(s: MetronomeSettings): BeatLevel[] {
  const layout = meterLayout(s)
  return s.accents && s.accents.length === layout.pulses ? s.accents : defaultAccents(layout)
}

export function nextLevel(level: BeatLevel): BeatLevel {
  return BEAT_LEVELS[(BEAT_LEVELS.indexOf(level) + 1) % BEAT_LEVELS.length]
}

/** The subdivisions that make sense for how the beat is counted. */
export function allowedSubdivisions(kind: PulseKind): Subdivision[] {
  if (kind === 'quarter') return ['none', 'eighths', 'triplets', 'sixteenths', 'swing']
  if (kind === 'dotted') return ['none', 'eighths', 'sixteenths']
  return ['none', 'eighths']
}

/** Offsets (fractions of a pulse) of the clicks inside one pulse, the first always 0. */
export function pulseOffsets(kind: PulseKind, sub: Subdivision, swing: number): number[] {
  if (!allowedSubdivisions(kind).includes(sub) || sub === 'none') return [0]
  if (sub === 'swing') return [0, swing]
  // A dotted quarter holds 3 eighths / 6 sixteenths; an eighth pulse splits into 2 sixteenths.
  const count = kind === 'dotted' ? (sub === 'eighths' ? 3 : 6) : kind === 'eighth' ? 2 : { eighths: 2, triplets: 3, sixteenths: 4 }[sub]
  return Array.from({ length: count }, (_, i) => i / count)
}

export type ClickLevel = BeatLevel | 'sub'

export interface ClickEvent {
  /** Position from the start of the bar, in pulses. */
  at: number
  pulse: number
  level: ClickLevel
}

/** Every click of one bar (silent beats included, so the screen can still mark them). */
export function barEvents(s: MetronomeSettings): ClickEvent[] {
  const layout = meterLayout(s)
  const levels = beatLevels(s)
  const offsets = pulseOffsets(layout.kind, s.subdivision, s.swing)
  const events: ClickEvent[] = []
  for (let p = 0; p < layout.pulses; p++) {
    offsets.forEach((o, i) => events.push({ at: p + o, pulse: p, level: i === 0 ? levels[p] : 'sub' }))
  }
  return events
}

/** Tempo for a bar while the speed trainer runs (`bar` from 0, `elapsed` seconds since start); never passes the target. */
export function trainerTempo(t: SpeedTrainer, bar: number, elapsed: number): number {
  const start = clampBpm(t.start)
  const target = clampBpm(t.target)
  const every = Math.max(1, t.every)
  const steps = Math.floor((t.unit === 'bars' ? bar : elapsed) / every)
  if (target >= start) return Math.min(target, start + steps * Math.abs(t.step))
  return Math.max(target, start - steps * Math.abs(t.step))
}

/** Whether bar `bar` (from 0) is silent in the gap trainer. */
export function isMutedBar(g: GapTrainer, bar: number): boolean {
  if (!g.on || g.mute <= 0) return false
  const play = Math.max(1, g.play)
  return bar % (play + g.mute) >= play
}

/** Taps further apart than this start a new measurement. */
export const TAP_RESET_MS = 2000

/**
 * BPM from tap times (ms): uses the last 4 intervals, drops those more than 30% away from their median,
 * and averages the rest. Null until there are two taps.
 */
export function tapTempo(taps: number[]): number | null {
  const recent = taps.slice(-5)
  if (recent.length < 2) return null
  const intervals = recent.slice(1).map((t, i) => t - recent[i])
  const sorted = [...intervals].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const kept = intervals.filter((d) => Math.abs(d - median) <= median * 0.3)
  const avg = kept.reduce((a, b) => a + b, 0) / kept.length
  return clampBpm(60000 / avg)
}

/** Adds a tap, starting over after a pause. */
export function addTap(taps: number[], now: number): number[] {
  const last = taps[taps.length - 1]
  return last !== undefined && now - last <= TAP_RESET_MS ? [...taps.slice(-4), now] : [now]
}

export type TempoName = 'grave' | 'largo' | 'larghetto' | 'adagio' | 'andante' | 'moderato' | 'allegro' | 'vivace' | 'presto' | 'prestissimo'

const TEMPO_NAMES: [number, TempoName][] = [
  [40, 'grave'],
  [60, 'largo'],
  [66, 'larghetto'],
  [76, 'adagio'],
  [108, 'andante'],
  [120, 'moderato'],
  [156, 'allegro'],
  [176, 'vivace'],
  [200, 'presto'],
]

/** The traditional Italian tempo marking for a BPM (approximate ranges, as on mechanical metronomes). */
export function tempoName(bpm: number): TempoName {
  return TEMPO_NAMES.find(([upTo]) => bpm < upTo)?.[1] ?? 'prestissimo'
}

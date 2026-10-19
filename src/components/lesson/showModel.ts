import { Interval, Note } from 'tonal'
import { arpeggioThenChord, chordEvents, sequenceEvents, type PlayEvent } from '../../audio/events'
import { PLAY_RANGE, type InstrumentId } from '../../audio/instruments'
import type { Locale } from '../../i18n/locale'
import {
  chordFromRoot,
  chroma,
  intervalLabel,
  makeHighlights,
  midi,
  parsePositions,
  parseShape,
  positionMidi,
  rootMidiAtOrAbove,
  scaleFromRoot,
  scaleRun,
  stackIntervals,
  tuning,
  type HighlightMap,
  type LabelMode,
  type StringFret,
} from '../../theory'

export type PlayMode = 'run' | 'arp' | 'chord' | 'sequence' | 'none'

/** Props describing "what to show" — used directly in MDX. */
export interface ShowSpec {
  /** Root, e.g. "C", "F#", "Bb". */
  root?: string
  /** Scale type (id in SCALE_TYPES), requires `root`. */
  scale?: string
  /** Chord type (id in CHORD_TYPES), requires `root`. */
  chord?: string
  /** Space-separated notes; with octave numbers ("C4 E4 G4") piano highlights exactly those keys. */
  notes?: string
  /** Guitar shape from string 6 → 1: "x32010" or "8,10,10,9,8,8". */
  shape?: string
  /** Guitar positions "string:fret": "6:3 5:2". */
  positions?: string
  labels?: LabelMode
  play?: PlayMode
}

export interface ShowModel {
  notes: string[]
  labels: string[]
  highlights: HighlightMap
  only?: StringFret[]
  onlyMidis?: ReadonlySet<number>
  events: PlayEvent[]
}

const STANDARD = tuning('standard')

/** Stacks notes (without octaves) upward one after another, starting from `low`. */
export function ascendingMidis(notes: string[], low: number): number[] {
  const out: number[] = []
  for (const n of notes) {
    const start = out.length ? out[out.length - 1] + 1 : low
    out.push(rootMidiAtOrAbove(chroma(n), start))
  }
  return out
}

export function buildShow(spec: ShowSpec, instrument: InstrumentId, locale: Locale = 'vi'): ShowModel {
  const range = PLAY_RANGE[instrument]
  const labelMode = spec.labels ?? 'note'
  let notes: string[]
  let intervals: string[]
  let midis: number[]
  let onlyMidis: ReadonlySet<number> | undefined
  let defaultPlay: PlayMode

  if (spec.scale || spec.chord) {
    if (!spec.root) throw new Error('<Show> needs `root` when using `scale` or `chord`')
    const info = spec.scale ? scaleFromRoot(spec.root, spec.scale) : chordFromRoot(spec.root, spec.chord!)
    notes = info.notes
    intervals = info.intervals
    if (spec.scale) {
      midis = scaleRun(rootMidiAtOrAbove(chroma(spec.root), range.scale), intervals)
      defaultPlay = 'run'
    } else {
      midis = stackIntervals(rootMidiAtOrAbove(chroma(spec.root), range.chord), intervals)
      defaultPlay = 'arp'
    }
  } else if (spec.notes) {
    const raw = spec.notes.trim().split(/\s+/)
    const withOctave = raw.every((n) => Note.get(n).oct !== undefined)
    notes = raw.map((n) => Note.pitchClass(n))
    intervals = notes.map((n) => Interval.distance(notes[0], n))
    if (withOctave) {
      midis = raw.map(midi)
      onlyMidis = new Set(midis)
    } else {
      midis = ascendingMidis(notes, range.scale)
    }
    defaultPlay = 'sequence'
  } else {
    throw new Error('<Show> needs `scale`, `chord` or `notes`')
  }

  // Shapes / positions only apply to guitar; on piano the notes built above are still played.
  let only: StringFret[] | undefined
  if (spec.shape) {
    only = parseShape(spec.shape)
    if (instrument === 'guitar') midis = only.map((p) => positionMidi(STANDARD, p)).sort((a, b) => a - b)
    defaultPlay = 'chord'
  } else if (spec.positions) {
    only = parsePositions(spec.positions)
    if (instrument === 'guitar') midis = only.map((p) => positionMidi(STANDARD, p))
    defaultPlay = 'sequence'
  }

  const labels = intervals.map(intervalLabel)
  const roll = instrument === 'guitar' ? 0.035 : 0
  const play = spec.play ?? defaultPlay
  const events: PlayEvent[] =
    play === 'none'
      ? []
      : play === 'run'
        ? sequenceEvents([...midis, ...midis.slice(0, -1).reverse()], 0.28)
        : play === 'arp'
          ? arpeggioThenChord(midis, 0.3, roll)
          : play === 'chord'
            ? chordEvents(midis, roll)
            : sequenceEvents(midis, 0.4)

  return { notes, labels, highlights: makeHighlights(notes, labels, labelMode, locale), only, onlyMidis, events }
}

/** Piano key range wide enough for the highlighted keys, at least C3–B4, always starting on C and ending on B. */
export function pianoRangeFor(midis?: ReadonlySet<number>): [number, number] {
  let lo = 48
  let hi = 71
  for (const m of midis ?? []) {
    lo = Math.min(lo, m - (m % 12))
    hi = Math.max(hi, m - (m % 12) + 11)
  }
  return [lo, hi]
}

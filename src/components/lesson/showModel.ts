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

/** Thuộc tính mô tả "cần hiển thị gì" — dùng trực tiếp trong MDX. */
export interface ShowSpec {
  /** Chủ âm, ví dụ "C", "F#", "Bb". */
  root?: string
  /** Loại scale (id trong SCALE_TYPES), cần `root`. */
  scale?: string
  /** Loại hợp âm (id trong CHORD_TYPES), cần `root`. */
  chord?: string
  /** Danh sách nốt cách nhau bởi khoảng trắng; có số quãng tám ("C4 E4 G4") thì piano chỉ tô đúng các phím đó. */
  notes?: string
  /** Thế bấm guitar từ dây 6 → 1: "x32010" hoặc "8,10,10,9,8,8". */
  shape?: string
  /** Vị trí guitar "dây:phím": "6:3 5:2". */
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

/** Xếp các nốt (không có quãng tám) đi lên liên tiếp, bắt đầu từ `low`. */
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
    if (!spec.root) throw new Error('<Show> cần `root` khi dùng `scale` hoặc `chord`')
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
    throw new Error('<Show> cần `scale`, `chord` hoặc `notes`')
  }

  // Thế bấm / vị trí chỉ áp dụng cho guitar; trên piano vẫn phát các nốt đã dựng ở trên.
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

/** Khoảng phím piano đủ chứa các phím cần tô, tối thiểu C3–B4, luôn bắt đầu ở C và kết thúc ở B. */
export function pianoRangeFor(midis?: ReadonlySet<number>): [number, number] {
  let lo = 48
  let hi = 71
  for (const m of midis ?? []) {
    lo = Math.min(lo, m - (m % 12))
    hi = Math.max(hi, m - (m % 12) + 11)
  }
  return [lo, hi]
}

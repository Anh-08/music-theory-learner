import { Note } from 'tonal'
import { tuning as getTuning, type Tuning } from './fretboard'
import { keySignature } from './keys'
import { midi as noteMidi } from './notes'
import { keyScale, parseKey, type KeyRef } from './progression'

/**
 * Data model of the sheet & tab editor (Phase 10). Pure data and helpers: no React, no Tone.js.
 *
 * Time is counted in ticks: a quarter note is `TICKS_PER_QUARTER` ticks, chosen so that every duration,
 * dotted value and triplet down to a 32nd is a whole number of ticks.
 */

export const TICKS_PER_QUARTER = 480

export type Duration = 'w' | 'h' | 'q' | '8' | '16' | '32'
export const DURATIONS: Duration[] = ['w', 'h', 'q', '8', '16', '32']

const BASE_TICKS: Record<Duration, number> = {
  w: TICKS_PER_QUARTER * 4,
  h: TICKS_PER_QUARTER * 2,
  q: TICKS_PER_QUARTER,
  '8': TICKS_PER_QUARTER / 2,
  '16': TICKS_PER_QUARTER / 4,
  '32': TICKS_PER_QUARTER / 8,
}

export type Technique =
  | 'hammer' // hammer-on to the next note on this string
  | 'pull' // pull-off to the next note on this string
  | 'slide' // slide to the next note on this string
  | 'bendHalf'
  | 'bendFull'
  | 'vibrato'
  | 'palmMute'
  | 'dead' // muted "x" note
  | 'letRing'
  | 'harmonic' // natural harmonic
export const TECHNIQUES: Technique[] = ['hammer', 'pull', 'slide', 'bendHalf', 'bendFull', 'vibrato', 'palmMute', 'dead', 'letRing', 'harmonic']

export interface ScoreNote {
  /** Sounding pitch (capo included). */
  midi: number
  /** String number as guitarists count it: 1 is the highest string. The fret is derived. */
  string: number
  tech?: Technique[]
}

export interface ScoreEvent {
  duration: Duration
  dots: 0 | 1 | 2
  /** 3 = triplet (three in the time of two). */
  tuplet?: 3
  rest?: boolean
  /** Every note of this event is tied to the same pitch in the next event. */
  tieToNext?: boolean
  /** Several notes = a chord or double stop. Empty for rests. */
  notes: ScoreNote[]
}

export interface ChordMark {
  /** Position inside the bar, in ticks from the bar start. */
  tick: number
  symbol: string
}

export interface Measure {
  events: ScoreEvent[]
  chords?: ChordMark[]
  repeatStart?: boolean
  /** Repeat back to the last repeat start; `times` = total passes (default 2). */
  repeatEnd?: { times: number }
  /** Volta brackets: this bar is played only on the listed passes (1st / 2nd ending). */
  ending?: number[]
}

export interface Score {
  version: 1
  id: string
  title: string
  tempo: number
  /** [beats, beat unit], e.g. [4, 4], [6, 8]. */
  timeSig: [number, number]
  /** Key name as `parseKey` reads it: "C", "G", "Em", "Bb". */
  keySig: string
  /** Tuning id from `TUNINGS`. */
  tuning: string
  capo: number
  measures: Measure[]
}

/** Highest fret the editor allows. */
export const MAX_FRET = 24

export function newScore(id: string, init: Partial<Omit<Score, 'version' | 'id'>> = {}): Score {
  return {
    version: 1,
    id,
    title: init.title ?? '',
    tempo: init.tempo ?? 90,
    timeSig: init.timeSig ?? [4, 4],
    keySig: init.keySig ?? 'C',
    tuning: init.tuning ?? 'standard',
    capo: init.capo ?? 0,
    measures: init.measures ?? Array.from({ length: 4 }, () => ({ events: [] })),
  }
}

// ---------------------------------------------------------------------------------------------
// Durations

export function eventTicks(e: Pick<ScoreEvent, 'duration' | 'dots' | 'tuplet'>): number {
  const base = BASE_TICKS[e.duration]
  const dotted = e.dots === 2 ? base * 1.75 : e.dots === 1 ? base * 1.5 : base
  return e.tuplet === 3 ? (dotted * 2) / 3 : dotted
}

/** Length of one bar in ticks. */
export function measureCapacity(timeSig: [number, number]): number {
  const [beats, unit] = timeSig
  return (beats * TICKS_PER_QUARTER * 4) / unit
}

export function measureTicks(m: Measure): number {
  return m.events.reduce((sum, e) => sum + eventTicks(e), 0)
}

export type FillState = 'empty' | 'short' | 'full' | 'over'

export function measureFill(m: Measure, timeSig: [number, number]): FillState {
  const used = measureTicks(m)
  if (m.events.length === 0) return 'empty'
  const cap = measureCapacity(timeSig)
  return used === cap ? 'full' : used < cap ? 'short' : 'over'
}

/** Start tick of every event in the bar. */
export function eventStarts(m: Measure): number[] {
  const out: number[] = []
  let t = 0
  for (const e of m.events) {
    out.push(t)
    t += eventTicks(e)
  }
  return out
}

type DurationValue = Pick<ScoreEvent, 'duration' | 'dots' | 'tuplet'>

const PLAIN_VALUES: DurationValue[] = DURATIONS.flatMap((duration) => [
  { duration, dots: 1 as const },
  { duration, dots: 0 as const },
]).sort((a, b) => eventTicks(b) - eventTicks(a))

const TRIPLET_VALUES: DurationValue[] = DURATIONS.map((duration) => ({ duration, dots: 0 as const, tuplet: 3 as const }))

/**
 * Splits a length in ticks into written values, longest first (used for padding rests and for notes split
 * across a bar line). Plain and dotted values are tried first, triplets only for what is left.
 * Returns null when the length cannot be written exactly.
 */
export function ticksToDurations(ticks: number): DurationValue[] | null {
  // Plain values first; if that leaves an unwritable remainder, try triplets first instead (e.g. a quarter triplet).
  for (const pools of [[PLAIN_VALUES, TRIPLET_VALUES], [TRIPLET_VALUES, PLAIN_VALUES]]) {
    const out: DurationValue[] = []
    let left = ticks
    for (const pool of pools) {
      for (const v of pool) {
        const t = eventTicks(v)
        while (left >= t) {
          out.push(v)
          left -= t
        }
      }
    }
    if (left === 0) return out.sort((a, b) => eventTicks(b) - eventTicks(a))
  }
  return null
}

// ---------------------------------------------------------------------------------------------
// Pitch and frets

export function scoreTuning(score: Pick<Score, 'tuning'>): Tuning {
  return getTuning(score.tuning)
}

/** Sounding pitch of an open string (capo included). */
export function openStringMidi(t: Tuning, capo: number, string: number): number {
  const open = t.strings[t.strings.length - string]
  if (!open) throw new Error(`Tuning has no string ${string}`)
  return noteMidi(open) + capo
}

/** Fret written in the tab (relative to the capo); may be out of range if the note is unplayable. */
export function fretOf(score: Pick<Score, 'tuning' | 'capo'>, note: Pick<ScoreNote, 'midi' | 'string'>): number {
  return note.midi - openStringMidi(scoreTuning(score), score.capo, note.string)
}

export function midiAt(score: Pick<Score, 'tuning' | 'capo'>, string: number, fret: number): number {
  return openStringMidi(scoreTuning(score), score.capo, string) + fret
}

export function isPlayable(score: Pick<Score, 'tuning' | 'capo'>, note: Pick<ScoreNote, 'midi' | 'string'>): boolean {
  const f = fretOf(score, note)
  return f >= 0 && f <= MAX_FRET - score.capo
}

/**
 * Picks a string for a pitch that arrived without one (piano, MIDI, mic, transpose):
 * the playable position whose fret is closest to `nearFret` (default: open position), avoiding `taken` strings.
 * Ties prefer the lower fret, then the higher string. Null if no free string can play it.
 */
export function chooseString(
  score: Pick<Score, 'tuning' | 'capo'>,
  m: number,
  options: { nearFret?: number; taken?: number[] } = {},
): number | null {
  const t = scoreTuning(score)
  const near = options.nearFret ?? 2
  let best: { string: number; fret: number; dist: number } | null = null
  for (let s = 1; s <= t.strings.length; s++) {
    if (options.taken?.includes(s)) continue
    const fret = fretOf(score, { midi: m, string: s })
    if (fret < 0 || fret > MAX_FRET - score.capo) continue
    const dist = Math.abs(fret - near)
    if (!best || dist < best.dist || (dist === best.dist && (fret < best.fret || (fret === best.fret && s < best.string)))) {
      best = { string: s, fret, dist }
    }
  }
  return best?.string ?? null
}

/** The key as a `KeyRef`; falls back to C major on a bad value. */
export function scoreKey(score: Pick<Score, 'keySig'>): KeyRef {
  try {
    return parseKey(score.keySig)
  } catch {
    return { tonic: 'C', mode: 'major' }
  }
}

/** Whether accidentals outside the key are written as flats (flat keys) or sharps. */
export function prefersFlats(key: KeyRef): boolean {
  return keySignature(key).flats.length > 0
}

/**
 * Note name with octave, spelled for the key: in F major midi 70 is "Bb4", in E major midi 68 is "G#4".
 * Notes outside the key use sharps, or flats in flat keys. Octaves follow the written letter
 * (B#3 and C4 are the same pitch).
 */
export function spellMidi(m: number, key: KeyRef): string {
  const pc = ((m % 12) + 12) % 12
  const inKey = keyScale(key).find((n) => Note.chroma(n) === pc)
  // In minor keys the raised 6th and 7th (melodic / harmonic minor) keep their letter: C# in D minor, not Db.
  const raised = key.mode === 'minor' ? ['6M', '7M'].map((i) => Note.transpose(key.tonic, i)).find((n) => Note.chroma(n) === pc) : undefined
  const name = inKey ?? raised ?? Note.pitchClass(prefersFlats(key) ? Note.fromMidi(m) : Note.fromMidiSharps(m))
  // The octave of a spelling like Cb or B# differs from the octave of the pitch; find the one that matches.
  const guess = Math.floor(m / 12) - 1
  for (const oct of [guess, guess + 1, guess - 1]) {
    if (Note.midi(`${name}${oct}`) === m) return `${name}${oct}`
  }
  return Note.fromMidi(m)
}

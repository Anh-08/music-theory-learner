import type { Locale } from '../i18n/locale'
import { fretboardPositions, type FretPosition, type StringFret, type Tuning } from './fretboard'
import { displayNote, spellingsOf, type Chroma } from './notes'

/**
 * Targets for the fretboard note reflex drill: "play F♯ on string 3, frets 0–11", "find every G from fret 0 to 12"…
 * By default a target is located by neck zone: on one string a note name repeats every 12 frets, so within
 * a zone (frets 0–11 or 12 up to the last fret, at most 23) it has exactly one position. Advanced mode uses octave
 * names (E2, E3) instead. The neck length is configurable (a Taylor 214ce has 20 frets), even per string.
 */

/**
 * - `string`: one string (the caller picks it, or rotates through the strings).
 * - `noteString`: note name + a random string among the enabled ones.
 * - `findAll`: every position of a note name from fret 0 to 12 on the enabled strings.
 * - `pitch`: every position of one exact pitch (advanced mode).
 * - `box`: every position of a note name inside a small fret window.
 */
export type FretMode = 'string' | 'noteString' | 'findAll' | 'pitch' | 'box'
export type FretZone = 0 | 1

/** Default last fret (most electric and acoustic necks have 20–22 frets). */
export const NECK_FRETS = 22
/** Range accepted for the number of frets on the user's neck. */
export const MIN_NECK_FRETS = 12
export const MAX_NECK_FRETS = 24
/** Last fret of the upper zone: fret 24 would repeat fret 12 inside the zone. */
const ZONE_LAST = 23
/** "Find all" covers the first 12 frets: past fret 12 the neck repeats. */
export const FIND_ALL_FRETS = 12
/** Width of a position box, in frets. */
export const BOX_WIDTH = 5

export interface TargetOptions {
  mode: FretMode
  tuning: Tuning
  /** Enabled strings (1 = highest). In `string` mode, the one string being practised. */
  strings: number[]
  /** Level 1: always this zone. Undefined / null: a random zone each round (level 2). */
  zone?: FretZone | null
  /** Octave names (E2, E3) instead of zones; required by `pitch` mode. */
  advanced?: boolean
  /** `box` mode: first fret of the window. */
  boxStart?: number
  /** Only natural notes (no sharps / flats) — an easier start. */
  naturalsOnly?: boolean
  /** Number of frets on the neck (default `NECK_FRETS`). */
  neckFrets?: number
  /** Per-string override of `neckFrets` (string number → last fret), for necks where strings have different fret counts. */
  stringFrets?: Partial<Record<number, number>>
}

export interface FretTarget {
  mode: FretMode
  chroma: Chroma
  /** Spelling to show: "F#" or "Gb" (both are asked, so both get learned). */
  name: string
  /** Exact pitch, when the prompt uses an octave name. */
  midi: number | null
  /** The string to play on (single-position modes), null when several strings are searched. */
  string: number | null
  /** Fret range searched (the zone shown on the mini fretboard). */
  frets: [number, number]
  /** Strings searched. */
  strings: number[]
  /** Every accepted position; the round is complete when all have been found. */
  answers: FretPosition[]
}

export type AnswerResult = 'hit' | 'again' | 'miss'

const NATURALS = new Set([0, 2, 4, 5, 7, 9, 11])

export function zoneOf(fret: number): FretZone {
  return fret < 12 ? 0 : 1
}

export function clampFrets(n: number): number {
  return Math.max(MIN_NECK_FRETS, Math.min(MAX_NECK_FRETS, Math.round(n) || NECK_FRETS))
}

/** Last fret of a string on the configured neck. */
export function lastFret(opts: Pick<TargetOptions, 'neckFrets' | 'stringFrets'>, string: number): number {
  return clampFrets(opts.stringFrets?.[string] ?? opts.neckFrets ?? NECK_FRETS)
}

/** Last fret of the longest of `strings`. */
export function neckEnd(opts: Pick<TargetOptions, 'neckFrets' | 'stringFrets'>, strings: number[]): number {
  return Math.max(...strings.map((s) => lastFret(opts, s)), MIN_NECK_FRETS)
}

/** Frets of a zone on a neck whose last fret is `last`. */
export function zoneFrets(zone: FretZone, last: number = NECK_FRETS): [number, number] {
  return zone === 0 ? [0, 11] : [12, Math.min(last, ZONE_LAST)]
}

/** Progress key of a position in the review schedule: `note-pos:<string>:<fret>`. */
export function positionKey(p: StringFret): string {
  return `note-pos:${p.string}:${p.fret}`
}

export function samePosition(a: StringFret, b: StringFret): boolean {
  return a.string === b.string && a.fret === b.fret
}

function isSingle(mode: FretMode): boolean {
  return mode === 'string' || mode === 'noteString'
}

/** Fret range the targets are drawn from. */
export function modeFrets(opts: TargetOptions): [number, number] {
  const end = neckEnd(opts, opts.strings)
  if (opts.mode === 'findAll') return [0, FIND_ALL_FRETS]
  if (opts.mode === 'box') {
    const start = Math.max(0, Math.min(end - BOX_WIDTH + 1, opts.boxStart ?? 5))
    return [start, start + BOX_WIDTH - 1]
  }
  if (isSingle(opts.mode) && !opts.advanced) return opts.zone != null ? zoneFrets(opts.zone, end) : [0, Math.min(end, ZONE_LAST)]
  return [0, end]
}

/** Positions a target can be drawn from (`pitch` mode keeps only pitches playable in at least two places). */
export function candidatePositions(opts: TargetOptions): FretPosition[] {
  const [from, to] = modeFrets(opts)
  const strings = new Set(opts.strings)
  const all = fretboardPositions(opts.tuning, to).filter(
    (p) => p.fret >= from && strings.has(p.string) && p.fret <= lastFret(opts, p.string) && (!opts.naturalsOnly || NATURALS.has(p.chroma)),
  )
  if (opts.mode !== 'pitch') return all
  const shared = all.filter((p) => all.some((q) => q.midi === p.midi && q.string !== p.string))
  return shared.length ? shared : all
}

/** Builds the target that contains `position` (the position drawn decides the note, string and zone). */
export function targetFor(position: FretPosition, opts: TargetOptions, random: () => number = Math.random): FretTarget {
  const spellings = spellingsOf(position.chroma)
  const name = spellings[Math.floor(random() * spellings.length)] ?? spellings[0]
  const pool = candidatePositions(opts)
  if (isSingle(opts.mode)) {
    return {
      mode: opts.mode,
      chroma: position.chroma,
      name,
      midi: opts.advanced ? position.midi : null,
      string: position.string,
      frets: opts.advanced ? [0, lastFret(opts, position.string)] : zoneFrets(zoneOf(position.fret), lastFret(opts, position.string)),
      strings: [position.string],
      answers: [position],
    }
  }
  const byPitch = opts.mode === 'pitch'
  return {
    mode: opts.mode,
    chroma: position.chroma,
    name,
    midi: byPitch ? position.midi : null,
    string: null,
    frets: modeFrets(opts),
    strings: [...opts.strings].sort((a, b) => a - b),
    answers: pool.filter((p) => (byPitch ? p.midi === position.midi : p.chroma === position.chroma)),
  }
}

/**
 * How often a position should come up, from its review card: unseen positions are asked fairly often, positions
 * that went wrong recently (box 0) most often, well-known ones rarely; overdue cards get a boost.
 */
export function weaknessWeight(card: { box: number; due: number } | undefined, now: number): number {
  if (!card) return 2
  const base = card.box === 0 ? 5 : Math.max(0.4, 3 - card.box * 0.5)
  return card.due <= now ? base * 1.5 : base
}

function weightedPick<T>(items: T[], weight: (x: T) => number, random: () => number): T {
  const weights = items.map((x) => Math.max(0, weight(x)))
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return items[Math.floor(random() * items.length)]
  let r = random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r < 0) return items[i]
  }
  return items[items.length - 1]
}

export interface PickContext {
  /** Weight of each position (default: all equal). */
  weight?: (p: FretPosition) => number
  random?: () => number
  /** The previous target: avoid asking the same note (on the same string) twice in a row. */
  avoid?: FretTarget | null
}

/** Draws the next target, weighting positions by `weight` (e.g. `weaknessWeight` of their review card). */
export function pickTarget(opts: TargetOptions, { weight = () => 1, random = Math.random, avoid }: PickContext = {}): FretTarget {
  const all = candidatePositions(opts)
  if (!all.length) throw new Error('No positions match the drill settings')
  const repeats = (p: FretPosition) => !!avoid && p.chroma === avoid.chroma && (avoid.string === null || avoid.string === p.string)
  const fresh = all.filter((p) => !repeats(p))
  return targetFor(weightedPick(fresh.length ? fresh : all, weight, random), opts, random)
}

/** Answer by clicking the virtual fretboard (exact string and fret). */
export function checkPosition(target: FretTarget, found: ReadonlyArray<StringFret>, p: StringFret): AnswerResult {
  if (found.some((f) => samePosition(f, p))) return 'again'
  return target.answers.some((a) => samePosition(a, p)) ? 'hit' : 'miss'
}

/**
 * Answer by playing a real instrument (mic / MIDI): the pitch is known but not the string, so every answer with
 * that pitch counts as found (in "find all", the app counts the distinct pitches heard).
 */
export function checkPitch(target: FretTarget, found: ReadonlyArray<StringFret>, midi: number): { result: AnswerResult; positions: FretPosition[] } {
  const matches = target.answers.filter((a) => a.midi === midi)
  if (!matches.length) return { result: 'miss', positions: [] }
  const fresh = matches.filter((a) => !found.some((f) => samePosition(f, a)))
  return fresh.length ? { result: 'hit', positions: fresh } : { result: 'again', positions: [] }
}

export function isComplete(target: FretTarget, found: ReadonlyArray<StringFret>): boolean {
  return target.answers.every((a) => found.some((f) => samePosition(f, a)))
}

/** Scientific pitch name: open string 6 is E2, string 6 fret 12 is E3. */
export function pitchName(midi: number, name: string): string {
  return `${name}${Math.floor(midi / 12) - 1}`
}

const SOLFEGE_VI: Record<string, string> = { C: 'Đô', D: 'Rê', E: 'Mi', F: 'Fa', G: 'Son', A: 'La', B: 'Si' }

/** Octave name for display: "F♯3" in English, "Fa♯3 (F♯3)" in Vietnamese. */
export function octaveLabel(midi: number, name: string, locale: Locale): string {
  const letters = displayNote(name) + (Math.floor(midi / 12) - 1)
  if (locale === 'en') return letters
  return `${SOLFEGE_VI[name[0]]}${letters.slice(1)} (${letters})`
}

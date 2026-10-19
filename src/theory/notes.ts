import { Note } from 'tonal'
import type { Locale } from '../i18n/locale'

/** Semitones from C (0–11), independent of octave. */
export type Chroma = number

/** Two spellings for the 12 notes: with sharps and with flats. */
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const SOLFEGE: Record<Locale, string[]> = {
  vi: ['Đô', 'Đô♯', 'Rê', 'Rê♯', 'Mi', 'Fa', 'Fa♯', 'Son', 'Son♯', 'La', 'La♯', 'Si'],
  en: ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Ti'],
}

export const CHROMAS: Chroma[] = Array.from({ length: 12 }, (_, i) => i)

export function chroma(note: string): Chroma {
  const c = Note.chroma(note)
  if (c === undefined || Number.isNaN(c)) throw new Error(`Invalid note: ${note}`)
  return c
}

export function midi(note: string): number {
  const m = Note.midi(note)
  if (m === null) throw new Error(`Note has no pitch: ${note}`)
  return m
}

export function chromaOfMidi(m: number): Chroma {
  return ((m % 12) + 12) % 12
}

/** Possible spellings of a chroma (1 or 2 names). */
export function spellingsOf(c: Chroma): string[] {
  const sharp = SHARP_NAMES[c]
  const flat = FLAT_NAMES[c]
  return sharp === flat ? [sharp] : [sharp, flat]
}

export function noteFromMidi(m: number, preferFlats = false): string {
  return preferFlats ? Note.fromMidi(m) : Note.fromMidiSharps(m)
}

/** Number of accidentals in a note name (♭♭ counts as 2). */
export function accidentalCount(note: string): number {
  return Note.get(note).acc.length
}

/** Show ♯/♭ instead of #/b: "Bb" → "B♭". */
export function displayNote(note: string): string {
  const { letter, acc } = Note.get(note)
  if (!letter) return note
  return letter + acc.replace(/#/g, '♯').replace(/b/g, '♭')
}

export function rootLabel(c: Chroma): string {
  return spellingsOf(c).map(displayNote).join(' / ')
}

export function solfege(c: Chroma, locale: Locale = 'vi'): string {
  return SOLFEGE[locale][c]
}

/**
 * Picks the root spelling whose resulting notes have the fewest accidentals
 * (e.g. a key with 5 sharps on C♯ becomes D♭ major instead of C♯ major).
 * Ties prefer sharps.
 */
export function bestRootSpelling(c: Chroma, build: (root: string) => string[]): string {
  let best = spellingsOf(c)[0]
  let bestScore = Infinity
  for (const root of spellingsOf(c)) {
    const score = build(root).reduce((sum, n) => sum + accidentalCount(n), 0)
    if (score < bestScore) {
      best = root
      bestScore = score
    }
  }
  return best
}

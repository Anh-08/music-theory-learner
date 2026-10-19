import type { Locale } from '../../i18n/locale'
import { Interval, Note } from 'tonal'
import {
  accidentalCount,
  chroma,
  detectKey,
  displayNote,
  intervalLabel,
  makeHighlights,
  parseKey,
  parseProgression,
  romanNumeral,
  scaleFromRoot,
  scaleType,
  scaleTypeName,
  suggestScales,
  type HighlightMap,
  type KeyRef,
  type ProgressionChord,
  type ScaleSuggestion,
} from '../../theory'

const ROMAN_TOKEN = /(^|[\s|,–-])[b#♭♯]?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(?=[^a-z]|$)/

export function usesRomanNumerals(text: string): boolean {
  return ROMAN_TOKEN.test(text)
}

export interface Analysis {
  chords: ProgressionChord[]
  key: KeyRef
  romans: string[]
  suggestions: ScaleSuggestion[]
}

/**
 * Analyses the progression the user typed. `keyText` is a manually chosen key ("C", "Am") or null to auto-detect.
 * Roman numerals always need a key: without one, C major is assumed.
 */
export function analyze(text: string, keyText: string | null): Analysis {
  const chosen = keyText ? parseKey(keyText) : null
  const roman = usesRomanNumerals(text)
  const chords = parseProgression(text, chosen ?? { tonic: 'C', mode: 'major' })
  const key = chosen ?? (roman ? { tonic: 'C', mode: 'major' as const } : detectKey(chords))
  return { chords, key, romans: chords.map((c) => romanNumeral(c, key)), suggestions: suggestScales(chords, key) }
}

/** Tonic of the matching major key: a minor key maps to its relative major (Am → C). */
function majorTonic(key: KeyRef): string {
  return key.mode === 'major' ? key.tonic : Note.transpose(key.tonic, '3m')
}

function transposeNote(note: string, interval: string): string {
  const n = Note.transpose(note, interval)
  return accidentalCount(n) > 1 ? Note.simplify(n) : n
}

/**
 * Transposes a user-typed progression from key `from` to key `to`, keeping its formatting
 * (separators, "*2", "%"). Roman numerals are left as they are since they already follow the key. Across modes (major ↔ minor)
 * it transposes via the relative major, so C → Am keeps the same chords. Unrecognised symbols are left untouched.
 */
export function transposeProgression(text: string, from: KeyRef, to: KeyRef): string {
  const interval = Interval.distance(majorTonic(from), majorTonic(to))
  if (interval === '1P') return text
  return text
    .split(/([\s|,–-]+)/)
    .map((part) => {
      const m = part.match(/^([A-G][#b♯♭]?)(.*?)(?:\/([A-G][#b♯♭]?))?(\*\d+)?$/)
      if (!m) return part
      const [, root, suffix, bass, times = ''] = m
      const norm = (n: string) => n.replace(/♯/g, '#').replace(/♭/g, 'b')
      return transposeNote(norm(root), interval) + suffix + (bass ? `/${transposeNote(norm(bass), interval)}` : '') + times
    })
    .join('')
}

export function chordLabel(c: ProgressionChord): string {
  const suffix = c.suffix.replace(/b(\d)/g, '♭$1').replace(/#(\d)/g, '♯$1')
  return displayNote(c.root) + suffix + (c.bass ? `/${displayNote(c.bass)}` : '')
}

export function scaleLabel(s: { root: string; typeId: string }, locale: Locale = 'vi'): string {
  return `${displayNote(s.root)} ${scaleTypeName(scaleType(s.typeId), locale)}`
}

/** Index of the chord sounding at bar `bar`. */
export function chordIndexAtBar(chords: ProgressionChord[], bar: number): number {
  let acc = 0
  for (let i = 0; i < chords.length; i++) {
    acc += chords[i].bars
    if (bar < acc) return i
  }
  return chords.length - 1
}

/**
 * Jam highlights: the current chord's notes (regular colour, chord root in red)
 * plus the remaining notes of the selected scale (grey). Interval labels are measured from the chord root.
 */
export function jamHighlights(chord: ProgressionChord, scale: { root: string; typeId: string } | null, labels: 'note' | 'interval'): HighlightMap {
  const chordLabels = chord.intervals.map(intervalLabel)
  const map = makeHighlights(chord.notes, chordLabels, labels)
  if (!scale) return map
  for (const n of scaleFromRoot(scale.root, scale.typeId).notes) {
    const c = chroma(n)
    if (map.has(c)) continue
    const label = labels === 'note' ? displayNote(n) : intervalLabel(Interval.simplify(Interval.distance(chord.root, n)) || '1P')
    map.set(c, { label, isRoot: false, color: 'neutral' })
  }
  return map
}

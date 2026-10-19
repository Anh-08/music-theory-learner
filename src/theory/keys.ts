import { Interval } from 'tonal'
import { chordType } from './chords'
import { chordTypeId, keyScale, type KeyRef } from './progression'

export type ChordFunction = 'T' | 'S' | 'D'

export interface DiatonicChord {
  /** Degree 0–6. */
  degree: number
  /** Roman numeral: "ii", "V7", "viiø7"… */
  roman: string
  root: string
  /** Chord type id in CHORD_TYPES. */
  typeId: string
  symbol: string
  notes: string[]
  intervals: string[]
  function: ChordFunction
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

const MAJOR_FUNCTIONS: ChordFunction[] = ['T', 'S', 'T', 'S', 'D', 'T', 'D']
const MINOR_FUNCTIONS: ChordFunction[] = ['T', 'S', 'T', 'S', 'D', 'S', 'D']

const ROMAN_TAIL: Record<string, string> = { M: '', m: '', dim: '°', aug: '+', maj7: 'maj7', '7': '7', m7: '7', m7b5: 'ø7', dim7: '°7' }

/** The seven diatonic chords (triads or sevenths), built by stacking thirds within the key's scale. */
export function diatonicChords(key: KeyRef, sevenths = false): DiatonicChord[] {
  const scale = keyScale(key)
  return scale.map((root, degree) => {
    const notes = [0, 2, 4, ...(sevenths ? [6] : [])].map((k) => scale[(degree + k) % 7])
    const intervals = notes.map((n) => {
      const d = Interval.distance(root, n)
      return d === '1P' ? '1P' : Interval.simplify(d) || '1P'
    })
    const typeId = chordTypeId(intervals) ?? 'M'
    const minorish = intervals.includes('3m')
    const numeral = minorish ? ROMAN[degree].toLowerCase() : ROMAN[degree]
    return {
      degree,
      roman: numeral + (ROMAN_TAIL[typeId] ?? ''),
      root,
      typeId,
      symbol: root + chordType(typeId).suffix.replace('♭', 'b'),
      notes,
      intervals,
      function: (key.mode === 'major' ? MAJOR_FUNCTIONS : MINOR_FUNCTIONS)[degree],
    }
  })
}

export interface KeySignature {
  sharps: string[]
  flats: string[]
}

const SHARP_ORDER = ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#']
const FLAT_ORDER = ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb']

/** Key signature, in written order (F C G D A E B / B E A D G C F). */
export function keySignature(key: KeyRef): KeySignature {
  const notes = new Set(keyScale(key))
  return { sharps: SHARP_ORDER.filter((n) => notes.has(n)), flats: FLAT_ORDER.filter((n) => notes.has(n)) }
}

/** Relative key (same signature, different tonic) and parallel key (same tonic, major ↔ minor). */
export function relatedKeys(key: KeyRef): { relative: KeyRef; parallel: KeyRef } {
  const scale = keyScale(key)
  return {
    relative: key.mode === 'major' ? { tonic: scale[5], mode: 'minor' } : { tonic: scale[2], mode: 'major' },
    parallel: { tonic: key.tonic, mode: key.mode === 'major' ? 'minor' : 'major' },
  }
}

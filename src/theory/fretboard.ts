import type { Localized } from '../i18n/locale'
import { chromaOfMidi, midi, type Chroma } from './notes'

export interface Tuning {
  id: string
  name: Localized
  /** Open strings from the lowest (string 6) to the highest (string 1). */
  strings: string[]
}

export const TUNINGS: Tuning[] = [
  { id: 'standard', name: { vi: 'Standard (E A D G B E)', en: 'Standard (E A D G B E)' }, strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'half-down', name: { vi: 'Hạ nửa cung (E♭ A♭ D♭ G♭ B♭ E♭)', en: 'Half-step down (E♭ A♭ D♭ G♭ B♭ E♭)' }, strings: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'] },
  { id: 'drop-d', name: { vi: 'Drop D (D A D G B E)', en: 'Drop D (D A D G B E)' }, strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'dadgad', name: { vi: 'DADGAD', en: 'DADGAD' }, strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  { id: 'open-g', name: { vi: 'Open G (D G D G B D)', en: 'Open G (D G D G B D)' }, strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  // Other fretted instruments: only the string list changes.
  { id: 'bass4', name: { vi: 'Bass 4 dây (E A D G)', en: '4-string bass (E A D G)' }, strings: ['E1', 'A1', 'D2', 'G2'] },
  { id: 'bass5', name: { vi: 'Bass 5 dây (B E A D G)', en: '5-string bass (B E A D G)' }, strings: ['B0', 'E1', 'A1', 'D2', 'G2'] },
  { id: 'ukulele', name: { vi: 'Ukulele (G C E A)', en: 'Ukulele (G C E A)' }, strings: ['G4', 'C4', 'E4', 'A4'] },
  { id: 'baritone-uke', name: { vi: 'Ukulele baritone (D G B E)', en: 'Baritone ukulele (D G B E)' }, strings: ['D3', 'G3', 'B3', 'E4'] },
  { id: 'mandolin', name: { vi: 'Mandolin (G D A E)', en: 'Mandolin (G D A E)' }, strings: ['G3', 'D4', 'A4', 'E5'] },
]

export function tuning(id: string): Tuning {
  const t = TUNINGS.find((x) => x.id === id)
  if (!t) throw new Error(`Unknown tuning: ${id}`)
  return t
}

export interface FretPosition {
  /** String number as guitarists count it: 1 is the highest string. */
  string: number
  fret: number
  midi: number
  chroma: Chroma
}

/** Every position on the neck from fret 0 (open string) to `fretCount`. */
export function fretboardPositions(t: Tuning, fretCount: number): FretPosition[] {
  const total = t.strings.length
  return t.strings.flatMap((open, idx) => {
    const openMidi = midi(open)
    return Array.from({ length: fretCount + 1 }, (_, fret) => ({
      string: total - idx,
      fret,
      midi: openMidi + fret,
      chroma: chromaOfMidi(openMidi + fret),
    }))
  })
}

/**
 * Horizontal position (0–1) of each fret, using the real proportions of a fretboard
 * (each fret is shorter than the previous one by a factor of 2^(-1/12)), normalised to `fretCount` frets.
 */
export function fretX(fret: number, fretCount: number): number {
  const pos = (f: number) => 1 - 2 ** (-f / 12)
  return pos(fret) / pos(fretCount)
}

export const INLAY_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
export const DOUBLE_INLAY_FRETS = [12, 24]

export interface StringFret {
  string: number
  fret: number
}

/**
 * Parses a chord shape written from string 6 to string 1: "x32010" or (with frets ≥ 10) "8,10,10,9,8,8".
 * "x" marks a muted string.
 */
export function parseShape(shape: string): StringFret[] {
  const parts = shape.includes(',') ? shape.split(',') : shape.split('')
  if (parts.length !== 6) throw new Error(`A shape must have 6 strings: ${shape}`)
  return parts.flatMap((part, idx) => {
    const t = part.trim().toLowerCase()
    if (t === 'x') return []
    const fret = Number(t)
    if (!Number.isInteger(fret) || fret < 0) throw new Error(`Invalid fret in shape: ${shape}`)
    return [{ string: 6 - idx, fret }]
  })
}

/** Parses a space-separated list of "string:fret" positions: "6:3 5:2 5:3". */
export function parsePositions(text: string): StringFret[] {
  return text
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [s, f] = pair.split(':').map(Number)
      if (!Number.isInteger(s) || !Number.isInteger(f) || s < 1 || f < 0) throw new Error(`Invalid position: ${pair}`)
      return { string: s, fret: f }
    })
}

export function positionMidi(t: Tuning, p: StringFret): number {
  const open = t.strings[t.strings.length - p.string]
  if (!open) throw new Error(`Tuning has no string ${p.string}`)
  return midi(open) + p.fret
}

/**
 * Where to play a pitch on the neck (lowest fret). If that exact pitch is missing (mic heard the wrong octave…)
 * fall back to the lowest position with the same note name. `onString` restricts to one string.
 */
export function positionForMidi(t: Tuning, m: number, fretCount: number, onString?: number): FretPosition | null {
  const all = fretboardPositions(t, fretCount).filter((p) => onString === undefined || p.string === onString)
  const byFret = (a: FretPosition, b: FretPosition) => a.fret - b.fret || b.string - a.string
  return all.filter((p) => p.midi === m).sort(byFret)[0] ?? all.filter((p) => p.chroma === ((m % 12) + 12) % 12).sort(byFret)[0] ?? null
}

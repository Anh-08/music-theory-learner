import { Chord } from 'tonal'
import { chordType } from './chords'
import { displayNote, noteFromMidi } from './notes'
import { chordTypeId } from './progression'
import { intervalLabel } from './intervals'

export interface ChordMatch {
  /** Display name: "C", "Am7", "C/E". */
  name: string
  root: string
  bass?: string
  intervals: string[]
  /** Formula: "1 3 5". */
  formula: string
}

/**
 * Guesses chord names from notes (midi). The lowest note is the bass — if it is not the root we get a slash chord.
 * Returns the candidates, most plausible first.
 */
export function identifyChord(midis: number[]): ChordMatch[] {
  const sorted = [...new Set(midis)].sort((a, b) => a - b)
  const pcs = [...new Set(sorted.map((m) => noteFromMidi(m).replace(/\d+$/, '')))]
  if (pcs.length < 3) return []
  // Prefer common chord types (those in CHORD_TYPES): C/E comes before Em#5.
  const detected = Chord.detect(pcs, { assumePerfectFifth: true })
  const known = (full: string) => (chordTypeId(Chord.get(full.split('/')[0]).intervals) ? 0 : 1)
  return [...detected]
    .sort((a, b) => known(a) - known(b))
    .slice(0, 4)
    .map((full) => {
      const [main, bass] = full.split('/')
      const c = Chord.get(main)
      const id = chordTypeId(c.intervals)
      const suffix = id ? chordType(id).suffix : (c.aliases[0] ?? c.type)
      return {
        name: `${displayNote(c.tonic!)}${suffix}${bass ? `/${displayNote(bass)}` : ''}`,
        root: c.tonic!,
        bass,
        intervals: c.intervals,
        formula: c.intervals.map(intervalLabel).join(' '),
      }
    })
}

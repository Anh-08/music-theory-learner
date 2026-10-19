import type { Locale } from '../i18n/locale'
import { chroma, displayNote, solfege, type Chroma } from './notes'

export type LabelMode = 'note' | 'interval' | 'solfege'

/** Special highlight colour (used in exercises); the default is the root / regular note colour. */
export type MarkerColor = 'correct' | 'wrong' | 'question' | 'neutral'

export interface Highlight {
  label: string
  isRoot: boolean
  color?: MarkerColor
}

/** Notes to highlight on an instrument, indexed by chroma so every octave shares them. */
export type HighlightMap = Map<Chroma, Highlight>

/**
 * Builds a highlight map from a list of notes and their interval labels
 * (the first note is the root).
 */
export function makeHighlights(notes: string[], intervalLabels: string[], mode: LabelMode, locale: Locale = 'vi'): HighlightMap {
  const map: HighlightMap = new Map()
  notes.forEach((note, i) => {
    const c = chroma(note)
    if (map.has(c)) return
    const label = mode === 'note' ? displayNote(note) : mode === 'interval' ? intervalLabels[i] : solfege(c, locale)
    map.set(c, { label, isRoot: i === 0 })
  })
  return map
}

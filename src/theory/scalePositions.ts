import { positionMidi, type StringFret, type Tuning } from './fretboard'
import { chromaOfMidi, type Chroma } from './notes'

export interface ScalePosition {
  /** Lowest and highest fret used by the position. */
  lo: number
  hi: number
  /** Every scale note in the position, from the lowest pitch to the highest (one per pitch). */
  notes: (StringFret & { midi: number })[]
}

/**
 * Splits the neck into scale positions ("thế"): the open position first, then one position starting on each
 * scale note of the lowest string further up the neck (skipping one that starts only a fret above the previous one).
 * Inside a position the hand covers `span` + 1 frets; the run moves to the next string as soon as the note fits there,
 * which gives the usual 2–3 notes per string. Near the end of the neck a position is kept only if it still reaches the top string.
 */
export function scalePositions(t: Tuning, chromas: readonly Chroma[], fretCount: number, span = 4): ScalePosition[] {
  const inScale = new Set(chromas)
  if (inScale.size === 0) return []
  const lowest = t.strings.length
  const lowOpen = positionMidi(t, { string: lowest, fret: 0 })

  const starts = [0]
  for (let f = 1; f + span - 1 <= fretCount; f++) {
    if (inScale.has(chromaOfMidi(lowOpen + f)) && f - starts[starts.length - 1] >= 2) starts.push(f)
  }

  return starts
    .map((start) => buildPosition(t, inScale, start, Math.min(start + span, fretCount)))
    .filter((p): p is ScalePosition => p !== null && p.notes[p.notes.length - 1].string === 1)
}

function buildPosition(t: Tuning, inScale: Set<Chroma>, lo: number, hi: number): ScalePosition | null {
  const open = (string: number) => positionMidi(t, { string, fret: 0 })
  let string = t.strings.length
  let fret = lo
  while (fret <= hi && !inScale.has(chromaOfMidi(open(string) + fret))) fret++
  if (fret > hi) return null

  const notes: ScalePosition['notes'] = [{ string, fret, midi: open(string) + fret }]
  for (;;) {
    let m = notes[notes.length - 1].midi + 1
    while (!inScale.has(chromaOfMidi(m))) m++
    const nextFret = string > 1 ? m - open(string - 1) : -1
    if (string > 1 && nextFret >= lo && nextFret <= hi) {
      string--
      notes.push({ string, fret: nextFret, midi: m })
    } else if (m - open(string) <= hi) {
      notes.push({ string, fret: m - open(string), midi: m })
    } else {
      break
    }
  }
  const frets = notes.map((n) => n.fret)
  return { lo: Math.min(...frets), hi: Math.max(...frets), notes }
}

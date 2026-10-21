import { TUNINGS } from './fretboard'
import { DURATIONS, TECHNIQUES, type ChordMark, type Duration, type Measure, type Score, type ScoreEvent, type ScoreNote, type Technique } from './score'

/**
 * Reading scores back from storage, files and share links. Everything from outside is checked field by
 * field; anything malformed is dropped rather than trusted.
 */

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const int = (x: unknown, min: number, max: number): number | null => (typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max ? x : null)

function readNote(x: unknown): ScoreNote | null {
  if (!isObj(x)) return null
  const midi = int(x.midi, 0, 127)
  const string = int(x.string, 1, 12)
  if (midi === null || string === null) return null
  const note: ScoreNote = { midi, string }
  if (Array.isArray(x.tech)) {
    const tech = x.tech.filter((t): t is Technique => TECHNIQUES.includes(t as Technique))
    if (tech.length) note.tech = [...new Set(tech)]
  }
  return note
}

function readEvent(x: unknown): ScoreEvent | null {
  if (!isObj(x)) return null
  if (!DURATIONS.includes(x.duration as Duration)) return null
  const dots = int(x.dots ?? 0, 0, 2) as 0 | 1 | 2 | null
  if (dots === null) return null
  const notes = Array.isArray(x.notes) ? x.notes.map(readNote).filter((n): n is ScoreNote => n !== null) : []
  // One note per string.
  const unique = notes.filter((n, i) => notes.findIndex((m) => m.string === n.string) === i)
  const e: ScoreEvent = { duration: x.duration as Duration, dots, notes: unique }
  if (x.tuplet === 3) e.tuplet = 3
  if (unique.length === 0) e.rest = true
  else if (x.tieToNext === true) e.tieToNext = true
  return e
}

function readMeasure(x: unknown): Measure | null {
  if (!isObj(x) || !Array.isArray(x.events)) return null
  const m: Measure = { events: x.events.slice(0, 256).map(readEvent).filter((e): e is ScoreEvent => e !== null) }
  if (Array.isArray(x.chords)) {
    const chords = x.chords
      .filter((c): c is ChordMark => isObj(c) && int(c.tick, 0, 100000) !== null && typeof c.symbol === 'string' && c.symbol.trim().length > 0 && c.symbol.length <= 24)
      .map((c) => ({ tick: c.tick, symbol: c.symbol.trim() }))
    if (chords.length) m.chords = chords
  }
  if (x.repeatStart === true) m.repeatStart = true
  if (isObj(x.repeatEnd)) m.repeatEnd = { times: int(x.repeatEnd.times, 2, 8) ?? 2 }
  if (Array.isArray(x.ending)) {
    const ending = x.ending.filter((n): n is number => int(n, 1, 8) !== null)
    if (ending.length) m.ending = [...new Set(ending)].sort((a, b) => a - b)
  }
  return m
}

/** A valid `Score` from untrusted JSON data, or null. Unknown fields are ignored; bad notes are dropped. */
export function readScore(x: unknown, fallbackId?: string): Score | null {
  if (!isObj(x) || x.version !== 1 || !Array.isArray(x.measures)) return null
  const id = typeof x.id === 'string' && /^[\w-]{1,40}$/.test(x.id) ? x.id : fallbackId
  if (!id) return null
  const ts = Array.isArray(x.timeSig) ? x.timeSig : []
  const beats = int(ts[0], 1, 32)
  const unit = int(ts[1], 1, 32)
  const measures = x.measures.slice(0, 1000).map(readMeasure).filter((m): m is Measure => m !== null)
  return {
    version: 1,
    id,
    title: typeof x.title === 'string' ? x.title.slice(0, 120) : '',
    tempo: int(x.tempo, 20, 300) ?? 90,
    timeSig: beats && unit && [1, 2, 4, 8, 16, 32].includes(unit) ? [beats, unit] : [4, 4],
    keySig: typeof x.keySig === 'string' && /^[A-G][#b]?m?$/.test(x.keySig) ? x.keySig : 'C',
    tuning: typeof x.tuning === 'string' && TUNINGS.some((t) => t.id === x.tuning) ? x.tuning : 'standard',
    capo: int(x.capo, 0, 12) ?? 0,
    measures: measures.length ? measures : [{ events: [] }],
  }
}

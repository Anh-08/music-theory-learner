import { Note, Scale } from 'tonal'
import { chromaOfMidi } from './notes'
import { keyScale, parseProgression, type KeyRef, type ProgressionChord } from './progression'
import { eventStarts, eventTicks, newScore, scoreKey, type Measure, type Score } from './score'
import type { EventRef } from './scoreEdit'

/**
 * Learning overlays for the sheet editor (Phase 10.7): what each note is against the chord above it or the key,
 * and whether it is a chord tone, a scale tone or an outside note. Also the bridge to the Jam Room.
 */

export type LabelMode = 'off' | 'chord' | 'key'
export type NoteRole = 'chord' | 'scale' | 'outside'

/** Scales the editor can check against, rooted on the key's tonic. 'key' = the key's own scale. */
export const CHECK_SCALES = ['key', 'major pentatonic', 'minor pentatonic', 'blues', 'harmonic minor', 'dorian', 'mixolydian'] as const
export type CheckScale = (typeof CHECK_SCALES)[number]

/** Interval names by semitones above a root, as guitarists say them (♭3, ♭7…). */
const SEMITONE_LABELS = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7']

export interface EventInfo {
  ref: EventRef
  /** Label of the highest note (the melody) — or of every note of a chord, low to high, joined by spaces. */
  label: string
  /** Role of the highest note. */
  role: NoteRole
  /** Chord symbol in effect, if any. */
  chord?: string
}

function parseChord(symbol: string): ProgressionChord | null {
  try {
    return parseProgression(symbol)[0] ?? null
  } catch {
    return null
  }
}

/** The chord in effect at every event: the last chord symbol at or before it, carried across bars. */
export function chordsAtEvents(score: Pick<Score, 'measures'>): Map<string, ProgressionChord | null> {
  const out = new Map<string, ProgressionChord | null>()
  let current: ProgressionChord | null = null
  score.measures.forEach((m, mi) => {
    const starts = eventStarts(m)
    const marks = [...(m.chords ?? [])].sort((a, b) => a.tick - b.tick)
    let k = 0
    m.events.forEach((e, ei) => {
      // A symbol written anywhere inside an event applies from that event on.
      const end = starts[ei] + eventTicks(e)
      for (; k < marks.length && marks[k].tick < end; k++) current = parseChord(marks[k].symbol) ?? current
      out.set(`${mi}:${ei}`, current)
    })
    // Symbols on an empty bar, or after the last note, carry on to the next bars.
    for (; k < marks.length; k++) current = parseChord(marks[k].symbol) ?? current
  })
  return out
}

/** Pitch classes of the scale used for the "outside note" check. */
export function scaleChromas(key: KeyRef, scale: CheckScale): Set<number> {
  const notes = scale === 'key' ? keyScale(key) : Scale.get(`${key.tonic} ${scale}`).notes
  return new Set(notes.map((n) => Note.chroma(n) ?? -1))
}

function labelFor(midi: number, root: string): string {
  return SEMITONE_LABELS[chromaOfMidi(midi - (Note.chroma(root) ?? 0))]
}

/** Interval label of a note above a chord root, using the chord's own spelling for chord tones (♯5, ♭♭7…). */
export function chordLabel(midi: number, chord: ProgressionChord): string {
  const rootC = Note.chroma(chord.root) ?? 0
  const i = chord.notes.findIndex((n) => Note.chroma(n) === chromaOfMidi(midi))
  if (i >= 0) {
    const iv = chord.intervals[i]
    const num = Number(iv.replace(/\D/g, '')) || 1
    const semis = chromaOfMidi(midi - rootC)
    // Keep the chord's own degree number (3, 5, 7, 9…) with the right accidental.
    const natural: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 2, 11: 5, 13: 9 }
    const base = natural[num]
    if (base !== undefined) {
      const diff = ((semis - base + 18) % 12) - 6
      const acc = diff < 0 ? '♭'.repeat(-diff) : '♯'.repeat(diff)
      return acc + num
    }
  }
  return labelFor(midi, chord.root)
}

/** Labels and roles for every event with notes. */
export function analyzeScore(score: Score, mode: LabelMode, scale: CheckScale = 'key'): EventInfo[] {
  const key = scoreKey(score)
  const inScale = scaleChromas(key, scale)
  const chords = chordsAtEvents(score)
  const out: EventInfo[] = []
  score.measures.forEach((m, mi) =>
    m.events.forEach((e, ei) => {
      if (e.rest || e.notes.length === 0) return
      const chord = chords.get(`${mi}:${ei}`) ?? null
      const sorted = [...e.notes].sort((a, b) => a.midi - b.midi)
      const top = sorted[sorted.length - 1]
      const chordTones = chord ? new Set(chord.notes.map((n) => Note.chroma(n))) : null
      const pc = chromaOfMidi(top.midi)
      const role: NoteRole = chordTones?.has(pc) ? 'chord' : inScale.has(pc) ? 'scale' : 'outside'
      const one = (midi: number) => (mode === 'chord' ? (chord ? chordLabel(midi, chord) : '') : mode === 'key' ? labelFor(midi, key.tonic) : '')
      const label = sorted.length > 1 && sorted.length <= 3 ? sorted.map((n) => one(n.midi)).join(' ') : one(top.midi)
      out.push({ ref: { measure: mi, event: ei }, label, role, chord: chord?.symbol })
    }),
  )
  return out
}

// ---------------------------------------------------------------------------------------------
// Jam Room bridge

/**
 * The score's chord symbols as a Jam Room progression, one chord per bar ("A7*4 D7*2 A7*2 E7 D7 A7 E7").
 * Each bar takes its first chord symbol, or keeps the previous one. Null when the score has no chords.
 */
export function progressionFromScore(score: Pick<Score, 'measures'>): string | null {
  const bars: string[] = []
  let current: string | null = null
  for (const m of score.measures) {
    const first = [...(m.chords ?? [])].sort((a, b) => a.tick - b.tick)[0]
    if (first) current = first.symbol
    if (current) bars.push(current)
  }
  if (bars.length === 0) return null
  const out: string[] = []
  for (let i = 0; i < bars.length; ) {
    let n = 1
    while (i + n < bars.length && bars[i + n] === bars[i] && n < 16) n++
    out.push(n > 1 ? `${bars[i]}*${n}` : bars[i])
    i += n
  }
  return out.join(' ')
}

/** An empty score with one bar per chord bar of a progression, chord symbols written in — for notating a jam. */
export function scoreFromProgression(id: string, chords: ProgressionChord[], key: KeyRef, tempo: number, beatsPerBar: number, title: string): Score {
  const measures: Measure[] = chords.flatMap((c) => Array.from({ length: c.bars }, (_, i): Measure => (i === 0 ? { events: [], chords: [{ tick: 0, symbol: c.symbol }] } : { events: [] })))
  return newScore(id, {
    title,
    tempo: Math.max(20, Math.min(300, Math.round(tempo))),
    timeSig: [beatsPerBar === 3 ? 3 : beatsPerBar === 2 ? 2 : 4, 4],
    keySig: key.tonic + (key.mode === 'minor' ? 'm' : ''),
    measures: measures.length ? measures : [{ events: [] }],
  })
}

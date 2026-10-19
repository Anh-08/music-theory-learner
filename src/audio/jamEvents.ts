import { Interval } from 'tonal'
import { chordsPerBar, chroma, guitarVoicing, rootMidiAtOrAbove, stringMidi, voiceLead, type GuitarVoicing, type ProgressionChord } from '../theory'
import type { BassNote, Groove } from './grooves'
import type { InstrumentId } from './instruments'
import { parsePattern, type PickNote, type Rhythm } from './rhythms'

export type JamTrack = 'drums' | 'bass' | 'chords' | 'click'

export type JamEvent =
  | { kind: 'bar'; beat: number; bar: number }
  | { kind: 'kick' | 'snare' | 'hat' | 'click'; beat: number; accent: boolean }
  | { kind: 'bass'; beat: number; midi: number; beats: number }
  | { kind: 'chord'; beat: number; midis: number[]; beats: number }
  /** Guitar strum / pick: the notes sound one by one, `spread` seconds apart, in array order. */
  | { kind: 'strum'; beat: number; midis: number[]; spread: number; velocity: number; beats: number }
  | { kind: 'mute'; beat: number }
  /** Step position in the rhythm (for the playhead on the rhythm grid). */
  | { kind: 'pos'; beat: number; step: number }

/** Note range for chord comping: guitar sits lower than piano. */
const COMP_RANGE: Record<InstrumentId, [number, number]> = {
  guitar: [48, 69],
  piano: [53, 76],
}

const BASS_LOW = 36 // C2

function bassInterval(chord: ProgressionChord, note: BassNote): number {
  const find = (num: number, fallback: string) => chord.intervals.find((i) => Interval.get(i).num === num) ?? fallback
  const name =
    note === 'root' ? '1P' : note === 'third' ? find(3, '3M') : note === 'fifth' ? find(5, '5P') : note === 'seventh' ? find(7, '7m') : note === 'octave' ? '8P' : note
  return Interval.get(name).semitones ?? 0
}

/** Notes used to voice a chord: drop 9/11/13 when the chord already has 4+ notes, to keep it tight. */
function voicingChromas(chord: ProgressionChord): number[] {
  const core = chord.intervals.filter((i) => Interval.get(i).num <= 7)
  const use = core.length >= 4 ? core : chord.intervals
  return use.map((i) => (chroma(chord.root) + (Interval.get(i).semitones ?? 0)) % 12)
}

/**
 * Builds every event for one pass of the progression, timed in beats (quarter notes) from the start of the loop.
 * Chords are voiced with voice leading (least note movement between chords).
 */
export function buildJamEvents(
  chords: ProgressionChord[],
  groove: Groove,
  instrument: InstrumentId,
  rhythm?: Rhythm,
  /** Shape chosen for each chord (by symbol), used when playing a guitar rhythm. */
  shapes?: Record<string, (number | null)[]>,
): JamEvent[] {
  const bars = chordsPerBar(chords)
  const beatsPerBar = groove.beatsPerBar
  const beatsPerStep = beatsPerBar / groove.stepsPerBar
  // A guitar rhythm replaces the groove's chord comping (only when the beat counts match).
  const useRhythm = rhythm && rhythm.beatsPerBar === beatsPerBar ? rhythm : undefined
  const [low, high] = COMP_RANGE[instrument]
  const events: JamEvent[] = []
  let prev: number[] | null = null

  bars.forEach((chord, bar) => {
    const start = bar * beatsPerBar
    const at = (step: number) => start + step * beatsPerStep
    events.push({ kind: 'bar', beat: start, bar })
    for (let b = 0; b < beatsPerBar; b++) events.push({ kind: 'click', beat: start + b, accent: b === 0 })
    for (const s of groove.kick) events.push({ kind: 'kick', beat: at(s), accent: s === 0 })
    for (const s of groove.snare) events.push({ kind: 'snare', beat: at(s), accent: true })
    for (const s of groove.hat) events.push({ kind: 'hat', beat: at(s), accent: s % (groove.stepsPerBar / beatsPerBar) === 0 })

    const bassRoot = rootMidiAtOrAbove(chroma(chord.bass ?? chord.root), BASS_LOW)
    const chordRoot = chord.bass ? rootMidiAtOrAbove(chroma(chord.root), BASS_LOW) : bassRoot
    groove.bass.forEach((b, i) => {
      // Slash chord (C/E): the first note of the bar is that bass note, later notes follow the chord.
      const midi = chord.bass && i === 0 ? bassRoot : chordRoot + bassInterval(chord, b.note)
      events.push({ kind: 'bass', beat: at(b.step), midi, beats: b.len * beatsPerStep })
    })

    if (useRhythm) {
      events.push(...rhythmBarEvents(chord, useRhythm, start, shapes?.[chord.symbol]))
      return
    }
    const voicing = voiceLead(voicingChromas(chord), prev, low, high)
    prev = voicing
    for (const c of groove.comp) {
      const midis = c.tones ? c.tones.map((t) => voicing[t % voicing.length]) : voicing
      events.push({ kind: 'chord', beat: at(c.step), midis, beats: c.len * beatsPerStep })
    }
  })
  return events
}

export function loopBeats(chords: ProgressionChord[], beatsPerBar = 4): number {
  return chordsPerBar(chords).length * beatsPerBar
}

const voicingCache = new Map<string, GuitarVoicing>()

function voicingFor(chord: ProgressionChord, frets?: (number | null)[]): GuitarVoicing {
  const key = `${chord.symbol}|${frets?.join(',') ?? ''}`
  let v = voicingCache.get(key)
  if (!v) {
    v = guitarVoicing(chord, frets)
    voicingCache.set(key, v)
  }
  return v
}

function pickMidi(v: GuitarVoicing, n: PickNote): number {
  if (n === 'B') return v.bass
  if (n === "B'") return v.altBass
  return stringMidi(v, n)
}

/**
 * Events for one bar of a guitar rhythm: downstrokes play from the low strings up (skipping unplayed strings),
 * upstrokes hit the 4 high strings from string 1 down; light strums touch only the high strings; picking plays single strings.
 */
export function rhythmBarEvents(chord: ProgressionChord, r: Rhythm, start: number, frets?: (number | null)[]): JamEvent[] {
  const v = voicingFor(chord, frets)
  const sounding = v.stringMidis.filter((m): m is number => m !== null)
  const strummed = v.frets ? sounding : [v.bass, ...sounding.filter((m) => m !== v.bass)]
  const events: JamEvent[] = []
  parsePattern(r.pattern).forEach((step, i) => {
    const beat = start + i / r.stepsPerBeat
    events.push({ kind: 'pos', beat, step: i })
    if (step.kind === 'strum') {
      const top = strummed.slice(-4)
      if (step.dir === 'down') {
        const midis = step.light ? top : strummed
        events.push({ kind: 'strum', beat, midis, spread: 0.012, velocity: step.light ? 0.45 : 0.9, beats: 1 })
      } else {
        events.push({ kind: 'strum', beat, midis: [...(step.light ? top.slice(-3) : top)].reverse(), spread: 0.01, velocity: step.light ? 0.4 : 0.7, beats: 1 })
      }
    } else if (step.kind === 'mute') {
      events.push({ kind: 'mute', beat })
    } else if (step.kind === 'pick') {
      events.push({ kind: 'strum', beat, midis: step.notes.map((n) => pickMidi(v, n)), spread: 0, velocity: 0.8, beats: 2 })
    }
  })
  return events
}

import { Note } from 'tonal'
import { bestRootSpelling, chromaOfMidi, spellingsOf } from './notes'
import { keyScale } from './progression'
import {
  chooseString,
  eventTicks,
  fretOf,
  isPlayable,
  measureCapacity,
  measureTicks,
  prefersFlats,
  scoreKey,
  ticksToDurations,
  type ChordMark,
  type Duration,
  type Measure,
  type Score,
  type ScoreEvent,
  type ScoreNote,
  type Technique,
} from './score'

/**
 * Editing operations of the sheet & tab editor. Every function is pure: it returns a new `Score`
 * (and usually a new cursor), so undo / redo is a plain stack of scores.
 */

/** Where the next note goes. `event` may equal the number of events in the bar: the "append" slot after the last one. */
export interface Cursor {
  measure: number
  event: number
  /** Selected string (1 = highest). */
  string: number
}

export interface EventRef {
  measure: number
  event: number
}

export interface EditResult {
  score: Score
  cursor: Cursor
}

export type DurationValue = Pick<ScoreEvent, 'duration' | 'dots' | 'tuplet'>

// ---------------------------------------------------------------------------------------------
// Small helpers

function setMeasure(score: Score, i: number, m: Measure): Score {
  const measures = score.measures.slice()
  measures[i] = m
  return { ...score, measures }
}

function setEvent(score: Score, ref: EventRef, e: ScoreEvent): Score {
  const m = score.measures[ref.measure]
  const events = m.events.slice()
  events[ref.event] = e
  return setMeasure(score, ref.measure, { ...m, events })
}

/** Appends empty bars until bar `i` exists. */
export function ensureMeasure(score: Score, i: number): Score {
  if (i < score.measures.length) return score
  const extra = Array.from({ length: i + 1 - score.measures.length }, (): Measure => ({ events: [] }))
  return { ...score, measures: [...score.measures, ...extra] }
}

export function getEvent(score: Score, ref: EventRef): ScoreEvent | undefined {
  return score.measures[ref.measure]?.events[ref.event]
}

function cloneEvent(e: ScoreEvent): ScoreEvent {
  return { ...e, notes: e.notes.map((n) => ({ ...n, tech: n.tech?.slice() })) }
}

function cloneMeasure(m: Measure): Measure {
  return {
    ...m,
    events: m.events.map(cloneEvent),
    chords: m.chords?.map((c) => ({ ...c })),
    repeatEnd: m.repeatEnd ? { ...m.repeatEnd } : undefined,
    ending: m.ending?.slice(),
  }
}

function sortNotes(notes: ScoreNote[]): ScoreNote[] {
  return notes.slice().sort((a, b) => b.string - a.string)
}

export function makeEvent(value: DurationValue, notes: ScoreNote[] = []): ScoreEvent {
  const e: ScoreEvent = { duration: value.duration, dots: value.dots, notes: sortNotes(notes) }
  if (value.tuplet) e.tuplet = value.tuplet
  if (notes.length === 0) e.rest = true
  return e
}

// ---------------------------------------------------------------------------------------------
// Cursor movement

/** The event before the cursor (crossing into the previous bar), if any. */
export function previousRef(score: Score, cursor: EventRef): EventRef | null {
  if (cursor.event > 0) return { measure: cursor.measure, event: cursor.event - 1 }
  for (let i = cursor.measure - 1; i >= 0; i--) {
    const n = score.measures[i].events.length
    if (n > 0) return { measure: i, event: n - 1 }
  }
  return null
}

function barIsFull(score: Score, i: number): boolean {
  return measureTicks(score.measures[i]) >= measureCapacity(score.timeSig)
}

/**
 * Next cursor position. After the last event of a full bar it jumps to the next bar;
 * in a bar that is not full yet it stops on the append slot first.
 */
export function cursorNext(score: Score, c: Cursor): Cursor {
  const n = score.measures[c.measure].events.length
  const hasNext = c.measure + 1 < score.measures.length
  if (c.event + 1 < n) return { ...c, event: c.event + 1 }
  if (c.event + 1 === n && !barIsFull(score, c.measure)) return { ...c, event: n }
  return hasNext ? { ...c, measure: c.measure + 1, event: 0 } : { ...c, event: n }
}

export function cursorPrev(score: Score, c: Cursor): Cursor {
  if (c.event > 0) return { ...c, event: c.event - 1 }
  if (c.measure === 0) return c
  const n = score.measures[c.measure - 1].events.length
  return { ...c, measure: c.measure - 1, event: Math.max(0, n - 1) }
}

/** Fret of the closest note before the cursor — used to keep new notes near the hand. */
export function fretNear(score: Score, cursor: EventRef): number | undefined {
  let ref: EventRef | null = getEvent(score, cursor)?.notes.length ? cursor : previousRef(score, cursor)
  while (ref) {
    const e = getEvent(score, ref)
    if (e && e.notes.length) {
      const frets = e.notes.map((n) => fretOf(score, n)).filter((f) => f > 0)
      return frets.length ? Math.min(...frets) : 0
    }
    ref = previousRef(score, ref)
  }
  return undefined
}

// ---------------------------------------------------------------------------------------------
// Placing events with bar filling

/**
 * Inserts an event at the cursor.
 * - On the append slot of a full bar it goes to the start of the next bar (created if needed).
 * - Appended to a bar without enough room, it is split: the part that fits stays (tied), the rest
 *   starts the next bar. Rests are split the same way, without ties.
 * - Inserted in the middle of a bar it simply pushes the following events; an over-full bar is
 *   flagged by `measureFill`, never cut silently.
 * Returns the new score, the cursor after the event, and where the (first part of the) event landed.
 */
export function placeEvent(score: Score, cursor: Cursor, event: ScoreEvent): EditResult & { at: EventRef } {
  let s = ensureMeasure(score, cursor.measure)
  const cap = measureCapacity(s.timeSig)
  let { measure } = cursor
  let index = Math.min(cursor.event, s.measures[measure].events.length)
  const atEnd = index === s.measures[measure].events.length

  if (atEnd && measureTicks(s.measures[measure]) >= cap) {
    measure += 1
    index = 0
    s = ensureMeasure(s, measure)
  }

  const m = s.measures[measure]
  const free = cap - measureTicks(m)
  const t = eventTicks(event)
  const appending = index === m.events.length

  if (appending && t > free && free > 0) {
    const first = ticksToDurations(free)
    const rest = ticksToDurations(t - free)
    if (first && rest) {
      const tie = !event.rest
      const firstEvents = first.map((v) => ({ ...cloneEvent(event), ...v, tuplet: v.tuplet, tieToNext: tie || undefined }))
      const restEvents = rest.map((v, i) => ({
        ...cloneEvent(event),
        ...v,
        tuplet: v.tuplet,
        tieToNext: i < rest.length - 1 ? tie || undefined : event.tieToNext,
      }))
      s = setMeasure(s, measure, { ...m, events: [...m.events, ...firstEvents.map(clean)] })
      s = ensureMeasure(s, measure + 1)
      const next = s.measures[measure + 1]
      s = setMeasure(s, measure + 1, { ...next, events: [...restEvents.map(clean), ...next.events] })
      return {
        score: s,
        cursor: { ...cursor, measure: measure + 1, event: restEvents.length },
        at: { measure, event: index },
      }
    }
  }

  const events = m.events.slice()
  events.splice(index, 0, clean(cloneEvent(event)))
  s = setMeasure(s, measure, { ...m, events })
  return { score: s, cursor: { ...cursor, measure, event: index + 1 }, at: { measure, event: index } }
}

/** Drops undefined optional fields so saved scores stay small and comparable. */
function clean(e: ScoreEvent): ScoreEvent {
  const out: ScoreEvent = { duration: e.duration, dots: e.dots, notes: e.notes }
  if (e.tuplet) out.tuplet = e.tuplet
  if (e.rest) out.rest = true
  if (e.tieToNext) out.tieToNext = true
  return out
}

/** Inserts a new note (or chord) event at the cursor and moves the cursor after it. */
export function insertNotes(score: Score, cursor: Cursor, notes: ScoreNote[], value: DurationValue): EditResult {
  const { score: s, cursor: c } = placeEvent(score, cursor, makeEvent(value, notes))
  return { score: s, cursor: c }
}

export function insertRest(score: Score, cursor: Cursor, value: DurationValue): EditResult {
  const { score: s, cursor: c } = placeEvent(score, cursor, makeEvent(value))
  return { score: s, cursor: c }
}

/**
 * Guitar Pro style entry: sets the note on `note.string` of the event under the cursor (replacing what that
 * string played; a rest becomes a note). On the append slot a new event is created and the cursor stays on it,
 * so more strings can be added to the same chord.
 */
export function setNoteAtCursor(score: Score, cursor: Cursor, note: ScoreNote, value: DurationValue): EditResult {
  const e = getEvent(score, cursor)
  if (!e) {
    const placed = placeEvent(score, cursor, makeEvent(value, [note]))
    return { score: placed.score, cursor: { ...cursor, ...placed.at, string: note.string } }
  }
  return { score: addNoteToEvent(score, cursor, note), cursor: { ...cursor, string: note.string } }
}

/** Adds a note to an existing event, replacing the note on the same string. */
export function addNoteToEvent(score: Score, ref: EventRef, note: ScoreNote): Score {
  const e = getEvent(score, ref)
  if (!e) return score
  const notes = sortNotes([...e.notes.filter((n) => n.string !== note.string), note])
  const next: ScoreEvent = { ...e, notes }
  delete next.rest
  return setEvent(score, ref, next)
}

/**
 * Delete key: removes the note on the cursor's string; if it was the only note (or the event is a rest),
 * the whole event goes. On the append slot nothing happens.
 */
export function deleteAtCursor(score: Score, cursor: Cursor): EditResult {
  const e = getEvent(score, cursor)
  if (!e) return { score, cursor }
  const others = e.notes.filter((n) => n.string !== cursor.string)
  if (others.length > 0 && others.length < e.notes.length) {
    return { score: setEvent(score, cursor, { ...e, notes: others }), cursor }
  }
  return deleteEvent(score, cursor)
}

export function deleteEvent(score: Score, cursor: Cursor): EditResult {
  const m = score.measures[cursor.measure]
  if (!m || cursor.event >= m.events.length) return { score, cursor }
  const events = m.events.filter((_, i) => i !== cursor.event)
  return { score: setMeasure(score, cursor.measure, { ...m, events }), cursor: { ...cursor, event: Math.min(cursor.event, events.length) } }
}

/** Backspace: deletes the event before the cursor. */
export function backspace(score: Score, cursor: Cursor): EditResult {
  const prev = previousRef(score, cursor)
  if (!prev) return { score, cursor }
  const r = deleteEvent(score, { ...cursor, ...prev })
  return { score: r.score, cursor: { ...cursor, ...prev } }
}

/** Pads a bar that is not full with rests (empty bars stay empty — they are drawn as a whole-bar rest). */
export function padMeasure(score: Score, i: number): Score {
  const m = score.measures[i]
  if (!m || m.events.length === 0) return score
  const left = measureCapacity(score.timeSig) - measureTicks(m)
  if (left <= 0) return score
  const values = ticksToDurations(left)
  if (!values) return score
  return setMeasure(score, i, { ...m, events: [...m.events, ...values.map((v) => makeEvent(v))] })
}

// ---------------------------------------------------------------------------------------------
// Changing events

/** Every event from `a` to `b` (inclusive, in either order). */
export function refsInRange(score: Score, a: EventRef, b: EventRef): EventRef[] {
  const [from, to] = compareRefs(a, b) <= 0 ? [a, b] : [b, a]
  const out: EventRef[] = []
  for (let m = from.measure; m <= to.measure; m++) {
    const n = score.measures[m]?.events.length ?? 0
    const start = m === from.measure ? from.event : 0
    const end = m === to.measure ? Math.min(to.event, n - 1) : n - 1
    for (let e = start; e <= end; e++) out.push({ measure: m, event: e })
  }
  return out
}

export function compareRefs(a: EventRef, b: EventRef): number {
  return a.measure - b.measure || a.event - b.event
}

function mapEvents(score: Score, refs: EventRef[], fn: (e: ScoreEvent) => ScoreEvent): Score {
  let s = score
  for (const ref of refs) {
    const e = getEvent(s, ref)
    if (e) s = setEvent(s, ref, clean(fn(e)))
  }
  return s
}

export function setDuration(score: Score, refs: EventRef[], duration: Duration): Score {
  return mapEvents(score, refs, (e) => ({ ...e, duration }))
}

/** Cycles no dot → dot → no dot (double dots only through `setDots`). */
export function toggleDot(score: Score, refs: EventRef[]): Score {
  return mapEvents(score, refs, (e) => ({ ...e, dots: e.dots ? 0 : 1 }))
}

export function setDots(score: Score, refs: EventRef[], dots: 0 | 1 | 2): Score {
  return mapEvents(score, refs, (e) => ({ ...e, dots }))
}

export function toggleTriplet(score: Score, refs: EventRef[]): Score {
  return mapEvents(score, refs, (e) => ({ ...e, tuplet: e.tuplet ? undefined : 3 }))
}

export function toggleTie(score: Score, refs: EventRef[]): Score {
  return mapEvents(score, refs, (e) => (e.rest ? e : { ...e, tieToNext: !e.tieToNext }))
}

/** Turns events into rests (their notes are dropped). */
export function makeRest(score: Score, refs: EventRef[]): Score {
  return mapEvents(score, refs, (e) => ({ ...e, notes: [], rest: true, tieToNext: undefined }))
}

/** Toggles a technique on the note played on `string` (or on every note of the event when `string` is omitted). */
export function toggleTechnique(score: Score, ref: EventRef, tech: Technique, string?: number): Score {
  const e = getEvent(score, ref)
  if (!e || e.notes.length === 0) return score
  const targets = e.notes.filter((n) => string === undefined || n.string === string)
  const list = targets.length ? targets : e.notes
  const turnOn = !list.every((n) => n.tech?.includes(tech))
  const notes = e.notes.map((n) => {
    if (!list.includes(n)) return n
    const rest = (n.tech ?? []).filter((t) => t !== tech && !(BEND_GROUP.includes(t) && BEND_GROUP.includes(tech)))
    const tech2 = turnOn ? [...rest, tech] : rest
    const out: ScoreNote = { midi: n.midi, string: n.string }
    if (tech2.length) out.tech = tech2
    return out
  })
  return setEvent(score, ref, { ...e, notes })
}

const BEND_GROUP: Technique[] = ['bendHalf', 'bendFull']

/**
 * Moves the note on `string` to the neighbouring string (`dir` −1 = towards string 1, the higher one),
 * keeping its pitch. Nothing happens if that string is taken or cannot reach the pitch.
 */
export function moveToString(score: Score, ref: EventRef, string: number, dir: 1 | -1): { score: Score; string: number } {
  const e = getEvent(score, ref)
  const note = e?.notes.find((n) => n.string === string)
  const target = string + dir
  if (!e || !note || e.notes.some((n) => n.string === target)) return { score, string }
  const moved = { ...note, string: target }
  if (target < 1 || !isPlayable(score, moved)) return { score, string }
  const notes = sortNotes(e.notes.map((n) => (n === note ? moved : n)))
  return { score: setEvent(score, ref, { ...e, notes }), string: target }
}

// ---------------------------------------------------------------------------------------------
// Transposing

/** Moves notes by `semitones`, keeping each note's string when it is still playable, otherwise re-fingering it. */
export function transposeEvents(score: Score, refs: EventRef[], semitones: number): Score {
  return mapEvents(score, refs, (e) => {
    const notes: ScoreNote[] = []
    for (const n of e.notes) {
      const midi = n.midi + semitones
      const keep = { ...n, midi }
      if (isPlayable(score, keep) && !notes.some((x) => x.string === n.string)) {
        notes.push(keep)
        continue
      }
      const string = chooseString(score, midi, { nearFret: Math.max(0, fretOf(score, n)), taken: notes.map((x) => x.string) })
      notes.push({ ...keep, string: string ?? n.string })
    }
    return { ...e, notes: sortNotes(notes) }
  })
}

function allRefs(score: Score): EventRef[] {
  return score.measures.flatMap((m, measure) => m.events.map((_, event) => ({ measure, event })))
}

/** Transposes a note name ("Bb", "F#") by semitones, spelled with sharps or flats. */
function transposeName(name: string, semitones: number, flats: boolean): string {
  const c = Note.chroma(name)
  if (c === undefined || Number.isNaN(c)) return name
  const pc = chromaOfMidi(c + semitones)
  const options = spellingsOf(pc)
  return flats ? options[options.length - 1] : options[0]
}

/** Transposes a chord symbol's root and bass: "F#m7/C#" up 1 → "Gm7/D". */
export function transposeChordSymbol(symbol: string, semitones: number, flats: boolean): string {
  const m = symbol.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/)
  if (!m) return symbol
  const [, root, suffix, bass] = m
  return transposeName(root, semitones, flats) + suffix + (bass ? `/${transposeName(bass, semitones, flats)}` : '')
}

/**
 * Transposes the whole score: notes, key signature and chord symbols. The new key is spelled with the
 * fewest accidentals (up 1 from C gives D♭, not C♯).
 */
export function transposeScore(score: Score, semitones: number): Score {
  const key = scoreKey(score)
  const pc = chromaOfMidi((Note.chroma(key.tonic) ?? 0) + semitones)
  const tonic = bestRootSpelling(pc, (root) => keyScale({ tonic: root, mode: key.mode }))
  const newKey = { tonic, mode: key.mode }
  const flats = prefersFlats(newKey)
  const s = transposeEvents(score, allRefs(score), semitones)
  return {
    ...s,
    keySig: tonic + (key.mode === 'minor' ? 'm' : ''),
    measures: s.measures.map((m) =>
      m.chords ? { ...m, chords: m.chords.map((c) => ({ ...c, symbol: transposeChordSymbol(c.symbol, semitones, flats) })) } : m,
    ),
  }
}

// ---------------------------------------------------------------------------------------------
// Bars

export function insertMeasure(score: Score, at: number): Score {
  const measures = score.measures.slice()
  measures.splice(at, 0, { events: [] })
  return { ...score, measures }
}

/** Deletes bars `from`..`to` (inclusive). A score always keeps at least one bar. */
export function deleteMeasures(score: Score, from: number, to: number): Score {
  const measures = score.measures.filter((_, i) => i < from || i > to)
  return { ...score, measures: measures.length ? measures : [{ events: [] }] }
}

export function copyMeasures(score: Score, from: number, to: number): Measure[] {
  return score.measures.slice(from, to + 1).map(cloneMeasure)
}

/** Inserts copied bars before bar `at`. */
export function pasteMeasures(score: Score, at: number, measures: Measure[]): Score {
  const out = score.measures.slice()
  out.splice(at, 0, ...measures.map(cloneMeasure))
  return { ...score, measures: out }
}

export function duplicateMeasures(score: Score, from: number, to: number): Score {
  return pasteMeasures(score, to + 1, copyMeasures(score, from, to))
}

export function toggleRepeatStart(score: Score, i: number): Score {
  const m = score.measures[i]
  const next: Measure = { ...m }
  if (m.repeatStart) delete next.repeatStart
  else next.repeatStart = true
  return setMeasure(score, i, next)
}

/** Sets the repeat-end sign of a bar (`times` = total passes), or removes it with `null`. */
export function setRepeatEnd(score: Score, i: number, times: number | null): Score {
  const next: Measure = { ...score.measures[i] }
  if (times === null) delete next.repeatEnd
  else next.repeatEnd = { times: Math.max(2, Math.min(8, Math.round(times))) }
  return setMeasure(score, i, next)
}

/** Marks a bar as an ending (volta) for the given passes, or clears it with `null` / an empty list. */
export function setEnding(score: Score, i: number, passes: number[] | null): Score {
  const next: Measure = { ...score.measures[i] }
  if (!passes || passes.length === 0) delete next.ending
  else next.ending = [...new Set(passes)].sort((a, b) => a - b)
  return setMeasure(score, i, next)
}

/** Sets (or with `null` removes) the chord symbol at a tick of a bar. */
export function setChord(score: Score, i: number, tick: number, symbol: string | null): Score {
  const m = score.measures[i]
  const chords: ChordMark[] = (m.chords ?? []).filter((c) => c.tick !== tick)
  if (symbol && symbol.trim()) chords.push({ tick, symbol: symbol.trim() })
  chords.sort((a, b) => a.tick - b.tick)
  const next: Measure = { ...m, chords }
  if (chords.length === 0) delete next.chords
  return setMeasure(score, i, next)
}

// ---------------------------------------------------------------------------------------------
// Undo / redo

export interface History {
  past: Score[]
  present: Score
  future: Score[]
}

export const HISTORY_LIMIT = 100

export function createHistory(score: Score): History {
  return { past: [], present: score, future: [] }
}

/** Records a new state (no-op if nothing changed). Redo steps are dropped. */
export function commit(h: History, next: Score): History {
  if (next === h.present) return h
  const past = [...h.past, h.present].slice(-HISTORY_LIMIT)
  return { past, present: next, future: [] }
}

export function undo(h: History): History {
  if (h.past.length === 0) return h
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
}

export function redo(h: History): History {
  if (h.future.length === 0) return h
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
}

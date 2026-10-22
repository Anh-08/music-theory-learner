import {
  DURATIONS,
  MAX_FRET,
  chooseString,
  eventStarts,
  measureCapacity,
  measureTicks,
  midiAt,
  scoreTuning,
  type Duration,
  type Measure,
  type Score,
  type ScoreNote,
  type Technique,
} from '../../theory/score'
import {
  addNoteToEvent,
  allRefs,
  backspace,
  commit,
  copyMeasures,
  createHistory,
  cursorNext,
  cursorPrev,
  deleteAtCursor,
  deleteMeasures,
  duplicateMeasures,
  fretNear,
  getEvent,
  insertMeasure,
  insertNotes,
  insertRest,
  makeRest,
  moveToString,
  padMeasure,
  pasteMeasures,
  placeEvent,
  makeEvent,
  previousRef,
  redo,
  refsInRange,
  setChord,
  setDuration,
  setEnding,
  setNoteAtCursor,
  setRepeatEnd,
  toggleDot,
  toggleRepeatStart,
  toggleTechnique,
  toggleTie,
  toggleTriplet,
  transposeEvents,
  transposeScore,
  undo,
  type Cursor,
  type DurationValue,
  type EventRef,
  type History,
} from '../../theory/scoreEdit'
import type { Hit } from '../../theory/scoreLayout'

/** Everything the sheet editor keeps between keystrokes. Changed only through `editorReducer`. */
export interface EditorState {
  history: History
  cursor: Cursor
  /** Selection anchor; the selection runs from here to the cursor. */
  anchor: EventRef | null
  /** Duration used for new notes. */
  value: DurationValue
  clipboard: Measure[] | null
  /** Last fret digit typed, so a second digit right after it makes a two-digit fret (1 then 2 → 12). */
  digit: { at: number; measure: number; event: number; string: number; fret: number } | null
}

export type MetaPatch = Partial<Pick<Score, 'title' | 'tempo' | 'timeSig' | 'keySig' | 'tuning' | 'capo'>>

export type EditorAction =
  | { type: 'load'; score: Score }
  | { type: 'pick'; hit: Hit; extend?: boolean }
  | { type: 'move'; dir: 'next' | 'prev'; extend?: boolean }
  | { type: 'goto'; cursor: Cursor }
  | { type: 'string'; dir: -1 | 1 }
  | { type: 'moveNote'; dir: -1 | 1 }
  | { type: 'fret'; digit: number; now: number }
  | { type: 'insert'; notes: ScoreNote[] }
  | { type: 'insertShape'; symbol: string; notes: ScoreNote[] }
  | { type: 'addToChord'; note: ScoreNote }
  | { type: 'insertMidi'; midi: number; chord?: boolean }
  | { type: 'rest' }
  | { type: 'delete' }
  | { type: 'backspace' }
  | { type: 'duration'; duration: Duration }
  | { type: 'longer' }
  | { type: 'shorter' }
  | { type: 'dot' }
  | { type: 'triplet' }
  | { type: 'tie' }
  | { type: 'tech'; tech: Technique }
  | { type: 'bend' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'copy' }
  | { type: 'paste' }
  | { type: 'barInsert'; after: boolean }
  | { type: 'barDelete' }
  | { type: 'barDuplicate' }
  | { type: 'repeatStart' }
  | { type: 'repeatEnd' }
  | { type: 'ending'; pass: number | null }
  | { type: 'chord'; symbol: string | null }
  | { type: 'transpose'; semitones: number }
  | { type: 'meta'; patch: MetaPatch }
  | { type: 'clearSelection' }

export function initEditor(score: Score): EditorState {
  return {
    history: createHistory(score),
    cursor: { measure: 0, event: 0, string: Math.min(3, scoreTuning(score).strings.length) },
    anchor: null,
    value: { duration: '8', dots: 0 },
    clipboard: null,
    digit: null,
  }
}

const score = (s: EditorState) => s.history.present

function clampCursor(sc: Score, c: Cursor): Cursor {
  const measure = Math.max(0, Math.min(c.measure, sc.measures.length - 1))
  const event = Math.max(0, Math.min(c.event, sc.measures[measure].events.length))
  const string = Math.max(1, Math.min(c.string, scoreTuning(sc).strings.length))
  return { measure, event, string }
}

/**
 * Commits a new score (if it changed) and moves the cursor. When the cursor leaves a bar that is not full,
 * that bar is padded with rests in the same undo step.
 */
function apply(s: EditorState, next: Score, cursor: Cursor = s.cursor, keepAnchor = false): EditorState {
  let sc = next
  if (cursor.measure !== s.cursor.measure) sc = padMeasure(sc, s.cursor.measure)
  return { ...s, history: commit(s.history, sc), cursor: clampCursor(sc, cursor), anchor: keepAnchor ? s.anchor : null, digit: null }
}

/** Events a value change applies to: the selection, else the event under the cursor. */
export function targets(s: EditorState): EventRef[] {
  const sc = score(s)
  if (s.anchor) return refsInRange(sc, s.anchor, s.cursor)
  return getEvent(sc, s.cursor) ? [{ measure: s.cursor.measure, event: s.cursor.event }] : []
}

function stepDuration(d: Duration, by: 1 | -1): Duration {
  const i = DURATIONS.indexOf(d)
  return DURATIONS[Math.max(0, Math.min(DURATIONS.length - 1, i + by))]
}

function changeValue(s: EditorState, fn: (sc: Score, refs: EventRef[]) => Score, value: DurationValue): EditorState {
  const refs = targets(s)
  const next = refs.length ? fn(score(s), refs) : score(s)
  return { ...apply(s, next, s.cursor, true), value }
}

/** The event that Shift+click / "add to chord" extends: the one under the cursor, else the one before it. */
function chordTarget(s: EditorState): EventRef | null {
  const sc = score(s)
  if (getEvent(sc, s.cursor)) return s.cursor
  return previousRef(sc, s.cursor)
}

export function editorReducer(s: EditorState, a: EditorAction): EditorState {
  const sc = score(s)
  switch (a.type) {
    case 'load':
      return initEditor(a.score)

    case 'pick': {
      const cursor = { measure: a.hit.measure, event: a.hit.event, string: a.hit.string ?? s.cursor.string }
      if (a.extend) return { ...s, anchor: s.anchor ?? { measure: s.cursor.measure, event: s.cursor.event }, cursor: clampCursor(sc, cursor), digit: null }
      return apply(s, sc, cursor)
    }

    case 'move': {
      const cursor = a.dir === 'next' ? cursorNext(sc, s.cursor) : cursorPrev(sc, s.cursor)
      if (a.extend) return { ...s, anchor: s.anchor ?? { measure: s.cursor.measure, event: s.cursor.event }, cursor, digit: null }
      return apply(s, sc, cursor)
    }

    case 'goto':
      return apply(s, sc, a.cursor)

    case 'string':
      return { ...s, cursor: clampCursor(sc, { ...s.cursor, string: s.cursor.string + a.dir }), digit: null }

    case 'moveNote': {
      if (!getEvent(sc, s.cursor)) return s
      const r = moveToString(sc, s.cursor, s.cursor.string, a.dir)
      return apply(s, r.score, { ...s.cursor, string: r.string })
    }

    case 'fret': {
      const c = s.cursor
      const d = s.digit
      const maxFret = MAX_FRET - sc.capo
      let fret = a.digit
      if (d && a.now - d.at < 600 && d.measure === c.measure && d.event === c.event && d.string === c.string && d.fret > 0 && d.fret * 10 + a.digit <= maxFret) {
        fret = d.fret * 10 + a.digit
      }
      const note = { midi: midiAt(sc, c.string, fret), string: c.string }
      const r = setNoteAtCursor(sc, c, note, s.value)
      const next = apply(s, r.score, r.cursor)
      return { ...next, digit: { at: a.now, measure: next.cursor.measure, event: next.cursor.event, string: c.string, fret } }
    }

    case 'insert': {
      const r = insertNotes(sc, s.cursor, a.notes, s.value)
      return apply(s, r.score, { ...r.cursor, string: a.notes[0]?.string ?? s.cursor.string })
    }

    case 'insertShape': {
      // The chord symbol goes where the event actually lands (it may move to the next bar).
      const r = placeEvent(sc, s.cursor, makeEvent(s.value, a.notes))
      const starts = eventStarts(r.score.measures[r.at.measure])
      const next = setChord(r.score, r.at.measure, starts[r.at.event], a.symbol)
      return apply(s, next, r.cursor)
    }

    case 'addToChord': {
      const ref = chordTarget(s)
      if (!ref) return editorReducer(s, { type: 'insert', notes: [a.note] })
      return apply(s, addNoteToEvent(sc, ref, a.note), { ...s.cursor, string: a.note.string })
    }

    case 'insertMidi': {
      const ref = a.chord ? chordTarget(s) : null
      const taken = ref ? (getEvent(sc, ref)?.notes.map((n) => n.string) ?? []) : []
      const string = chooseString(sc, a.midi, { nearFret: fretNear(sc, s.cursor) ?? 2, taken })
      if (string === null) return s
      const note = { midi: a.midi, string }
      return editorReducer(s, a.chord ? { type: 'addToChord', note } : { type: 'insert', notes: [note] })
    }

    case 'rest': {
      const refs = targets(s)
      if (refs.length) return apply(s, makeRest(sc, refs), s.cursor, true)
      const r = insertRest(sc, s.cursor, s.value)
      return apply(s, r.score, r.cursor)
    }

    case 'delete': {
      if (s.anchor) {
        const refs = targets(s)
        let next = sc
        for (const ref of [...refs].reverse()) next = deleteAtCursor(next, { ...ref, string: -1 }).score
        const first = refs[0] ?? s.cursor
        return apply(s, next, { ...s.cursor, measure: first.measure, event: first.event })
      }
      const r = deleteAtCursor(sc, s.cursor)
      return apply(s, r.score, r.cursor)
    }

    case 'backspace': {
      if (s.anchor || getEvent(sc, s.cursor)) return editorReducer(s, { type: 'delete' })
      const r = backspace(sc, s.cursor)
      return apply(s, r.score, r.cursor)
    }

    case 'duration':
      return changeValue(s, (x, refs) => setDuration(x, refs, a.duration), { ...s.value, duration: a.duration })

    case 'longer':
    case 'shorter': {
      const by = a.type === 'longer' ? -1 : 1
      const refs = targets(s)
      let next = sc
      for (const ref of refs) {
        const e = getEvent(next, ref)!
        next = setDuration(next, [ref], stepDuration(e.duration, by))
      }
      return { ...apply(s, next, s.cursor, true), value: { ...s.value, duration: stepDuration(s.value.duration, by) } }
    }

    case 'dot':
      return changeValue(s, toggleDot, { ...s.value, dots: s.value.dots ? 0 : 1 })

    case 'triplet':
      return changeValue(s, toggleTriplet, { ...s.value, tuplet: s.value.tuplet ? undefined : 3 })

    case 'tie':
      return apply(s, targets(s).length ? toggleTie(sc, targets(s)) : sc, s.cursor, true)

    case 'tech': {
      const refs = targets(s)
      let next = sc
      for (const ref of refs) next = toggleTechnique(next, ref, a.tech, s.anchor ? undefined : s.cursor.string)
      return apply(s, next, s.cursor, true)
    }

    case 'bend': {
      const e = getEvent(sc, s.cursor)
      const note = e?.notes.find((n) => n.string === s.cursor.string)
      if (!e || !note) return s
      const has = (t: Technique) => note.tech?.includes(t)
      const ref = { measure: s.cursor.measure, event: s.cursor.event }
      // none → ½ → full → none
      const next = has('bendFull') ? toggleTechnique(sc, ref, 'bendFull', note.string) : toggleTechnique(sc, ref, has('bendHalf') ? 'bendFull' : 'bendHalf', note.string)
      return apply(s, next)
    }

    case 'undo':
    case 'redo': {
      const history = a.type === 'undo' ? undo(s.history) : redo(s.history)
      return { ...s, history, cursor: clampCursor(history.present, s.cursor), anchor: null, digit: null }
    }

    case 'copy': {
      const [from, to] = barRange(s)
      return { ...s, clipboard: copyMeasures(sc, from, to) }
    }

    case 'paste': {
      if (!s.clipboard?.length) return s
      const at = s.cursor.measure
      // Pasting onto an empty bar replaces it; otherwise the bars go in before the cursor's bar.
      let next = pasteMeasures(sc, at, s.clipboard)
      if (sc.measures[at].events.length === 0) next = deleteMeasures(next, at + s.clipboard.length, at + s.clipboard.length)
      return apply(s, next, { ...s.cursor, measure: at, event: 0 })
    }

    case 'barInsert': {
      const at = s.cursor.measure + (a.after ? 1 : 0)
      return apply(s, insertMeasure(sc, at), { ...s.cursor, measure: at, event: 0 })
    }

    case 'barDelete': {
      const [from, to] = barRange(s)
      return apply(s, deleteMeasures(sc, from, to), { ...s.cursor, measure: from, event: 0 })
    }

    case 'barDuplicate': {
      const [from, to] = barRange(s)
      return apply(s, duplicateMeasures(sc, from, to), { ...s.cursor, measure: to + 1, event: 0 })
    }

    case 'repeatStart':
      return apply(s, toggleRepeatStart(sc, s.cursor.measure))

    case 'repeatEnd':
      return apply(s, setRepeatEnd(sc, s.cursor.measure, sc.measures[s.cursor.measure].repeatEnd ? null : 2))

    case 'ending':
      return apply(s, setEnding(sc, s.cursor.measure, a.pass === null ? null : [a.pass]))

    case 'chord': {
      const m = sc.measures[s.cursor.measure]
      const starts = eventStarts(m)
      const used = measureTicks(m)
      const tick = s.cursor.event < starts.length ? starts[s.cursor.event] : used < measureCapacity(sc.timeSig) ? used : 0
      return apply(s, setChord(sc, s.cursor.measure, tick, a.symbol))
    }

    case 'transpose': {
      const next = s.anchor ? transposeEvents(sc, targets(s), a.semitones) : transposeScore(sc, a.semitones)
      return apply(s, next, s.cursor, true)
    }

    case 'meta': {
      let next: Score = { ...sc, ...a.patch }
      if (a.patch.tempo !== undefined) next.tempo = Math.max(20, Math.min(300, Math.round(a.patch.tempo)))
      if (a.patch.capo !== undefined) next.capo = Math.max(0, Math.min(12, Math.round(a.patch.capo)))
      // A new tuning or capo keeps every pitch; notes the new neck cannot play on their string are re-fingered.
      if (a.patch.tuning !== undefined || a.patch.capo !== undefined) next = transposeEvents(next, allRefs(next), 0)
      return apply(s, next, s.cursor, true)
    }

    case 'clearSelection':
      return s.anchor ? { ...s, anchor: null } : s
  }
}

/** Bars covered by the selection, or the cursor's bar. */
function barRange(s: EditorState): [number, number] {
  if (!s.anchor) return [s.cursor.measure, s.cursor.measure]
  return [Math.min(s.anchor.measure, s.cursor.measure), Math.max(s.anchor.measure, s.cursor.measure)]
}

export interface KeyInput {
  key: string
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}

/** Keyboard shortcuts (Guitar Pro style). Space (play) is handled by the page. */
export function keyToAction(e: KeyInput, now: number): EditorAction | null {
  const mod = e.ctrlKey || e.metaKey
  const k = e.key
  if (mod) {
    const lower = k.toLowerCase()
    if (lower === 'z') return { type: e.shiftKey ? 'redo' : 'undo' }
    if (lower === 'y') return { type: 'redo' }
    if (lower === 'c') return { type: 'copy' }
    if (lower === 'v') return { type: 'paste' }
    return null
  }
  if (k === 'ArrowRight') return { type: 'move', dir: 'next', extend: e.shiftKey }
  if (k === 'ArrowLeft') return { type: 'move', dir: 'prev', extend: e.shiftKey }
  if (k === 'ArrowUp') return e.altKey ? { type: 'moveNote', dir: -1 } : { type: 'string', dir: -1 }
  if (k === 'ArrowDown') return e.altKey ? { type: 'moveNote', dir: 1 } : { type: 'string', dir: 1 }
  if (/^[0-9]$/.test(k)) return { type: 'fret', digit: Number(k), now }
  if (k === 'Delete') return { type: 'delete' }
  if (k === 'Backspace') return { type: 'backspace' }
  if (k === 'Escape') return { type: 'clearSelection' }
  if (k === '+' || k === '=') return { type: 'longer' }
  if (k === '-' || k === '_') return { type: 'shorter' }
  if (k === '.') return { type: 'dot' }
  switch (k.toLowerCase()) {
    case 'r':
      return { type: 'rest' }
    case 't':
      return { type: 'tie' }
    case 'h':
      return { type: 'tech', tech: 'hammer' }
    case 'p':
      return { type: 'tech', tech: 'pull' }
    case 's':
      return { type: 'tech', tech: 'slide' }
    case 'b':
      return { type: 'bend' }
    case 'v':
      return { type: 'tech', tech: 'vibrato' }
    case 'm':
      return { type: 'tech', tech: 'palmMute' }
    case 'x':
      return { type: 'tech', tech: 'dead' }
    case 'l':
      return { type: 'tech', tech: 'letRing' }
  }
  return null
}

/** Keys pressed this close together on a MIDI keyboard are entered as one chord. */
export const CHORD_WINDOW_MS = 60

/**
 * Whether a note played on a real instrument joins the previous one as a chord: always in "add to chord" mode,
 * and on MIDI when it follows the previous key within `CHORD_WINDOW_MS` (the mic hears one note at a time).
 */
export function liveJoinsChord(source: 'midi' | 'mic' | 'none', msSinceLast: number, chordMode: boolean): boolean {
  return chordMode || (source === 'midi' && msSinceLast < CHORD_WINDOW_MS)
}

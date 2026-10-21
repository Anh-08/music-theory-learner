import { describe, expect, it } from 'vitest'
import { measureFill, measureTicks, newScore, measureCapacity, type Score, type ScoreNote } from '../score'
import {
  addNoteToEvent,
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
  insertMeasure,
  insertNotes,
  insertRest,
  makeRest,
  moveToString,
  padMeasure,
  pasteMeasures,
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
  transposeChordSymbol,
  transposeEvents,
  transposeScore,
  undo,
  type Cursor,
  type DurationValue,
} from '../scoreEdit'

const q: DurationValue = { duration: 'q', dots: 0 }
const h: DurationValue = { duration: 'h', dots: 0 }
const w: DurationValue = { duration: 'w', dots: 0 }
const start: Cursor = { measure: 0, event: 0, string: 1 }
const n = (string: number, midi: number): ScoreNote => ({ string, midi })

/** Types notes one after another, like clicking the fretboard. */
function typeNotes(score: Score, values: DurationValue[], midi = 64): { score: Score; cursor: Cursor } {
  let s = score
  let c = start
  for (const v of values) ({ score: s, cursor: c } = insertNotes(s, c, [n(1, midi)], v))
  return { score: s, cursor: c }
}

describe('placing notes with bar filling', () => {
  it('fills a bar and then moves on to the next one', () => {
    const { score, cursor } = typeNotes(newScore('a', { measures: [{ events: [] }] }), [q, q, q, q, q])
    expect(score.measures[0].events).toHaveLength(4)
    expect(measureFill(score.measures[0], score.timeSig)).toBe('full')
    expect(score.measures[1].events).toHaveLength(1)
    expect(cursor).toEqual({ measure: 1, event: 1, string: 1 })
  })

  it('splits a note across the bar line with a tie', () => {
    const { score } = typeNotes(newScore('a'), [h, q, h])
    const [m0, m1] = score.measures
    expect(m0.events.map((e) => e.duration)).toEqual(['h', 'q', 'q'])
    expect(m0.events[2].tieToNext).toBe(true)
    expect(m1.events.map((e) => e.duration)).toEqual(['q'])
    expect(m1.events[0].tieToNext).toBeUndefined()
    expect(m1.events[0].notes).toEqual([n(1, 64)])
  })

  it('splits rests without ties', () => {
    let s = typeNotes(newScore('a'), [h, q]).score
    ;({ score: s } = insertRest(s, { measure: 0, event: 2, string: 1 }, h))
    expect(s.measures[0].events[2]).toMatchObject({ rest: true, duration: 'q' })
    expect(s.measures[0].events[2].tieToNext).toBeUndefined()
    expect(s.measures[1].events[0]).toMatchObject({ rest: true, duration: 'q' })
  })

  it('splits into several tied values when needed', () => {
    // 3 beats used, a whole note is entered: 1 beat fits, 3 beats (dotted half) go to the next bar.
    const { score } = typeNotes(newScore('a'), [h, q, w])
    expect(score.measures[0].events.at(-1)).toMatchObject({ duration: 'q', tieToNext: true })
    expect(score.measures[1].events[0]).toMatchObject({ duration: 'h', dots: 1 })
  })

  it('keeps the original tie on the last part', () => {
    let s = typeNotes(newScore('a'), [h, q]).score
    ;({ score: s } = insertNotes(s, { measure: 0, event: 2, string: 1 }, [n(1, 64)], h))
    s = toggleTie(s, [{ measure: 1, event: 0 }])
    expect(s.measures[1].events[0].tieToNext).toBe(true)
  })

  it('creates bars as needed at the end of the score', () => {
    const { score } = typeNotes(newScore('a', { measures: [{ events: [] }] }), [w, w, w])
    expect(score.measures).toHaveLength(3)
  })

  it('pushes events when inserting in the middle and flags the over-full bar', () => {
    let { score } = typeNotes(newScore('a'), [q, q, q, q])
    ;({ score } = insertNotes(score, { measure: 0, event: 1, string: 1 }, [n(2, 60)], q))
    expect(score.measures[0].events).toHaveLength(5)
    expect(score.measures[0].events[1].notes).toEqual([n(2, 60)])
    expect(measureFill(score.measures[0], score.timeSig)).toBe('over')
  })

  it('works in compound time', () => {
    const s0 = newScore('a', { timeSig: [6, 8], measures: [{ events: [] }] })
    const dq: DurationValue = { duration: 'q', dots: 1 }
    const { score } = typeNotes(s0, [dq, dq, dq])
    expect(score.measures[0].events).toHaveLength(2)
    expect(score.measures[1].events).toHaveLength(1)
  })
})

describe('Guitar Pro style entry', () => {
  it('creates an event on the append slot and keeps the cursor on it', () => {
    const r = setNoteAtCursor(newScore('a'), { ...start, string: 5 }, n(5, 48), q)
    expect(r.cursor).toEqual({ measure: 0, event: 0, string: 5 })
    const r2 = setNoteAtCursor(r.score, { ...r.cursor, string: 4 }, n(4, 52), q)
    expect(r2.score.measures[0].events).toHaveLength(1)
    expect(r2.score.measures[0].events[0].notes.map((x) => x.string)).toEqual([5, 4])
  })

  it('replaces the note on the same string and turns rests into notes', () => {
    let s = insertRest(newScore('a'), start, q).score
    s = setNoteAtCursor(s, start, n(1, 64), q).score
    expect(s.measures[0].events[0].rest).toBeUndefined()
    s = setNoteAtCursor(s, start, n(1, 67), q).score
    expect(s.measures[0].events[0].notes).toEqual([n(1, 67)])
  })

  it('adds notes to an event, sorted from the low string', () => {
    let s = insertNotes(newScore('a'), start, [n(1, 64)], q).score
    s = addNoteToEvent(s, { measure: 0, event: 0 }, n(3, 55))
    expect(s.measures[0].events[0].notes.map((x) => x.string)).toEqual([3, 1])
  })
})

describe('deleting', () => {
  it('removes only the note on the cursor string from a chord', () => {
    const s = insertNotes(newScore('a'), start, [n(1, 64), n(2, 60)], q).score
    const r = deleteAtCursor(s, { measure: 0, event: 0, string: 2 })
    expect(r.score.measures[0].events[0].notes).toEqual([n(1, 64)])
  })

  it('removes the event when its last note goes', () => {
    const s = typeNotes(newScore('a'), [q, q]).score
    const r = deleteAtCursor(s, { measure: 0, event: 0, string: 1 })
    expect(r.score.measures[0].events).toHaveLength(1)
    expect(r.cursor.event).toBe(0)
  })

  it('backspace deletes the event before the cursor, across bars', () => {
    const { score, cursor } = typeNotes(newScore('a'), [w, q])
    const r = backspace(score, { ...cursor, measure: 1, event: 0 })
    expect(r.score.measures[0].events).toHaveLength(0)
    expect(r.cursor).toMatchObject({ measure: 0, event: 0 })
    expect(backspace(newScore('a'), start).score.measures[0].events).toHaveLength(0)
  })
})

describe('cursor movement', () => {
  it('stops on the append slot of a bar that is not full', () => {
    const { score } = typeNotes(newScore('a'), [q])
    expect(cursorNext(score, start)).toMatchObject({ measure: 0, event: 1 })
    expect(cursorNext(score, { ...start, event: 1 })).toMatchObject({ measure: 1, event: 0 })
  })

  it('jumps over the append slot of a full bar', () => {
    const { score } = typeNotes(newScore('a'), [w])
    expect(cursorNext(score, start)).toMatchObject({ measure: 1, event: 0 })
  })

  it('stays inside the score', () => {
    const s = newScore('a', { measures: [{ events: [] }] })
    expect(cursorNext(s, start)).toEqual(start)
    expect(cursorPrev(s, start)).toEqual(start)
    const { score } = typeNotes(newScore('a'), [h, h, q])
    expect(cursorPrev(score, { measure: 1, event: 0, string: 1 })).toMatchObject({ measure: 0, event: 1 })
  })

  it('finds the hand position from the notes before the cursor', () => {
    let s = insertNotes(newScore('a'), start, [n(1, 64 + 7)], q).score // fret 7
    ;({ score: s } = insertNotes(s, { ...start, event: 1 }, [n(1, 64)], q)) // open string
    expect(fretNear(s, { measure: 0, event: 2 })).toBe(0)
    expect(fretNear(s, { measure: 0, event: 1 })).toBe(0)
    expect(fretNear(s, { measure: 0, event: 0 })).toBe(7)
    expect(fretNear(newScore('a'), start)).toBeUndefined()
  })
})

describe('changing values', () => {
  it('changes duration, dots, triplets and rests over a range', () => {
    const { score } = typeNotes(newScore('a'), [q, q, q, q])
    const refs = refsInRange(score, { measure: 0, event: 2 }, { measure: 0, event: 1 })
    expect(refs).toEqual([
      { measure: 0, event: 1 },
      { measure: 0, event: 2 },
    ])
    let s = setDuration(score, refs, '8')
    expect(s.measures[0].events.map((e) => e.duration)).toEqual(['q', '8', '8', 'q'])
    s = toggleDot(s, refs)
    expect(s.measures[0].events[1].dots).toBe(1)
    s = toggleTriplet(s, refs)
    expect(s.measures[0].events[1].tuplet).toBe(3)
    s = toggleTriplet(s, refs)
    expect('tuplet' in s.measures[0].events[1]).toBe(false)
    s = makeRest(s, refs)
    expect(s.measures[0].events[2]).toMatchObject({ rest: true, notes: [] })
  })

  it('pads a short bar with rests but leaves empty bars alone', () => {
    const { score } = typeNotes(newScore('a'), [q, { duration: '8', dots: 0 }])
    const s = padMeasure(score, 0)
    expect(measureTicks(s.measures[0])).toBe(measureCapacity(s.timeSig))
    expect(s.measures[0].events.slice(2).every((e) => e.rest)).toBe(true)
    expect(padMeasure(s, 1)).toBe(s)
  })

  it('toggles techniques, with only one bend at a time', () => {
    let s = insertNotes(newScore('a'), start, [n(1, 64), n(2, 60)], q).score
    const ref = { measure: 0, event: 0 }
    s = toggleTechnique(s, ref, 'bendHalf', 2)
    s = toggleTechnique(s, ref, 'bendFull', 2)
    expect(s.measures[0].events[0].notes.find((x) => x.string === 2)!.tech).toEqual(['bendFull'])
    expect(s.measures[0].events[0].notes.find((x) => x.string === 1)!.tech).toBeUndefined()
    s = toggleTechnique(s, ref, 'palmMute')
    expect(s.measures[0].events[0].notes.every((x) => x.tech?.includes('palmMute'))).toBe(true)
    s = toggleTechnique(s, ref, 'palmMute')
    expect(s.measures[0].events[0].notes.some((x) => x.tech?.includes('palmMute'))).toBe(false)
  })

  it('moves a note to a neighbouring string, keeping its pitch', () => {
    const s = insertNotes(newScore('a'), start, [n(2, 64)], q).score // string 2 fret 5
    const r = moveToString(s, { measure: 0, event: 0 }, 2, 1)
    expect(r.string).toBe(3)
    expect(r.score.measures[0].events[0].notes).toEqual([n(3, 64)]) // string 3 fret 9
    const blocked = moveToString(s, { measure: 0, event: 0 }, 2, -1) // string 1 fret 0 — fine
    expect(blocked.string).toBe(1)
    const tooLow = moveToString(insertNotes(newScore('a'), start, [n(5, 45)], q).score, { measure: 0, event: 0 }, 5, 1)
    expect(tooLow.string).toBe(6)
    const none = moveToString(insertNotes(newScore('a'), start, [n(6, 40)], q).score, { measure: 0, event: 0 }, 6, -1)
    expect(none.string).toBe(6) // E2 cannot be played on string 5
  })
})

describe('transposing', () => {
  it('keeps strings when the note is still playable', () => {
    const s = insertNotes(newScore('a'), start, [n(5, 48)], q).score // C3 on string 5 fret 3
    const t = transposeEvents(s, [{ measure: 0, event: 0 }], 2)
    expect(t.measures[0].events[0].notes).toEqual([n(5, 50)])
  })

  it('re-fingers notes that fall off the neck', () => {
    const s = insertNotes(newScore('a'), start, [n(6, 41)], q).score // F2 string 6 fret 1
    const t = transposeEvents(s, [{ measure: 0, event: 0 }], -2) // D#2 — below string 6
    expect(t.measures[0].events[0].notes[0].midi).toBe(39)
    expect(t.measures[0].events[0].notes[0].string).toBe(6) // nothing can play it: stays, flagged as unplayable
    const up = insertNotes(newScore('a'), start, [n(1, 64 + 22)], q).score
    const t2 = transposeEvents(up, [{ measure: 0, event: 0 }], 5)
    expect(t2.measures[0].events[0].notes[0].string).toBe(1) // fret 27 does not exist on any string either
  })

  it('transposes the key and chord symbols with sensible spelling', () => {
    let s = newScore('a', { keySig: 'C' })
    s = setChord(s, 0, 0, 'F#m7/C#')
    const t = transposeScore(s, 1)
    expect(t.keySig).toBe('Db')
    expect(t.measures[0].chords![0].symbol).toBe('Gm7/D')
    expect(transposeScore(newScore('a', { keySig: 'Am' }), 2).keySig).toBe('Bm')
    expect(transposeScore(newScore('a', { keySig: 'G' }), -2).keySig).toBe('F')
  })

  it('transposes chord symbols', () => {
    expect(transposeChordSymbol('C', 2, false)).toBe('D')
    expect(transposeChordSymbol('Bb7', 2, false)).toBe('C7')
    expect(transposeChordSymbol('A', 1, true)).toBe('Bb')
    expect(transposeChordSymbol('C6/9', 2, false)).toBe('D6/9')
  })
})

describe('bars, repeats and chords', () => {
  it('inserts, deletes, copies and pastes bars', () => {
    let { score } = typeNotes(newScore('a', { measures: [{ events: [] }, { events: [] }] }), [w, h])
    score = insertMeasure(score, 1)
    expect(score.measures.map((m) => m.events.length)).toEqual([1, 0, 1])
    const copy = copyMeasures(score, 0, 0)
    score = pasteMeasures(score, 3, copy)
    expect(score.measures).toHaveLength(4)
    expect(score.measures[3].events[0]).not.toBe(score.measures[0].events[0])
    score = duplicateMeasures(score, 0, 1)
    expect(score.measures.map((m) => m.events.length)).toEqual([1, 0, 1, 0, 1, 1])
    expect(deleteMeasures(score, 0, 5).measures).toEqual([{ events: [] }])
  })

  it('sets repeat signs and endings', () => {
    let s = toggleRepeatStart(newScore('a'), 0)
    expect(s.measures[0].repeatStart).toBe(true)
    s = setRepeatEnd(s, 2, 3)
    expect(s.measures[2].repeatEnd).toEqual({ times: 3 })
    s = setEnding(s, 2, [1, 1])
    expect(s.measures[2].ending).toEqual([1])
    s = toggleRepeatStart(setRepeatEnd(setEnding(s, 2, null), 2, null), 0)
    expect(s.measures[0]).toEqual({ events: [] })
    expect(s.measures[2]).toEqual({ events: [] })
  })

  it('sets and removes chord symbols in tick order', () => {
    let s = setChord(newScore('a'), 0, 960, 'G')
    s = setChord(s, 0, 0, ' C ')
    expect(s.measures[0].chords).toEqual([
      { tick: 0, symbol: 'C' },
      { tick: 960, symbol: 'G' },
    ])
    s = setChord(setChord(s, 0, 0, null), 0, 960, '')
    expect(s.measures[0].chords).toBeUndefined()
  })
})

describe('undo / redo', () => {
  it('walks back and forth through states', () => {
    const a = newScore('a')
    const b = insertNotes(a, start, [n(1, 64)], q).score
    const c = insertNotes(b, { ...start, event: 1 }, [n(1, 65)], q).score
    let hist = commit(commit(createHistory(a), b), c)
    expect(commit(hist, c)).toBe(hist)
    hist = undo(hist)
    expect(hist.present).toBe(b)
    hist = undo(undo(hist))
    expect(hist.present).toBe(a)
    hist = redo(hist)
    expect(hist.present).toBe(b)
    hist = commit(hist, a)
    expect(hist.future).toEqual([])
    expect(redo(hist)).toBe(hist)
  })

  it('keeps at most 100 steps', () => {
    let hist = createHistory(newScore('a'))
    for (let i = 0; i < 150; i++) hist = commit(hist, newScore(String(i)))
    expect(hist.past).toHaveLength(100)
  })
})

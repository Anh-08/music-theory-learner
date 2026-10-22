import { describe, expect, it } from 'vitest'
import { measureCapacity, measureTicks, newScore, type Score } from '../../theory/score'
import { editorReducer, initEditor, keyToAction, liveJoinsChord, type EditorAction, type EditorState } from './editorState'

const run = (s: EditorState, ...actions: EditorAction[]) => actions.reduce(editorReducer, s)
const sc = (s: EditorState): Score => s.history.present
const fresh = () => initEditor(newScore('a'))

describe('sheet editor state', () => {
  it('types two-digit frets when the second digit follows quickly', () => {
    let s = run(fresh(), { type: 'string', dir: 1 }) // string 4
    s = run(s, { type: 'fret', digit: 1, now: 1000 }, { type: 'fret', digit: 2, now: 1200 })
    const e = sc(s).measures[0].events[0]
    expect(e.notes).toEqual([{ midi: 50 + 12, string: 4 }]) // D3 + 12 frets
    expect(sc(s).measures[0].events).toHaveLength(1)
  })

  it('treats a slow second digit as a new fret', () => {
    const s = run(fresh(), { type: 'fret', digit: 1, now: 0 }, { type: 'fret', digit: 3, now: 5000 })
    expect(sc(s).measures[0].events[0].notes[0].midi).toBe(55 + 3) // string 3 (G3) fret 3
  })

  it('builds chords by typing on several strings of the same event', () => {
    const s = run(fresh(), { type: 'fret', digit: 2, now: 0 }, { type: 'string', dir: -1 }, { type: 'fret', digit: 3, now: 100 })
    expect(sc(s).measures[0].events[0].notes.map((n) => n.string)).toEqual([3, 2])
  })

  it('inserts fretboard clicks and moves on; shift-click adds to the chord', () => {
    let s = run(fresh(), { type: 'insert', notes: [{ midi: 45, string: 5 }] })
    expect(s.cursor).toMatchObject({ measure: 0, event: 1, string: 5 })
    s = run(s, { type: 'addToChord', note: { midi: 52, string: 4 } })
    expect(sc(s).measures[0].events).toHaveLength(1)
    expect(sc(s).measures[0].events[0].notes).toHaveLength(2)
  })

  it('chooses strings for piano / MIDI notes near the hand', () => {
    let s = run(fresh(), { type: 'insert', notes: [{ midi: 45 + 7, string: 5 }] }) // string 5 fret 7
    s = run(s, { type: 'insertMidi', midi: 57 })
    expect(sc(s).measures[0].events[1].notes[0]).toEqual({ midi: 57, string: 4 }) // fret 7 on string 4, not open string 3 + 2
    s = run(s, { type: 'insertMidi', midi: 62, chord: true })
    expect(sc(s).measures[0].events[1].notes.map((n) => n.string)).toEqual([4, 3])
  })

  it('applies duration changes to the selection and remembers the value', () => {
    let s = fresh()
    for (let i = 0; i < 4; i++) s = run(s, { type: 'insert', notes: [{ midi: 64, string: 1 }] })
    s = run(s, { type: 'goto', cursor: { measure: 0, event: 0, string: 1 } }, { type: 'move', dir: 'next', extend: true }, { type: 'duration', duration: '16' })
    expect(sc(s).measures[0].events.map((e) => e.duration)).toEqual(['16', '16', '8', '8'])
    expect(s.value.duration).toBe('16')
    expect(s.anchor).not.toBeNull()
    s = run(s, { type: 'clearSelection' }, { type: 'longer' })
    expect(sc(s).measures[0].events[1].duration).toBe('8')
  })

  it('pads a short bar when the cursor leaves it', () => {
    let s = run(fresh(), { type: 'insert', notes: [{ midi: 64, string: 1 }] })
    s = run(s, { type: 'goto', cursor: { measure: 2, event: 0, string: 1 } })
    const m0 = sc(s).measures[0]
    expect(measureTicks(m0)).toBe(measureCapacity(sc(s).timeSig))
    expect(m0.events.slice(1).every((e) => e.rest)).toBe(true)
  })

  it('undoes and redoes edits', () => {
    let s = run(fresh(), { type: 'insert', notes: [{ midi: 64, string: 1 }] }, { type: 'insert', notes: [{ midi: 65, string: 1 }] })
    s = run(s, { type: 'undo' })
    expect(sc(s).measures[0].events).toHaveLength(1)
    s = run(s, { type: 'redo' })
    expect(sc(s).measures[0].events).toHaveLength(2)
    s = run(s, { type: 'undo' }, { type: 'undo' }, { type: 'undo' })
    expect(sc(s).measures[0].events).toHaveLength(0)
  })

  it('cycles bends on the cursor string', () => {
    let s = run(fresh(), { type: 'fret', digit: 7, now: 0 })
    const tech = () => sc(s).measures[0].events[0].notes[0].tech
    s = run(s, { type: 'bend' })
    expect(tech()).toEqual(['bendHalf'])
    s = run(s, { type: 'bend' })
    expect(tech()).toEqual(['bendFull'])
    s = run(s, { type: 'bend' })
    expect(tech()).toBeUndefined()
  })

  it('deletes a selection of events', () => {
    let s = fresh()
    for (let i = 0; i < 4; i++) s = run(s, { type: 'insert', notes: [{ midi: 64 + i, string: 1 }] })
    s = run(s, { type: 'goto', cursor: { measure: 0, event: 1, string: 1 } }, { type: 'move', dir: 'next', extend: true }, { type: 'delete' })
    expect(sc(s).measures[0].events.map((e) => e.notes[0].midi)).toEqual([64, 67])
    expect(s.cursor.event).toBe(1)
  })

  it('copies bars and pastes over an empty bar', () => {
    let s = run(fresh(), { type: 'insert', notes: [{ midi: 64, string: 1 }] }, { type: 'copy' })
    s = run(s, { type: 'goto', cursor: { measure: 3, event: 0, string: 1 } }, { type: 'paste' })
    expect(sc(s).measures).toHaveLength(4)
    expect(sc(s).measures[3].events[0].notes[0].midi).toBe(64)
    s = run(s, { type: 'goto', cursor: { measure: 0, event: 0, string: 1 } }, { type: 'paste' })
    expect(sc(s).measures).toHaveLength(5)
  })

  it('writes chord symbols at the cursor position', () => {
    let s = run(fresh(), { type: 'insert', notes: [{ midi: 64, string: 1 }] }, { type: 'chord', symbol: 'G' })
    expect(sc(s).measures[0].chords).toEqual([{ tick: 240, symbol: 'G' }]) // after one eighth note
    s = run(s, { type: 'move', dir: 'prev' }, { type: 'chord', symbol: 'Em' })
    expect(sc(s).measures[0].chords![0]).toEqual({ tick: 0, symbol: 'Em' })
  })

  it('inserts a chord shape with its symbol where it lands', () => {
    let s = fresh()
    for (let i = 0; i < 8; i++) s = run(s, { type: 'insert', notes: [{ midi: 64, string: 1 }] })
    s = run(s, { type: 'insertShape', symbol: 'C', notes: [{ midi: 48, string: 5 }, { midi: 52, string: 4 }] })
    expect(sc(s).measures[1].events[0].notes).toHaveLength(2)
    expect(sc(s).measures[1].chords).toEqual([{ tick: 0, symbol: 'C' }])
  })

  it('re-fingers notes when switching to an instrument with fewer strings', () => {
    let s = run(fresh(), { type: 'insert', notes: [{ midi: 40, string: 6 }] }, { type: 'meta', patch: { tuning: 'bass4' } })
    const n = sc(s).measures[0].events[0].notes[0]
    expect(n.midi).toBe(40)
    expect(n.string).toBeLessThanOrEqual(4)
    expect(s.cursor.string).toBeLessThanOrEqual(4)
    s = run(s, { type: 'meta', patch: { tempo: 999, capo: -3 } })
    expect(sc(s).tempo).toBe(300)
    expect(sc(s).capo).toBe(0)
  })

  it('transposes the selection or the whole score', () => {
    let s = run(fresh(), { type: 'insert', notes: [{ midi: 64, string: 1 }] }, { type: 'insert', notes: [{ midi: 65, string: 1 }] })
    s = run(s, { type: 'transpose', semitones: 2 })
    expect(sc(s).keySig).toBe('D')
    expect(sc(s).measures[0].events.map((e) => e.notes[0].midi)).toEqual([66, 67])
    s = run(s, { type: 'goto', cursor: { measure: 0, event: 0, string: 1 } }, { type: 'move', dir: 'next', extend: true }, { type: 'move', dir: 'prev', extend: true }, { type: 'transpose', semitones: -1 })
    expect(sc(s).keySig).toBe('D')
    expect(sc(s).measures[0].events.map((e) => e.notes[0].midi)).toEqual([65, 67])
  })
})

describe('keyboard shortcuts', () => {
  it('maps keys to actions', () => {
    expect(keyToAction({ key: '7' }, 5)).toEqual({ type: 'fret', digit: 7, now: 5 })
    expect(keyToAction({ key: 'ArrowRight', shiftKey: true }, 0)).toEqual({ type: 'move', dir: 'next', extend: true })
    expect(keyToAction({ key: 'ArrowUp', altKey: true }, 0)).toEqual({ type: 'moveNote', dir: -1 })
    expect(keyToAction({ key: 'z', ctrlKey: true }, 0)).toEqual({ type: 'undo' })
    expect(keyToAction({ key: 'Z', metaKey: true, shiftKey: true }, 0)).toEqual({ type: 'redo' })
    expect(keyToAction({ key: 'H' }, 0)).toEqual({ type: 'tech', tech: 'hammer' })
    expect(keyToAction({ key: '+' }, 0)).toEqual({ type: 'longer' })
    expect(keyToAction({ key: 'q' }, 0)).toBeNull()
    expect(keyToAction({ key: 'a', ctrlKey: true }, 0)).toBeNull()
  })
})

describe('real-instrument entry', () => {
  it('groups MIDI keys pressed together into a chord', () => {
    expect(liveJoinsChord('midi', 20, false)).toBe(true)
    expect(liveJoinsChord('midi', 300, false)).toBe(false)
    expect(liveJoinsChord('mic', 20, false)).toBe(false)
    expect(liveJoinsChord('mic', 900, true)).toBe(true)
  })
})

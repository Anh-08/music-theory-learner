import { describe, expect, it } from 'vitest'
import { parseAsciiTab, scoreToAsciiTab } from '../asciiTab'
import { scoreToMusicXml } from '../musicXml'
import { fretOf, midiAt, newScore, type Measure, type Score, type ScoreEvent, type Technique } from '../score'

const base = newScore('x')
const ev = (duration: ScoreEvent['duration'], positions: string, tech: Technique[] = [], extra: Partial<ScoreEvent> = {}): ScoreEvent => {
  const notes = positions
    .split(' ')
    .filter(Boolean)
    .map((p) => {
      const [s, f] = p.split(':').map(Number)
      return { midi: midiAt(base, s, f), string: s, ...(tech.length ? { tech } : {}) }
    })
  return notes.length ? { duration, dots: 0, notes, ...extra } : { duration, dots: 0, notes: [], rest: true }
}

const lick: Score = newScore('a', {
  title: 'Lick <1>',
  keySig: 'Am',
  tempo: 96,
  measures: [
    {
      events: [ev('8', '3:5', ['hammer']), ev('8', '3:7'), ev('8', '2:5'), ev('8', '2:8', ['pull']), ev('8', '2:5'), ev('8', '3:7', ['bendFull']), ev('q', '4:7 3:5')],
      chords: [{ tick: 0, symbol: 'Am7' }],
      repeatStart: true,
    },
    { events: [ev('h', '4:7', [], { tieToNext: true }), ev('q', '4:7'), ev('q', '')], repeatEnd: { times: 2 } },
    { events: [] },
  ] as Measure[],
})

describe('ASCII tab export', () => {
  const text = scoreToAsciiTab(lick)
  const lines = text.split('\n')

  it('writes a header and one line per string, top string first', () => {
    expect(lines[0]).toBe('Lick <1>')
    expect(lines[1]).toContain('4/4 · 96 BPM')
    const strings = lines.filter((l) => /^[A-Ga-g] \|/.test(l) || /^[A-Ga-g]\|/.test(l))
    expect(strings.map((l) => l[0])).toEqual(['e', 'B', 'G', 'D', 'A', 'E'])
    expect(new Set(strings.map((l) => l.length)).size).toBe(1)
  })

  it('writes frets with techniques and chord symbols', () => {
    const g = lines.find((l) => l.startsWith('G'))!
    expect(g).toContain('5h')
    expect(g).toContain('7b9')
    expect(lines.find((l) => l.startsWith('B'))!).toContain('8p')
    expect(text).toContain('Am7')
  })

  it('reads back the same notes', () => {
    const back = parseAsciiTab(text, 'b')!
    expect(back).not.toBeNull()
    const notes = (s: Score) => s.measures.flatMap((m) => m.events.filter((e) => !e.rest).map((e) => e.notes.map((n) => `${n.string}:${fretOf(s, n)}`).sort().join(' ')))
    // The tied note is written twice in the tab text, so it comes back as two notes.
    expect(notes(back.score)).toEqual(notes(lick))
    const tech = back.score.measures.flatMap((m) => m.events.flatMap((e) => e.notes.flatMap((n) => n.tech ?? [])))
    expect(tech).toEqual(['hammer', 'pull', 'bendFull'])
  })
})

describe('ASCII tab import', () => {
  const forum = `
Intro riff (play twice)

e|-----------------|-----------------|
B|-----------------|-----------------|
G|-----------------|-----------------|
D|---------2-------|---------0-------|
A|-----3-------3---|-----2-------2---|
E|-3-------------x-|-0---------------|

Some words after the tab.
`
  it('reads notes column by column into bars of eighths', () => {
    const r = parseAsciiTab(forum, 'f')!
    const s = r.score
    expect(s.tuning).toBe('standard')
    const events = s.measures.flatMap((m) => m.events)
    expect(events.map((e) => e.notes.map((n) => `${n.string}:${fretOf(s, n)}`).join(' '))).toEqual(['6:3', '5:3', '4:2', '5:3', '6:0', '6:0', '5:2', '4:0', '5:2'])
    expect(events[4].notes[0].tech).toEqual(['dead'])
    expect(events.every((e) => e.duration === '8')).toBe(true)
    expect(s.measures[0].events).toHaveLength(8)
    expect(r.skipped).toBe(0)
  })

  it('handles two-digit frets and chords', () => {
    const tab = `e|--12--15h17--|\nB|--12---------|\nG|-------------|\nD|-------------|\nA|-------------|\nE|-------------|`
    const s = parseAsciiTab(tab, 'g')!.score
    const events = s.measures[0].events
    expect(events).toHaveLength(3)
    expect(events[0].notes.map((n) => fretOf(s, n)).sort()).toEqual([12, 12])
    expect(events[1].notes[0].tech).toEqual(['hammer'])
  })

  it('guesses bass tuning from four lines and refuses text without tab', () => {
    const bass = `G|------|\nD|------|\nA|--3---|\nE|------|`
    expect(parseAsciiTab(bass, 'h')!.score.tuning).toBe('bass4')
    expect(parseAsciiTab('just some words\nand more', 'i')).toBeNull()
  })
})

describe('MusicXML export', () => {
  const xml = scoreToMusicXml(lick)
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const all = (sel: string) => [...doc.querySelectorAll(sel)]

  it('is well-formed with one measure per bar', () => {
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(all('measure')).toHaveLength(3)
    expect(doc.querySelector('work-title')!.textContent).toBe('Lick <1>')
  })

  it('writes key, time, clef and tempo', () => {
    expect(doc.querySelector('key fifths')!.textContent).toBe('0')
    expect(doc.querySelector('key mode')!.textContent).toBe('minor')
    expect(doc.querySelector('time beats')!.textContent).toBe('4')
    expect(doc.querySelector('clef clef-octave-change')!.textContent).toBe('-1')
    expect(doc.querySelector('sound')!.getAttribute('tempo')).toBe('96')
    expect(all('staff-tuning')).toHaveLength(6)
  })

  it('writes notes with string, fret, chords, ties and rests', () => {
    const notes = all('note')
    const first = notes[0]
    expect(first.querySelector('pitch step')!.textContent).toBe('C')
    expect(first.querySelector('pitch octave')!.textContent).toBe('4')
    expect(first.querySelector('technical string')!.textContent).toBe('3')
    expect(first.querySelector('technical fret')!.textContent).toBe('5')
    expect(first.querySelector('hammer-on')!.getAttribute('type')).toBe('start')
    expect(notes[1].querySelector('hammer-on')!.getAttribute('type')).toBe('stop')
    expect(all('note chord')).toHaveLength(1)
    expect(all('tie[type="start"]')).toHaveLength(1)
    expect(all('tie[type="stop"]')).toHaveLength(1)
    expect(all('rest')).toHaveLength(2)
    expect(doc.querySelector('rest[measure="yes"]')).not.toBeNull()
    expect(doc.querySelector('bend bend-alter')!.textContent).toBe('2')
  })

  it('writes chord symbols and repeats', () => {
    expect(doc.querySelector('harmony root-step')!.textContent).toBe('A')
    expect(doc.querySelector('harmony kind')!.textContent).toBe('minor-seventh')
    expect(doc.querySelector('repeat[direction="forward"]')).not.toBeNull()
    expect(doc.querySelector('repeat[direction="backward"]')!.getAttribute('times')).toBe('2')
  })

  it('counts compound-meter tempo in dotted quarters', () => {
    const x = scoreToMusicXml(newScore('c', { timeSig: [6, 8], tempo: 60 }))
    const d = new DOMParser().parseFromString(x, 'application/xml')
    expect(d.querySelector('beat-unit-dot')).not.toBeNull()
    expect(d.querySelector('sound')!.getAttribute('tempo')).toBe('90')
  })
})

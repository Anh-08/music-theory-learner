import { describe, expect, it } from 'vitest'
import {
  TICKS_PER_QUARTER,
  chooseString,
  eventTicks,
  fretOf,
  isPlayable,
  measureCapacity,
  measureFill,
  midiAt,
  newScore,
  spellMidi,
  ticksToDurations,
  type ScoreEvent,
} from '../score'

const Q = TICKS_PER_QUARTER
const ev = (duration: ScoreEvent['duration'], dots: 0 | 1 | 2 = 0, tuplet?: 3): ScoreEvent => ({ duration, dots, tuplet, notes: [], rest: true })

describe('score durations', () => {
  it('gives every value a whole number of ticks', () => {
    expect(eventTicks(ev('q'))).toBe(Q)
    expect(eventTicks(ev('w'))).toBe(4 * Q)
    expect(eventTicks(ev('8', 1))).toBe(0.75 * Q)
    expect(eventTicks(ev('h', 2))).toBe(3.5 * Q)
    expect(eventTicks(ev('8', 0, 3))).toBe(Q / 3)
    for (const d of ['w', 'h', 'q', '8', '16', '32'] as const) {
      for (const dots of [0, 1, 2] as const) {
        for (const t of [undefined, 3] as const) expect(Number.isInteger(eventTicks(ev(d, dots, t)))).toBe(true)
      }
    }
  })

  it('measures bar length from the time signature', () => {
    expect(measureCapacity([4, 4])).toBe(4 * Q)
    expect(measureCapacity([3, 4])).toBe(3 * Q)
    expect(measureCapacity([6, 8])).toBe(3 * Q)
    expect(measureCapacity([7, 8])).toBe(3.5 * Q)
  })

  it('reports how full a bar is', () => {
    expect(measureFill({ events: [] }, [4, 4])).toBe('empty')
    expect(measureFill({ events: [ev('h')] }, [4, 4])).toBe('short')
    expect(measureFill({ events: [ev('h'), ev('h')] }, [4, 4])).toBe('full')
    expect(measureFill({ events: [ev('h', 1), ev('h')] }, [4, 4])).toBe('over')
    expect(measureFill({ events: [ev('q', 1), ev('q', 1)] }, [6, 8])).toBe('full')
  })

  it('splits lengths into written values, longest first', () => {
    expect(ticksToDurations(4 * Q)).toEqual([{ duration: 'w', dots: 0 }])
    expect(ticksToDurations(3 * Q)).toEqual([{ duration: 'h', dots: 1 }])
    expect(ticksToDurations(1.25 * Q)).toEqual([
      { duration: 'q', dots: 0 },
      { duration: '16', dots: 0 },
    ])
    expect(ticksToDurations((2 * Q) / 3)).toEqual([{ duration: 'q', dots: 0, tuplet: 3 }])
    expect(ticksToDurations(0)).toEqual([])
    expect(ticksToDurations(7)).toBeNull()
  })
})

describe('score pitch and frets', () => {
  const score = newScore('a')

  it('derives frets from pitch and string', () => {
    expect(fretOf(score, { midi: 40, string: 6 })).toBe(0)
    expect(fretOf(score, { midi: 45, string: 6 })).toBe(5)
    expect(fretOf(score, { midi: 64, string: 1 })).toBe(0)
    expect(midiAt(score, 3, 2)).toBe(57) // A3
  })

  it('counts frets from the capo', () => {
    const capo2 = { ...score, capo: 2 }
    expect(midiAt(capo2, 6, 0)).toBe(42)
    expect(fretOf(capo2, { midi: 45, string: 6 })).toBe(3)
    expect(isPlayable(capo2, { midi: 41, string: 6 })).toBe(false)
  })

  it('follows the tuning', () => {
    expect(midiAt({ ...score, tuning: 'drop-d' }, 6, 0)).toBe(38)
  })

  it('chooses the string nearest the hand', () => {
    expect(chooseString(score, 45)).toBe(5) // A2: open string 5 is closest to fret 2
    expect(chooseString(score, 45, { nearFret: 5 })).toBe(6) // string 6 fret 5
    expect(chooseString(score, 45, { taken: [5] })).toBe(6)
    expect(chooseString(score, 64, { nearFret: 12 })).toBe(4) // E4: string 4 fret 14 is 2 frets away, string 3 fret 9 is 3
  })

  it('returns null when no string can play the pitch', () => {
    expect(chooseString(score, 30)).toBeNull()
    expect(chooseString(score, 45, { taken: [5, 6] })).toBeNull()
  })
})

describe('spelling notes for the key', () => {
  const key = (tonic: string, mode: 'major' | 'minor' = 'major') => ({ tonic, mode })

  it('uses the key signature', () => {
    expect(spellMidi(70, key('F'))).toBe('Bb4')
    expect(spellMidi(68, key('E'))).toBe('G#4')
    expect(spellMidi(60, key('C'))).toBe('C4')
  })

  it('writes notes outside the key with sharps, or flats in flat keys', () => {
    expect(spellMidi(61, key('C'))).toBe('C#4')
    expect(spellMidi(61, key('Bb'))).toBe('Db4')
  })

  it('keeps the raised 6th and 7th in minor keys', () => {
    expect(spellMidi(61, key('D', 'minor'))).toBe('C#4')
    expect(spellMidi(68, key('A', 'minor'))).toBe('G#4')
  })

  it('keeps the octave right for Cb and B#', () => {
    expect(spellMidi(59, key('Gb'))).toBe('Cb4')
    expect(spellMidi(60, key('C#'))).toBe('B#3')
  })
})

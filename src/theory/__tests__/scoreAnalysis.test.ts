import { describe, expect, it } from 'vitest'
import { parseProgression } from '../progression'
import { newScore, type Measure, type ScoreEvent } from '../score'
import { analyzeScore, chordLabel, chordsAtEvents, progressionFromScore, scaleChromas, scoreFromProgression } from '../scoreAnalysis'

const n = (midi: number, duration: ScoreEvent['duration'] = 'q'): ScoreEvent => ({ duration, dots: 0, notes: [{ midi, string: 1 }] })
const chord = (s: string) => parseProgression(s)[0]

describe('chord in effect', () => {
  it('carries chord symbols forward across bars, including empty ones', () => {
    const measures: Measure[] = [
      { events: [n(60), n(62)], chords: [{ tick: 480, symbol: 'G7' }] },
      { events: [], chords: [{ tick: 0, symbol: 'C' }] },
      { events: [n(64)] },
    ]
    const at = chordsAtEvents({ measures })
    expect(at.get('0:0')).toBeNull()
    expect(at.get('0:1')!.symbol).toBe('G7')
    expect(at.get('2:0')!.symbol).toBe('C')
  })

  it('applies a symbol written inside a note to that note', () => {
    const at = chordsAtEvents({ measures: [{ events: [n(60, 'h')], chords: [{ tick: 480, symbol: 'Am' }] }] })
    expect(at.get('0:0')!.symbol).toBe('Am')
  })
})

describe('labels', () => {
  it('names notes against the chord, with the chord’s own spelling', () => {
    expect(chordLabel(64, chord('C'))).toBe('3')
    expect(chordLabel(63, chord('Cm'))).toBe('♭3')
    expect(chordLabel(68, chord('Caug'))).toBe('♯5')
    expect(chordLabel(69, chord('Cdim7'))).toBe('♭♭7')
    expect(chordLabel(70, chord('C7'))).toBe('♭7')
    expect(chordLabel(62, chord('C'))).toBe('2') // not a chord tone
    expect(chordLabel(66, chord('C'))).toBe('♭5')
  })

  it('labels events and their role', () => {
    const score = newScore('a', {
      keySig: 'Am',
      measures: [{ events: [n(69), n(72), n(71), n(70)], chords: [{ tick: 0, symbol: 'Am' }] }],
    })
    const byChord = analyzeScore(score, 'chord')
    expect(byChord.map((x) => x.label)).toEqual(['1', '♭3', '2', '♭2'])
    expect(byChord.map((x) => x.role)).toEqual(['chord', 'chord', 'scale', 'outside'])
    expect(byChord[0].chord).toBe('Am')
    expect(analyzeScore(score, 'key').map((x) => x.label)).toEqual(['1', '♭3', '2', '♭2'])
    expect(analyzeScore(score, 'off').every((x) => x.label === '')).toBe(true)
  })

  it('checks against another scale', () => {
    const score = newScore('a', { keySig: 'Am', measures: [{ events: [n(71)] }] }) // B — in A minor, not in A minor pentatonic
    expect(analyzeScore(score, 'key', 'key')[0].role).toBe('scale')
    expect(analyzeScore(score, 'key', 'minor pentatonic')[0].role).toBe('outside')
    expect(scaleChromas({ tonic: 'A', mode: 'minor' }, 'blues').has(3)).toBe(true) // E♭, the blue note
  })

  it('labels small chords note by note, low to high', () => {
    const e: ScoreEvent = { duration: 'q', dots: 0, notes: [{ midi: 64, string: 1 }, { midi: 55, string: 3 }] }
    const score = newScore('a', { measures: [{ events: [e], chords: [{ tick: 0, symbol: 'C' }] }] })
    expect(analyzeScore(score, 'chord')[0].label).toBe('5 3')
  })

  it('skips rests', () => {
    const score = newScore('a', { measures: [{ events: [{ duration: 'q', dots: 0, notes: [], rest: true }, n(60)] }] })
    expect(analyzeScore(score, 'key').map((x) => x.ref.event)).toEqual([1])
  })
})

describe('Jam Room bridge', () => {
  it('turns chord symbols into a progression, one chord per bar', () => {
    const measures: Measure[] = [
      { events: [], chords: [{ tick: 0, symbol: 'A7' }] },
      { events: [] },
      { events: [], chords: [{ tick: 960, symbol: 'E7' }, { tick: 0, symbol: 'D7' }] },
      { events: [], chords: [{ tick: 0, symbol: 'A7' }] },
    ]
    expect(progressionFromScore({ measures })).toBe('A7*2 D7 A7')
    expect(progressionFromScore({ measures: [{ events: [] }] })).toBeNull()
  })

  it('builds an empty score from a progression', () => {
    const s = scoreFromProgression('j', parseProgression('Am*2 F C G'), { tonic: 'A', mode: 'minor' }, 96, 3, 'Jam')
    expect(s.measures).toHaveLength(5)
    expect(s.measures.map((m) => m.chords?.[0].symbol ?? '-')).toEqual(['Am', '-', 'F', 'C', 'G'])
    expect(s.timeSig).toEqual([3, 4])
    expect(s.keySig).toBe('Am')
    expect(progressionFromScore(s)).toBe('Am*2 F C G')
  })
})

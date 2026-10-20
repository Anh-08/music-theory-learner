import { describe, expect, it } from 'vitest'
import { parseProgression } from '../../theory'
import { GROOVES, groove } from '../grooves'
import { buildJamEvents, loopBeats } from '../jamEvents'

describe('buildJamEvents', () => {
  const chords = parseProgression('C G Am F*2')

  it('has a "bar" event at the start of every bar', () => {
    const e = buildJamEvents(chords, groove('pop'), 'piano')
    expect(e.filter((x) => x.kind === 'bar').map((x) => x.beat)).toEqual([0, 4, 8, 12, 16])
    expect(loopBeats(chords)).toBe(20)
  })

  it('bass plays the chord root at the start of the bar', () => {
    const e = buildJamEvents(chords, groove('pop'), 'piano')
    const firstBass = (bar: number) => e.find((x) => x.kind === 'bass' && x.beat === bar * 4)
    expect(firstBass(0)).toMatchObject({ midi: 36 }) // C2
    expect(firstBass(1)).toMatchObject({ midi: 43 }) // G2
    expect(firstBass(2)).toMatchObject({ midi: 45 }) // A2
  })

  it('slash chords: the bass plays the given bass note', () => {
    const e = buildJamEvents(parseProgression('C G/B'), groove('pop'), 'piano')
    expect(e.find((x) => x.kind === 'bass' && x.beat === 4)).toMatchObject({ midi: 47 }) // B2
  })

  it('comps the right chord notes with voice leading', () => {
    const e = buildJamEvents(chords, groove('pop'), 'piano')
    const chordAt = (bar: number) => e.find((x) => x.kind === 'chord' && x.beat === bar * 4) as { midis: number[] }
    expect(chordAt(0).midis.map((m) => m % 12).sort((a, b) => a - b)).toEqual([0, 4, 7])
    expect(chordAt(2).midis.map((m) => m % 12).sort((a, b) => a - b)).toEqual([0, 4, 9])
    // Voice leading: total movement between C and G is small.
    const moved = chordAt(0).midis.reduce((s, m, i) => s + Math.abs(m - chordAt(1).midis[i]), 0)
    expect(moved).toBeLessThanOrEqual(6)
  })

  it('shuffle uses 12 steps per bar', () => {
    const e = buildJamEvents(parseProgression('A7'), groove('blues'), 'guitar')
    const snares = e.filter((x) => x.kind === 'snare').map((x) => x.beat)
    expect(snares).toEqual([1, 3])
    const bass = e.filter((x) => x.kind === 'bass').map((x) => (x as { midi: number }).midi - 45)
    expect(bass).toEqual([0, 4, 7, 9, 10, 9, 7, 4]) // boogie 1 3 5 6 ♭7 6 5 3
  })

  it('every groove builds with seventh chords', () => {
    for (const g of GROOVES) {
      const e = buildJamEvents(parseProgression('Dm7 G7 Cmaj7'), g, 'guitar')
      expect(e.length, g.id).toBeGreaterThan(10)
      for (const x of e) if (x.kind === 'chord') expect(x.midis.every((m) => m >= 48 && m <= 69), g.id).toBe(true)
    }
  })
})

describe('3/4 time and guitar rhythms', async () => {
  const { RHYTHMS, rhythm, validateRhythm, parsePattern, formatStep } = await import('../rhythms')

  it('every rhythm has the right step count for one bar and a groove with the same beat count', () => {
    for (const r of RHYTHMS) {
      validateRhythm(r)
      expect(groove(r.groove).beatsPerBar, r.id).toBe(r.beatsPerBar)
    }
  })

  it('parses and re-serialises steps', () => {
    const tokens = "D d U u X - B B' 3 B+1 123 B'+123".split(' ')
    expect(parsePattern(tokens.join(' ')).map(formatStep)).toEqual(tokens)
    expect(() => parsePattern('D Q')).toThrow()
  })

  it('waltz 3/4: a bar is 3 beats, metronome clicks 3 times', () => {
    const e = buildJamEvents(parseProgression('C G'), groove('waltz'), 'guitar', rhythm('valse'))
    expect(e.filter((x) => x.kind === 'bar').map((x) => x.beat)).toEqual([0, 3])
    expect(e.filter((x) => x.kind === 'click').map((x) => x.beat)).toEqual([0, 1, 2, 3, 4, 5])
    expect(loopBeats(parseProgression('C G'), 3)).toBe(6)
  })

  it('waltz: bass on beat 1, chops on beats 2 and 3', () => {
    const e = buildJamEvents(parseProgression('C'), groove('waltz'), 'guitar', rhythm('valse'))
    const strums = e.filter((x) => x.kind === 'strum') as { beat: number; midis: number[] }[]
    expect(strums).toHaveLength(1)
    expect(strums[0]).toMatchObject({ beat: 0, midis: [48] }) // bass C, string 5 fret 3
    expect(e.filter((x) => x.kind === 'mute').map((x) => x.beat)).toEqual([1, 2])
    expect(e.some((x) => x.kind === 'chord')).toBe(false)
  })

  it('slow rock 6/8: a bar is 2 beats of three steps, mute on step 4', () => {
    const e = buildJamEvents(parseProgression('C G'), groove('slowrock68'), 'guitar', rhythm('slowrock68'))
    expect(e.filter((x) => x.kind === 'bar').map((x) => x.beat)).toEqual([0, 2])
    expect(e.filter((x) => x.kind === 'click').map((x) => x.beat)).toEqual([0, 1, 2, 3])
    expect(e.filter((x) => x.kind === 'mute').map((x) => x.beat)).toEqual([1, 3])
    expect(e.filter((x) => x.kind === 'strum')).toHaveLength(10)
    // The 12/8 groove covers the same music in one bar.
    const twelve = buildJamEvents(parseProgression('C'), groove('slowrock'), 'guitar', rhythm('slowrock'))
    expect(twelve.filter((x) => x.kind === 'mute').map((x) => x.beat)).toEqual([1, 3])
  })

  it('downstrokes start from the low strings, upstrokes from the high strings', () => {
    const e = buildJamEvents(parseProgression('G'), groove('ballad'), 'guitar', rhythm('ballad'))
    const strums = e.filter((x) => x.kind === 'strum') as { midis: number[] }[]
    expect(strums[0].midis).toEqual([43, 47, 50, 55, 59, 67]) // open G: 320003
    expect(strums[2].midis).toEqual([67, 59, 55, 50]) // upstroke: 4 high strings, from string 1
  })

  it('ballad picking: B 3 2 3 1 3 2 3 over Am', () => {
    const e = buildJamEvents(parseProgression('Am'), groove('ballad'), 'guitar', rhythm('ballad-pick'))
    const notes = (e.filter((x) => x.kind === 'strum') as { midis: number[] }[]).map((x) => x.midis[0])
    expect(notes).toEqual([45, 57, 60, 57, 64, 57, 60, 57]) // A2, A3 (string 3), C4 (string 2), E4 (string 1)
    expect(e.filter((x) => x.kind === 'pos').map((x) => (x as { step: number }).step)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('a rhythm with a different beat count than the groove falls back to the groove comping', () => {
    const e = buildJamEvents(parseProgression('C'), groove('pop'), 'guitar', rhythm('valse'))
    expect(e.some((x) => x.kind === 'chord')).toBe(true)
    expect(e.some((x) => x.kind === 'strum')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { seededRandom } from '../chordFlow'
import { fretboardPositions, tuning } from '../fretboard'
import {
  BOX_WIDTH,
  FIND_ALL_FRETS,
  NECK_FRETS,
  candidatePositions,
  checkPitch,
  checkPosition,
  isComplete,
  lastFret,
  modeFrets,
  neckEnd,
  octaveLabel,
  pickTarget,
  pitchName,
  positionKey,
  targetFor,
  weaknessWeight,
  zoneFrets,
  zoneOf,
  type TargetOptions,
} from '../fretTargets'

const standard = tuning('standard')
const ALL = [1, 2, 3, 4, 5, 6]
const at = (string: number, fret: number) => fretboardPositions(standard, NECK_FRETS).find((p) => p.string === string && p.fret === fret)!

describe('fretTargets — zones', () => {
  it('splits the neck at fret 12', () => {
    expect(zoneOf(0)).toBe(0)
    expect(zoneOf(11)).toBe(0)
    expect(zoneOf(12)).toBe(1)
    expect(zoneFrets(1)).toEqual([12, NECK_FRETS])
  })

  it('within a zone, each note name has at most one position on a string', () => {
    for (const zone of [0, 1] as const) {
      for (const string of ALL) {
        const pool = candidatePositions({ mode: 'string', tuning: standard, strings: [string], zone })
        expect(new Set(pool.map((p) => p.chroma)).size, `string ${string} zone ${zone}`).toBe(pool.length)
      }
    }
  })

  it('zone 0 covers all 12 notes; level 1 only draws from the chosen zone', () => {
    expect(candidatePositions({ mode: 'string', tuning: standard, strings: [3], zone: 0 })).toHaveLength(12)
    const random = seededRandom(1)
    for (let i = 0; i < 50; i++) {
      const t = pickTarget({ mode: 'string', tuning: standard, strings: [3], zone: 1 }, { random })
      expect(t.answers[0].fret).toBeGreaterThanOrEqual(12)
      expect(t.frets).toEqual([12, NECK_FRETS])
    }
  })

  it('level 2 (no fixed zone) draws from both zones and reports the zone of the answer', () => {
    const random = seededRandom(2)
    const zones = new Set<number>()
    for (let i = 0; i < 60; i++) {
      const t = pickTarget({ mode: 'string', tuning: standard, strings: [6] }, { random })
      expect(t.frets).toEqual(zoneFrets(zoneOf(t.answers[0].fret)))
      zones.add(zoneOf(t.answers[0].fret))
    }
    expect(zones).toEqual(new Set([0, 1]))
  })
})

describe('fretTargets — modes', () => {
  it('note + string: one answer, on one of the enabled strings', () => {
    const random = seededRandom(3)
    for (let i = 0; i < 40; i++) {
      const t = pickTarget({ mode: 'noteString', tuning: standard, strings: [3, 4], zone: 0 }, { random })
      expect(t.answers).toHaveLength(1)
      expect([3, 4]).toContain(t.string)
      expect(t.answers[0].chroma).toBe(t.chroma)
      expect(t.midi).toBeNull()
    }
  })

  it('advanced mode: exact pitch with octave, no zone', () => {
    const t = targetFor(at(6, 12), { mode: 'string', tuning: standard, strings: [6], advanced: true })
    expect(t.midi).toBe(52)
    expect(t.frets).toEqual([0, NECK_FRETS])
    expect(pitchName(t.midi!, t.name)).toBe('E3')
  })

  it('find all: every position of the note from fret 0 to 12 on the enabled strings', () => {
    const t = targetFor(at(6, 2), { mode: 'findAll', tuning: standard, strings: ALL })
    expect(t.chroma).toBe(6)
    expect(t.frets).toEqual([0, FIND_ALL_FRETS])
    expect(t.answers.map((p) => `${p.string}:${p.fret}`).sort()).toEqual(['1:2', '2:7', '3:11', '4:4', '5:9', '6:2'])
    const e = targetFor(at(6, 0), { mode: 'findAll', tuning: standard, strings: [6] })
    expect(e.answers.map((p) => p.fret)).toEqual([0, 12])
  })

  it('exact pitch: every place G3 can be played', () => {
    const t = targetFor(at(3, 0), { mode: 'pitch', tuning: standard, strings: ALL, advanced: true })
    expect(t.midi).toBe(55)
    expect(t.answers.map((p) => `${p.string}:${p.fret}`).sort()).toEqual(['3:0', '4:5', '5:10', '6:15'])
  })

  it('exact pitch only asks pitches that exist on at least two strings', () => {
    const pool = candidatePositions({ mode: 'pitch', tuning: standard, strings: ALL, advanced: true })
    expect(pool.some((p) => p.midi === 40)).toBe(false) // open low E exists only once
    expect(pool.every((p) => pool.some((q) => q.midi === p.midi && q.string !== p.string))).toBe(true)
  })

  it('box: answers stay inside the window', () => {
    const opts: TargetOptions = { mode: 'box', tuning: standard, strings: ALL, boxStart: 5 }
    const random = seededRandom(4)
    for (let i = 0; i < 30; i++) {
      const t = pickTarget(opts, { random })
      expect(t.frets).toEqual([5, 5 + BOX_WIDTH - 1])
      expect(t.answers.length).toBeGreaterThan(0)
      for (const a of t.answers) expect(a.fret >= 5 && a.fret <= 9 && a.chroma === t.chroma).toBe(true)
    }
  })

  it('naturals only and other tunings', () => {
    const naturals = candidatePositions({ mode: 'noteString', tuning: standard, strings: ALL, naturalsOnly: true })
    expect(naturals.every((p) => [0, 2, 4, 5, 7, 9, 11].includes(p.chroma))).toBe(true)
    const bass = pickTarget({ mode: 'noteString', tuning: tuning('bass4'), strings: [4], zone: 0 }, { random: () => 0 })
    expect(bass.answers[0]).toMatchObject({ string: 4, fret: 0, midi: 28 }) // E1
    const dropD = pickTarget({ mode: 'string', tuning: tuning('drop-d'), strings: [6], zone: 0 }, { random: () => 0 })
    expect(dropD.chroma).toBe(2)
  })

  it('both spellings of an accidental get asked', () => {
    const names = new Set(Array.from({ length: 20 }, (_, i) => targetFor(at(6, 2), { mode: 'string', tuning: standard, strings: [6] }, seededRandom(i + 1)).name))
    expect(names).toEqual(new Set(['F#', 'Gb']))
  })

  it('does not repeat the same note on the same string twice in a row', () => {
    const random = seededRandom(5)
    const opts: TargetOptions = { mode: 'string', tuning: standard, strings: [2], zone: 0 }
    let prev = pickTarget(opts, { random })
    for (let i = 0; i < 50; i++) {
      const t = pickTarget(opts, { random, avoid: prev })
      expect(t.chroma).not.toBe(prev.chroma)
      prev = t
    }
  })

  it('throws when nothing matches', () => {
    expect(() => pickTarget({ mode: 'string', tuning: standard, strings: [] })).toThrow()
  })
})

describe('fretTargets — answers', () => {
  it('position answers: hit, miss, already found', () => {
    const t = targetFor(at(6, 2), { mode: 'findAll', tuning: standard, strings: ALL })
    expect(checkPosition(t, [], { string: 4, fret: 4 })).toBe('hit')
    expect(checkPosition(t, [], { string: 4, fret: 5 })).toBe('miss')
    expect(checkPosition(t, [{ string: 4, fret: 4 }], { string: 4, fret: 4 })).toBe('again')
    expect(isComplete(t, t.answers)).toBe(true)
    expect(isComplete(t, t.answers.slice(1))).toBe(false)
  })

  it('a note in the wrong zone is wrong', () => {
    const t = targetFor(at(6, 12), { mode: 'string', tuning: standard, strings: [6], zone: 1 })
    expect(checkPosition(t, [], { string: 6, fret: 0 })).toBe('miss')
    expect(checkPosition(t, [], { string: 6, fret: 12 })).toBe('hit')
  })

  it('pitch answers (mic / MIDI): the octave must match, strings cannot be told apart', () => {
    const t = targetFor(at(6, 12), { mode: 'string', tuning: standard, strings: [6] })
    expect(checkPitch(t, [], 52).result).toBe('hit') // E3 — also playable on string 4 fret 2
    expect(checkPitch(t, [], 40).result).toBe('miss') // E2: right name, wrong octave
    const all = targetFor(at(6, 2), { mode: 'findAll', tuning: standard, strings: ALL })
    const heard = checkPitch(all, [], 66) // F#4: strings 1, 2 and 3
    expect(heard.positions.map((p) => `${p.string}:${p.fret}`).sort()).toEqual(['1:2', '2:7', '3:11'])
    expect(checkPitch(all, heard.positions, 66).result).toBe('again')
  })
})

describe('fretTargets — weighting and names', () => {
  it('weak and overdue positions weigh more than well-known ones', () => {
    const now = 1000
    expect(weaknessWeight({ box: 0, due: now + 1 }, now)).toBeGreaterThan(weaknessWeight(undefined, now))
    expect(weaknessWeight(undefined, now)).toBeGreaterThan(weaknessWeight({ box: 5, due: now + 1 }, now))
    expect(weaknessWeight({ box: 3, due: now - 1 }, now)).toBeGreaterThan(weaknessWeight({ box: 3, due: now + 1 }, now))
  })

  it('weak positions come up more often', () => {
    const opts: TargetOptions = { mode: 'string', tuning: standard, strings: [3], zone: 0 }
    const random = seededRandom(9)
    let weak = 0
    for (let i = 0; i < 400; i++) if (pickTarget(opts, { random, weight: (p) => (p.fret === 9 ? 10 : 1) }).answers[0].fret === 9) weak++
    expect(weak).toBeGreaterThan(100) // ≈ 10/21 of the draws, vs 1/12 unweighted
  })

  it('position keys and octave names', () => {
    expect(positionKey({ string: 3, fret: 11 })).toBe('note-pos:3:11')
    expect(pitchName(40, 'E')).toBe('E2')
    expect(pitchName(64, 'E')).toBe('E4')
    expect(octaveLabel(52, 'E', 'vi')).toBe('Mi3 (E3)')
    expect(octaveLabel(54, 'F#', 'vi')).toBe('Fa♯3 (F♯3)')
    expect(octaveLabel(58, 'Bb', 'en')).toBe('B♭3')
  })
})

describe('fretTargets — neck length', () => {
  it('uses the configured fret count, per-string overrides and clamps to 12–24', () => {
    expect(lastFret({}, 1)).toBe(NECK_FRETS)
    expect(lastFret({ neckFrets: 20 }, 3)).toBe(20)
    expect(lastFret({ neckFrets: 20, stringFrets: { 1: 24 } }, 1)).toBe(24)
    expect(lastFret({ neckFrets: 8 }, 1)).toBe(12)
    expect(lastFret({ neckFrets: 30 }, 1)).toBe(24)
    expect(neckEnd({ neckFrets: 19, stringFrets: { 1: 21, 2: 20 } }, ALL)).toBe(21)
  })

  it('a 20-fret neck: nothing past fret 20, the upper zone is frets 12–20', () => {
    const opts: TargetOptions = { mode: 'noteString', tuning: standard, strings: ALL, neckFrets: 20 }
    expect(Math.max(...candidatePositions(opts).map((p) => p.fret))).toBe(20)
    expect(modeFrets({ ...opts, mode: 'string', strings: [6], zone: 1 })).toEqual([12, 20])
    const random = seededRandom(5)
    for (let i = 0; i < 80; i++) {
      const t = pickTarget(opts, { random })
      expect(t.answers[0].fret).toBeLessThanOrEqual(20)
      expect(t.frets[1]).toBeLessThanOrEqual(20)
    }
  })

  it('per-string fret counts limit each string separately', () => {
    const opts: TargetOptions = { mode: 'pitch', tuning: standard, strings: ALL, advanced: true, neckFrets: 19, stringFrets: { 1: 22, 2: 21 } }
    const pool = candidatePositions(opts)
    for (const s of ALL) expect(Math.max(...pool.filter((p) => p.string === s).map((p) => p.fret)), `string ${s}`).toBeLessThanOrEqual(lastFret(opts, s))
    const t = targetFor(at(1, 22), { ...opts, mode: 'noteString' })
    expect(t.frets).toEqual([0, 22])
  })

  it('a 24-fret neck keeps zones unambiguous: the upper zone stops at fret 23', () => {
    for (const string of ALL) {
      const pool = candidatePositions({ mode: 'string', tuning: standard, strings: [string], zone: 1, neckFrets: 24 })
      expect(new Set(pool.map((p) => p.chroma)).size).toBe(pool.length)
      expect(pool).toHaveLength(12)
    }
    expect(modeFrets({ mode: 'box', tuning: standard, strings: ALL, boxStart: 20, neckFrets: 24 })).toEqual([20, 24])
    expect(modeFrets({ mode: 'box', tuning: standard, strings: ALL, boxStart: 20, neckFrets: 20 })).toEqual([16, 20])
  })
})

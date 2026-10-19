import { describe, expect, it } from 'vitest'
import { chordFlow, degreeSymbol, FLOW_EDGES, FLOW_LOOPS, generatePhrase, seededRandom, type FlowChord, type FlowOptions } from '../chordFlow'
import { chordShapes, nearestShape } from '../guitarShapes'
import { chroma } from '../notes'
import { keyScale, parseKey, parseProgression, type KeyRef } from '../progression'

const take = (opts: FlowOptions, seed: number, n: number): FlowChord[] => {
  const next = chordFlow(opts, seed)
  return Array.from({ length: n }, next)
}

/** Degree of a chord in the key (by its root). */
const degreeOf = (c: FlowChord) => keyScale(c.key).findIndex((n) => chroma(n) === chroma(c.chord.root))

const KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Am', 'Em', 'Bm', 'Dm', 'Gm', 'Cm', 'F#m'].map(parseKey)

describe('harmonic graph and chord loops', () => {
  it('every move in the stock loops (including back to the start) exists in the graph', () => {
    for (const mode of ['major', 'minor'] as const) {
      for (const loop of FLOW_LOOPS[mode]) {
        loop.forEach((d, i) => {
          const next = loop[(i + 1) % loop.length]
          expect(FLOW_EDGES[mode][d]?.some(([to]) => to === next), `${mode} ${loop.join('-')}: ${d}→${next}`).toBe(true)
        })
      }
    }
  })

  it('generated phrases end with a cadence to the tonic and only follow graph edges', () => {
    const random = seededRandom(7)
    for (const mode of ['major', 'minor'] as const) {
      for (let i = 0; i < 200; i++) {
        const length = i % 2 ? 8 : 4
        const from = i % 3 ? null : 0
        const phrase = generatePhrase(mode, length, from, random)
        expect(phrase).toHaveLength(length)
        expect(phrase[length - 1]).toBe(0)
        if (from === null) expect(phrase[0]).toBe(0)
        const path = from === null ? phrase : [from, ...phrase]
        for (let k = 1; k < path.length; k++) expect(FLOW_EDGES[mode][path[k - 1]].some(([to]) => to === path[k]), `${mode} ${path.join('-')}`).toBe(true)
      }
    }
  })

  it('symbols by degree: triads of the right quality, 7ths / colour when enabled', () => {
    const C = parseKey('C')
    expect([0, 1, 2, 3, 4, 5].map((d) => degreeSymbol(C, d))).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am'])
    const Am = parseKey('Am')
    expect([0, 2, 3, 4, 5, 6].map((d) => degreeSymbol(Am, d))).toEqual(['Am', 'C', 'Dm', 'E', 'F', 'G'])
    const always = () => 0
    expect(degreeSymbol(C, 4, { sevenths: true }, always)).toBe('G7')
    expect(degreeSymbol(C, 1, { sevenths: true }, always)).toBe('Dm7')
    expect(degreeSymbol(C, 0, { sevenths: true }, always)).toBe('Cmaj7')
    expect(degreeSymbol(Am, 6, { sevenths: true }, always)).toBe('G7')
    expect(degreeSymbol(C, 4, { colors: true }, always)).toBe('Gsus4')
    expect(degreeSymbol(C, 3, { colors: true }, always)).toBe('Fadd9')
    expect(degreeSymbol(C, 5, { colors: true }, always)).toBe('Am')
  })
})

describe('chordFlow', () => {
  it('same seed gives the same stream, different seeds differ', () => {
    const opts: FlowOptions = { key: parseKey('G'), source: 'generate' }
    const a = take(opts, 42, 32).map((c) => c.chord.symbol)
    expect(take(opts, 42, 32).map((c) => c.chord.symbol)).toEqual(a)
    expect(take(opts, 43, 32).map((c) => c.chord.symbol)).not.toEqual(a)
  })

  it('never repeats a chord twice in a row (except in custom mode)', () => {
    for (const source of ['loops', 'generate'] as const) {
      for (const key of KEYS) {
        const list = take({ key, source, modulate: true, sevenths: true, colors: true }, 5, 120)
        for (let i = 1; i < list.length; i++) expect(chroma(list[i].chord.root) === chroma(list[i - 1].chord.root) && list[i].key === list[i - 1].key, `${source} ${key.tonic}${key.mode} @${i}`).toBe(false)
      }
    }
  })

  it('loops mode: starts on the tonic chord, each pass is a stock loop', () => {
    const list = take({ key: parseKey('C'), source: 'loops' }, 3, 64)
    expect(list[0].chord.symbol).toBe('C')
    expect(list[0].phraseStart).toBe(true)
    const starts = list.map((c, i) => (c.phraseStart ? i : -1)).filter((i) => i >= 0)
    for (let s = 0; s < starts.length - 1; s++) {
      const degrees = list.slice(starts[s], starts[s + 1]).map(degreeOf)
      expect(FLOW_LOOPS.major.some((l) => l.join() === degrees.join()), degrees.join('-')).toBe(true)
    }
  })

  it('generate mode: every phrase ends on the tonic of the current key', () => {
    for (const key of KEYS) {
      const list = take({ key, source: 'generate', phraseLength: 4 }, 11, 40)
      list.forEach((c, i) => {
        if (i % 4 === 0) expect(c.phraseStart).toBe(true)
        if (i % 4 === 3) expect(degreeOf(c)).toBe(0)
      })
    }
  })

  it('key changes: only to close keys, via a pivot chord', () => {
    const home = parseKey('C')
    const near = new Set(['C major', 'A minor', 'G major', 'F major', 'E minor', 'D minor'])
    const list = take({ key: home, source: 'generate', modulate: true }, 9, 400)
    const keys = new Set(list.map((c) => `${c.key.tonic} ${c.key.mode}`))
    expect(keys.size).toBeGreaterThan(1)
    for (const k of keys) expect(near.has(k), k).toBe(true)
    for (let i = 1; i < list.length; i++) {
      if (list[i].key === list[i - 1].key) continue
      // The chord before the change is also a diatonic triad of the new key.
      const prev = list[i - 1].chord
      const newScale = new Set(keyScale(list[i].key).map(chroma))
      expect(prev.notes.slice(0, 3).every((n) => newScale.has(chroma(n))), `${prev.symbol} → ${list[i].key.tonic}`).toBe(true)
    }
  })

  it('custom mode: uses exactly the entered loops, never the same loop twice in a row', () => {
    const custom = [parseProgression('C G Am F'), parseProgression('Dm G C')]
    const list = take({ key: parseKey('C'), source: 'custom', custom }, 1, 60)
    const runs: string[] = []
    let cur: string[] = []
    for (const c of list) {
      if (c.phraseStart && cur.length) {
        runs.push(cur.join(' '))
        cur = []
      }
      cur.push(c.chord.symbol)
    }
    for (const r of runs) expect(['C G Am F', 'Dm G C'], r).toContain(r)
    expect(new Set(runs).size).toBe(2)
  })

  it('every generated chord has a guitar shape', () => {
    const symbols = new Set<string>()
    for (const key of KEYS) for (const source of ['loops', 'generate'] as const) take({ key, source, sevenths: true, colors: true, modulate: true }, 2, 200).forEach((c) => symbols.add(c.chord.symbol))
    for (const s of symbols) expect(chordShapes(parseProgression(s)[0]).length, s).toBeGreaterThan(0)
  })
})

describe('nearestShape', () => {
  it('without a previous shape take the familiar one; otherwise pick the closest', () => {
    const shapesOf = (s: string) => chordShapes(parseProgression(s)[0])
    expect(nearestShape(shapesOf('G'))).toBe(shapesOf('G')[0])
    const highC = shapesOf('C').find((s) => s.position >= 7)!
    const next = nearestShape(shapesOf('F'), highC)!
    expect(Math.abs(next.position - highC.position)).toBeLessThanOrEqual(3)
  })

  it('every key gets shapes for the whole stream', () => {
    const key: KeyRef = parseKey('E')
    const next = chordFlow({ key, source: 'generate' }, 4)
    let prev
    for (let i = 0; i < 30; i++) {
      prev = nearestShape(chordShapes(next().chord), prev)
      expect(prev).toBeDefined()
    }
  })
})

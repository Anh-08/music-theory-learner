import { chroma } from './notes'
import { keyScale, parseProgression, type KeyRef, type ProgressionChord } from './progression'
import { relatedKeys } from './keys'

/**
 * Generates a non-repeating chord stream for the reflex drill: chords keep changing but connect "smoothly"
 * (following common-practice pop harmony habits), and every phrase resolves to the tonic.
 */

export type FlowSource = 'loops' | 'generate' | 'custom'

export interface FlowOptions {
  key: KeyRef
  source: FlowSource
  /** Add seventh chords (V7, ii7, IVmaj7…). */
  sevenths?: boolean
  /** Add colour chords (sus4, add9). */
  colors?: boolean
  /** Occasionally move to a closely related key (relative, dominant, subdominant) via a pivot chord. */
  modulate?: boolean
  /** Chords per generated phrase: 4 or 8. */
  phraseLength?: 4 | 8
  /** User-entered loops (`custom` mode). */
  custom?: ProgressionChord[][]
}

export interface FlowChord {
  chord: ProgressionChord
  key: KeyRef
  /** First chord of a phrase / of a loop pass. */
  phraseStart: boolean
}

/** Seeded random number generator (mulberry32): the same seed gives the same sequence. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Edges = Record<number, [number, number][]>

/**
 * Harmonic graph by scale degree (0 = degree I). Higher weight = more common.
 * Major keys drop vii° (hard to fret, harsh); minor keys use a major V (harmonic minor) and drop ii°.
 */
export const FLOW_EDGES: Record<KeyRef['mode'], Edges> = {
  major: {
    0: [[3, 3], [4, 3], [5, 3], [1, 2], [2, 1]],
    1: [[4, 5], [3, 1]],
    2: [[5, 4], [3, 3]],
    3: [[4, 4], [0, 3], [1, 2], [5, 1]],
    4: [[0, 5], [5, 3], [3, 1], [2, 1]],
    5: [[3, 4], [1, 3], [4, 2], [2, 1]],
  },
  minor: {
    0: [[3, 3], [5, 3], [6, 3], [4, 2], [2, 1]],
    2: [[5, 3], [3, 2], [6, 1], [0, 1]],
    3: [[4, 3], [0, 3], [6, 2]],
    4: [[0, 5], [5, 2]],
    5: [[6, 3], [3, 2], [4, 2], [2, 2]],
    6: [[2, 3], [0, 3], [5, 1]],
  },
}

/** Penultimate chord of a phrase (before the tonic): V–I, IV–I; minor keys also allow ♭VII–i. */
const CADENCE: Record<KeyRef['mode'], number[]> = { major: [4, 3], minor: [4, 3, 6] }

/** Familiar loops, written as degrees. Every move (including back to the start of the loop) exists in the graph. */
export const FLOW_LOOPS: Record<KeyRef['mode'], number[][]> = {
  major: [
    [0, 4, 5, 3], // I V vi IV
    [5, 3, 0, 4], // vi IV I V
    [0, 5, 3, 4], // I vi IV V
    [1, 4, 0, 5], // ii V I vi
    [0, 3, 5, 4], // I IV vi V
    [3, 4, 2, 5], // IV V iii vi
    [0, 2, 3, 4], // I iii IV V
    [0, 4, 5, 2, 3, 0, 3, 4], // Canon progression
  ],
  minor: [
    [0, 5, 2, 6], // i VI III VII
    [0, 6, 5, 4], // i VII VI V
    [0, 5, 3, 4], // i VI iv V
    [3, 4, 0, 5], // iv V i VI
    [0, 3, 6, 2], // i iv VII III
  ],
}

/** Triad quality on each degree: true = minor. */
const MINOR_TRIAD: Record<KeyRef['mode'], Record<number, boolean>> = {
  major: { 0: false, 1: true, 2: true, 3: false, 4: false, 5: true },
  minor: { 0: true, 2: false, 3: true, 4: false, 5: false, 6: false },
}

function weighted<T>(items: [T, number][], random: () => number): T {
  const total = items.reduce((s, [, w]) => s + w, 0)
  let r = random() * total
  for (const [item, w] of items) {
    r -= w
    if (r < 0) return item
  }
  return items[items.length - 1][0]
}

function edgeWeight(mode: KeyRef['mode'], from: number, to: number): number {
  return FLOW_EDGES[mode][from]?.find(([d]) => d === to)?.[1] ?? 0
}

/** Chord symbol for a degree, optionally with a 7th / colour. */
export function degreeSymbol(key: KeyRef, degree: number, opts: Pick<FlowOptions, 'sevenths' | 'colors'> = {}, random: () => number = Math.random): string {
  const root = keyScale(key)[degree]
  const minor = MINOR_TRIAD[key.mode][degree]
  const major = key.mode === 'major'
  let suffix = minor ? 'm' : ''
  if (opts.sevenths) {
    const isDominant = degree === 4
    // V7 on degree V; minor chords become m7; major chords become maj7, except minor-key ♭VII which becomes 7.
    if (random() < (isDominant ? 0.65 : 0.3)) suffix = isDominant ? '7' : minor ? 'm7' : !major && degree === 6 ? '7' : 'maj7'
  }
  if (opts.colors && suffix === (minor ? 'm' : '') && random() < 0.25) {
    if (degree === 4) suffix = 'sus4'
    else if (!minor) suffix = 'add9'
  }
  return root + suffix
}

function sameKey(a: KeyRef, b: KeyRef): boolean {
  return a.mode === b.mode && chroma(a.tonic) === chroma(b.tonic)
}

/** Degree in key `to` of the triad on `degree` in key `from` (a pivot chord), if it is a node of the graph. */
function pivotDegree(from: KeyRef, degree: number, to: KeyRef): number | null {
  const c = chroma(keyScale(from)[degree])
  const deg = keyScale(to).findIndex((n) => chroma(n) === c)
  if (deg < 0 || !(deg in FLOW_EDGES[to.mode])) return null
  return MINOR_TRIAD[to.mode][deg] === MINOR_TRIAD[from.mode][degree] ? deg : null
}

function neighborKeys(key: KeyRef): KeyRef[] {
  const scale = keyScale(key)
  return [relatedKeys(key).relative, { tonic: scale[4], mode: key.mode }, { tonic: scale[3], mode: key.mode }]
}

/** Keys close to the home key: at most one step away so we never drift into a hard key. */
function allowedKeys(home: KeyRef): KeyRef[] {
  const near = neighborKeys(home)
  return [home, ...near, ...near.slice(1).map((k) => relatedKeys(k).relative)]
}

/** Possible key change after the last chord of a phrase (degree `last`): returns the new key and that chord's degree in it. */
function maybeModulate(current: KeyRef, last: number, home: KeyRef, random: () => number): { key: KeyRef; degree: number } | null {
  if (random() >= 0.35) return null
  const allowed = allowedKeys(home)
  const options: [{ key: KeyRef; degree: number }, number][] = []
  for (const k of neighborKeys(current)) {
    if (!allowed.some((a) => sameKey(a, k))) continue
    const degree = pivotDegree(current, last, k)
    if (degree !== null) options.push([{ key: k, degree }, sameKey(k, home) ? 3 : 1])
  }
  return options.length ? weighted(options, random) : null
}

/** A generated phrase of `length` chords ending with a cadence to the tonic. `from` is the degree just before the phrase (null = start on the tonic). */
export function generatePhrase(mode: KeyRef['mode'], length: number, from: number | null, random: () => number): number[] {
  const edges = FLOW_EDGES[mode]
  for (let attempt = 0; attempt < 60; attempt++) {
    const out: number[] = []
    let prev = from
    for (let i = 0; i < length - 2; i++) {
      const d = prev === null ? 0 : weighted(edges[prev], random)
      out.push(d)
      prev = d
    }
    const cad = CADENCE[mode].filter((c) => edgeWeight(mode, prev!, c) > 0)
    if (!cad.length) continue
    out.push(weighted(cad.map((c) => [c, edgeWeight(mode, prev!, c)] as [number, number]), random), 0)
    return out
  }
  // Rarely reached: force a V–I ending.
  return [...Array.from({ length: length - 2 }, (_, i) => (i === 0 && from === null ? 0 : 3)), 4, 0]
}

/**
 * Creates an endless chord generator: each call returns the next chord.
 * - `loops`: familiar loops, each played 1–2 times, then joined to another loop whose first chord follows naturally from the last.
 * - `generate`: 4/8-chord phrases walking the harmonic graph, always resolving to the tonic.
 * - `custom`: user-entered loops in shuffled order (never the same loop twice in a row when there are several).
 */
export function chordFlow(opts: FlowOptions, seed: number): () => FlowChord {
  const random = seededRandom(seed)
  const home = opts.key
  let key = home
  const queue: FlowChord[] = []
  let lastDegree: number | null = null
  let lastLoop = -1

  const realize = (k: KeyRef, degrees: number[]) =>
    degrees.forEach((d, i) => {
      const symbol = degreeSymbol(k, d, opts, random)
      queue.push({ chord: parseProgression(symbol)[0], key: k, phraseStart: i === 0 })
    })

  const refill = () => {
    if (opts.source === 'custom') {
      const loops = (opts.custom ?? []).filter((l) => l.length)
      if (!loops.length) {
        realize(key, generatePhrase(key.mode, 4, null, random))
        return
      }
      const choices = loops.map((_, i) => i).filter((i) => loops.length === 1 || i !== lastLoop)
      const idx = choices[Math.floor(random() * choices.length)]
      lastLoop = idx
      const times = random() < 0.5 ? 1 : 2
      for (let r = 0; r < times; r++) loops[idx].forEach((c, i) => queue.push({ chord: c, key, phraseStart: i === 0 }))
      return
    }

    // End of a phrase: maybe change key, using the phrase's last chord as the pivot.
    let from = lastDegree
    if (opts.modulate && from !== null) {
      const m = maybeModulate(key, from, home, random)
      if (m) {
        key = m.key
        from = m.degree
      }
    }

    if (opts.source === 'generate') {
      const phrase = generatePhrase(key.mode, opts.phraseLength ?? 4, from, random)
      realize(key, phrase)
      lastDegree = phrase[phrase.length - 1]
      return
    }

    const loops = FLOW_LOOPS[key.mode]
    const candidates: [number, number][] = loops
      .map((l, i) => [i, from === null ? (l[0] === 0 ? 1 : 0) : edgeWeight(key.mode, from, l[0])] as [number, number])
      .filter(([i, w]) => w > 0 && i !== lastLoop)
    const idx = candidates.length ? weighted(candidates, random) : 0
    lastLoop = idx
    const loop = loops[idx]
    const times = random() < 0.5 ? 1 : 2
    for (let r = 0; r < times; r++) realize(key, loop)
    lastDegree = loop[loop.length - 1]
  }

  return () => {
    if (!queue.length) refill()
    return queue.shift()!
  }
}

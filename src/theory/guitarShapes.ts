import { Interval } from 'tonal'
import { chordFrets } from './guitarVoicing'
import { chroma, midi } from './notes'
import type { ProgressionChord } from './progression'
import { tuning } from './fretboard'

const STANDARD = tuning('standard').strings.map(midi) // string 6 → string 1

export interface ChordShape {
  /** Fret per string (string 6 → string 1); null = not played, 0 = open string. */
  frets: (number | null)[]
  /** Suggested finger (1 = index … 4 = pinky); null = open or muted string. */
  fingers: (number | null)[]
  /** Index finger barres several strings at `fret`, from string `from` to string `to` (string numbers 6 → 1). */
  barre?: { fret: number; from: number; to: number }
  /** Lowest fretted fret (to draw the diagram at the right position); 0 for open shapes. */
  position: number
  /** String holding the bass note (6, 5 or 4…). */
  bassString: number
}

interface ToneRule {
  chroma: number
  /** Whether the note must be present in the shape. */
  required: boolean
}

/**
 * Which notes to keep when fretting on guitar: always keep the root, the 3rd (or suspended note), the 7th, the 6th,
 * an altered 5th and the highest extension. A perfect 5th may be dropped; the 9th may be dropped when there is an 11 or 13;
 * the 11th may be dropped in a 13 chord.
 */
export function toneRules(chord: Pick<ProgressionChord, 'root' | 'intervals'>): ToneRule[] {
  const nums = chord.intervals.map((i) => Interval.get(i).num)
  const has = (n: number) => nums.includes(n)
  return chord.intervals.map((name) => {
    const { num } = Interval.get(name)
    const c = (chroma(chord.root) + (Interval.get(name).semitones ?? 0)) % 12
    let required = true
    if (name === '5P') required = false
    if (num === 9 && (has(11) || has(13))) required = false
    if (num === 11 && has(13)) required = false
    return { chroma: (c + 12) % 12, required }
  })
}

function fingersFor(frets: (number | null)[]): { fingers: (number | null)[]; barre?: ChordShape['barre']; count: number } | null {
  const fretted = frets.map((f, i) => ({ f, i })).filter((x): x is { f: number; i: number } => x.f !== null && x.f > 0)
  const fingers: (number | null)[] = frets.map(() => null)
  if (!fretted.length) return { fingers, count: 0 }
  const minF = Math.min(...fretted.map((x) => x.f))
  const atMin = fretted.filter((x) => x.f === minF)
  // Barre if ≥ 2 strings sit at the lowest fret and no open / muted string lies under the barre.
  let barre: ChordShape['barre']
  if (atMin.length >= 2) {
    const lo = atMin[0].i
    const hi = atMin[atMin.length - 1].i
    const between = frets.slice(lo, hi + 1)
    if (between.every((f) => f !== null && f >= minF)) barre = { fret: minF, from: 6 - lo, to: 6 - hi }
  }
  const rest = (barre ? fretted.filter((x) => x.f > minF) : fretted).sort((a, b) => a.f - b.f || a.i - b.i)
  const count = rest.length + (barre ? 1 : 0)
  if (count > 4) return null
  if (barre) atMin.forEach((x) => (fingers[x.i] = 1))
  let next = barre ? 2 : 1
  // Fingers increase with the fret; skip a finger when a note is far from the previous one, as players naturally do.
  let lastFret = barre ? minF : rest[0]?.f ?? minF
  for (const x of rest) {
    if (x.f - lastFret >= 2 && next < 4) next = Math.min(4, next + 1)
    fingers[x.i] = Math.min(4, next)
    lastFret = x.f
    next++
  }
  return { fingers, barre, count }
}

function score(frets: (number | null)[], fifthChroma: number | null, fingerCount: number): number {
  const sounding = frets.filter((f) => f !== null) as number[]
  const first = frets.findIndex((f) => f !== null)
  const last = frets.length - 1 - [...frets].reverse().findIndex((f) => f !== null)
  const interior = frets.slice(first, last + 1).filter((f) => f === null).length
  const fretted = sounding.filter((f) => f > 0)
  const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0
  const pos = fretted.length ? Math.min(...fretted) : 0
  const pcs = frets.map((f, i) => (f === null ? null : (STANDARD[i] + f) % 12))
  const hasFifth = fifthChroma !== null && pcs.includes(fifthChroma)
  const opens = sounding.filter((f) => f === 0).length
  return sounding.length * 1.0 + (hasFifth ? 0.6 : 0) - fingerCount * 0.3 - span * 0.25 - interior * 1.3 - pos * 0.04 + (pos <= 3 ? opens * 0.25 : -opens * 0.6)
}

const cache = new Map<string, ChordShape[]>()

/**
 * Guitar chord shapes (standard tuning) with the root (or the bass of a slash chord) on the lowest string.
 * Scans frets 0 to 15, keeps shapes playable with ≤ 4 fingers (barre included),
 * scores them for fullness / ease, then picks up to `max` shapes at different positions, sorted low to high.
 */
export function chordShapes(chord: Pick<ProgressionChord, 'root' | 'intervals' | 'symbol'> & { bass?: string }, max = 8): ChordShape[] {
  const key = `${chord.symbol}|${max}`
  const hit = cache.get(key)
  if (hit) return hit
  const rules = toneRules(chord)
  const allowed = new Set(rules.map((r) => r.chroma))
  const required = [...new Set(rules.filter((r) => r.required).map((r) => r.chroma))]
  const bassChroma = chroma(chord.bass ?? chord.root)
  allowed.add(bassChroma)
  const fifth = chord.intervals.includes('5P') ? (chroma(chord.root) + 7) % 12 : null
  const candidates = new Map<string, { frets: (number | null)[]; score: number; fingerCount: number }>()

  for (let f0 = 0; f0 <= 12; f0++) {
    const lo = Math.max(1, f0)
    const hi = f0 + 3
    const options = STANDARD.map((open) => {
      const opts: (number | null)[] = [null]
      // Open strings are only used for low shapes (fret ≤ 5).
      if (hi <= 5 && allowed.has(open % 12)) opts.push(0)
      for (let f = lo; f <= hi; f++) if (allowed.has((open + f) % 12)) opts.push(f)
      return opts
    })
    // Bass note on string 6, 5 or 4 (full shapes for accompaniment).
    for (let bs = 0; bs <= 2; bs++) {
      const bassOpts = options[bs].filter((f) => f !== null && (STANDARD[bs] + f) % 12 === bassChroma) as number[]
      for (const bf of bassOpts) {
        const frets: (number | null)[] = Array(6).fill(null)
        frets[bs] = bf
        const walk = (s: number) => {
          if (s === 6) {
            const sounding = frets.filter((f) => f !== null).length
            if (sounding < Math.max(3, required.length)) return
            const pcs = new Set(frets.map((f, i) => (f === null ? -1 : (STANDARD[i] + f) % 12)))
            if (!required.every((c) => pcs.has(c))) return
            const first = bs
            const last = 5 - [...frets].reverse().findIndex((f) => f !== null)
            if (frets.slice(first, last + 1).filter((f) => f === null).length > 1) return
            // The lowest note must be the bass (a higher string may sound lower if it is a low open string — reject).
            const lowest = Math.min(...frets.map((f, i) => (f === null ? Infinity : STANDARD[i] + f)))
            if (lowest !== STANDARD[bs] + bf) return
            // Do not mix open strings with notes fretted high up (hard to play, sounds off).
            if (frets.some((f) => f === 0) && frets.some((f) => f !== null && f > 4)) return
            const fing = fingersFor(frets)
            if (!fing) return
            const id = frets.map((f) => (f === null ? 'x' : f)).join(',')
            const sc = score(frets, fifth, fing.count)
            const prev = candidates.get(id)
            if (!prev || prev.score < sc) candidates.set(id, { frets: [...frets], score: sc, fingerCount: fing.count })
            return
          }
          for (const opt of options[s]) {
            frets[s] = opt
            walk(s + 1)
          }
          frets[s] = null
        }
        walk(bs + 1)
      }
    }
  }

  // The "standard" shape (open shape / familiar barre) always comes first when valid.
  const standard = chordFrets({ ...chord, notes: [], suffix: '', bars: 1 } as ProgressionChord)
  const standardId = standard?.map((f) => (f === null ? 'x' : f)).join(',')
  const standardKey = standard ? shapeId({ frets: standard }) : null
  const sorted = [...candidates.values()].sort((a, b) => b.score - a.score)
  const chosen: { frets: (number | null)[] }[] = []
  const posOf = (fr: (number | null)[]) => {
    const fretted = fr.filter((f): f is number => f !== null && f > 0)
    return fr.some((f) => f === 0) || !fretted.length ? 0 : Math.min(...fretted)
  }
  const bassOf = (fr: (number | null)[]) => fr.findIndex((f) => f !== null)
  const std = standardId ? candidates.get(standardId) : undefined
  if (std) chosen.push(std)
  for (const c of sorted) {
    if (chosen.length >= max) break
    if (chosen.includes(c)) continue
    // Variety: at least 2 frets apart, or the same position with the bass on a different string.
    const clash = chosen.some((x) => Math.abs(posOf(x.frets) - posOf(c.frets)) < 2 && bassOf(x.frets) === bassOf(c.frets))
    if (!clash) chosen.push(c)
  }

  const shapes = chosen
    .map((c) => {
      const fing = fingersFor(c.frets)!
      return { frets: c.frets, fingers: fing.fingers, barre: fing.barre, position: posOf(c.frets), bassString: 6 - bassOf(c.frets) }
    })
    // Familiar shape first, the rest sorted low to high.
    .sort((a, b) => Number(shapeId(b) === standardKey) - Number(shapeId(a) === standardKey) || a.position - b.position || b.bassString - a.bassString)
  cache.set(key, shapes)
  return shapes
}

export function shapeMidis(shape: ChordShape): (number | null)[] {
  return shape.frets.map((f, i) => (f === null ? null : STANDARD[i] + f))
}

export function shapeId(shape: Pick<ChordShape, 'frets'>): string {
  return shape.frets.map((f) => (f === null ? 'x' : f)).join(shape.frets.some((f) => (f ?? 0) >= 10) ? ',' : '')
}

/**
 * Picks the shape for the next chord: closest to the current shape's position (least hand movement),
 * with a slight preference for the familiar shape (first in the list). Without a previous shape, take the familiar one.
 */
export function nearestShape(shapes: ChordShape[], prev?: ChordShape): ChordShape | undefined {
  if (!prev || shapes.length < 2) return shapes[0]
  let best = shapes[0]
  let bestCost = Infinity
  shapes.forEach((s, i) => {
    const cost = Math.abs(s.position - prev.position) + Math.abs(s.bassString - prev.bassString) * 0.5 + i * 0.4
    if (cost < bestCost) {
      best = s
      bestCost = cost
    }
  })
  return best
}

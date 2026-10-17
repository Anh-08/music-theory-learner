import { Interval } from 'tonal'
import { chordFrets } from './guitarVoicing'
import { chroma, midi } from './notes'
import type { ProgressionChord } from './progression'
import { tuning } from './fretboard'

const STANDARD = tuning('standard').strings.map(midi) // dây 6 → dây 1

export interface ChordShape {
  /** Phím từng dây (dây 6 → dây 1); null = không đánh, 0 = dây buông. */
  frets: (number | null)[]
  /** Ngón bấm gợi ý (1 = trỏ … 4 = út); null = dây buông hoặc không đánh. */
  fingers: (number | null)[]
  /** Ngón trỏ chặn nhiều dây ở phím `fret`, từ dây `from` tới dây `to` (số dây 6 → 1). */
  barre?: { fret: number; from: number; to: number }
  /** Phím thấp nhất có bấm (để vẽ sơ đồ ở đúng vị trí); 0 nếu là thế mở. */
  position: number
  /** Dây có nốt bass (6, 5 hoặc 4…). */
  bassString: number
}

interface ToneRule {
  chroma: number
  /** Có bắt buộc phải có trong thế bấm không. */
  required: boolean
}

/**
 * Nốt nào cần giữ khi bấm trên guitar: luôn giữ nốt gốc, quãng 3 (hoặc nốt treo), quãng 7, quãng 6,
 * quãng 5 bị biến đổi và nốt mở rộng cao nhất. Quãng 5 đúng được phép bỏ; quãng 9 được bỏ nếu đã có 11 hay 13;
 * quãng 11 được bỏ trong hợp âm 13.
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
  // Chặn được nếu ≥ 2 dây ở phím thấp nhất và không có dây buông / câm nằm dưới ngón chặn.
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
  // Ngón tăng dần theo phím; nốt cách xa ngón trước thì nhảy ngón cho tự nhiên.
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
 * Các thế bấm hợp âm trên guitar (lên dây chuẩn), nốt gốc (hoặc nốt bass của hợp âm "/") ở dây trầm nhất.
 * Quét cần đàn từ phím 0 đến 15, giữ thế bấm chơi được bằng ≤ 4 ngón (tính cả ngón chặn),
 * chấm điểm theo độ đầy đặn / dễ bấm, rồi chọn tối đa `max` thế ở các vị trí khác nhau, xếp từ thấp lên cao.
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
      // Dây buông chỉ dùng khi thế bấm ở thấp (phím ≤ 5).
      if (hi <= 5 && allowed.has(open % 12)) opts.push(0)
      for (let f = lo; f <= hi; f++) if (allowed.has((open + f) % 12)) opts.push(f)
      return opts
    })
    // Nốt bass ở dây 6, 5 hoặc 4 (thế bấm đầy đủ để đệm).
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
            // Nốt thấp nhất phải là bass (dây trên có thể thấp hơn nếu là dây buông thấp — loại).
            const lowest = Math.min(...frets.map((f, i) => (f === null ? Infinity : STANDARD[i] + f)))
            if (lowest !== STANDARD[bs] + bf) return
            // Không trộn dây buông với nốt bấm ở phím cao (khó bấm, tiếng lệch).
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

  // Thế bấm "chuẩn" (thế mở / hình chặn quen thuộc) luôn được ưu tiên nếu hợp lệ.
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
    // Đa dạng: khác vị trí ít nhất 2 phím, hoặc cùng vị trí nhưng nốt bass ở dây khác.
    const clash = chosen.some((x) => Math.abs(posOf(x.frets) - posOf(c.frets)) < 2 && bassOf(x.frets) === bassOf(c.frets))
    if (!clash) chosen.push(c)
  }

  const shapes = chosen
    .map((c) => {
      const fing = fingersFor(c.frets)!
      return { frets: c.frets, fingers: fing.fingers, barre: fing.barre, position: posOf(c.frets), bassString: 6 - bassOf(c.frets) }
    })
    // Thế quen thuộc đứng đầu, còn lại xếp từ thấp lên cao.
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

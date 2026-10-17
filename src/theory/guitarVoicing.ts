import { chordTypeId, type ProgressionChord } from './progression'
import { chroma, midi } from './notes'
import { rootMidiAtOrAbove } from './voicing'
import { parseShape, tuning, type StringFret } from './fretboard'

const STANDARD = tuning('standard').strings.map(midi) // dây 6 → dây 1

/** Thế bấm mở quen thuộc, khóa "<chroma chủ âm>:<loại hợp âm>", viết từ dây 6 → dây 1. */
const OPEN_SHAPES: Record<string, string> = {
  '0:M': 'x32010',
  '0:maj7': 'x32000',
  '0:7': 'x32310',
  '0:add9': 'x32030',
  '2:M': 'xx0232',
  '2:m': 'xx0231',
  '2:7': 'xx0212',
  '2:maj7': 'xx0222',
  '2:m7': 'xx0211',
  '2:sus2': 'xx0230',
  '2:sus4': 'xx0233',
  '4:M': '022100',
  '4:m': '022000',
  '4:7': '020100',
  '4:m7': '020000',
  '4:sus4': '022200',
  '5:maj7': 'xx3210',
  '7:M': '320003',
  '7:7': '320001',
  '9:M': 'x02220',
  '9:m': 'x02210',
  '9:7': 'x02020',
  '9:m7': 'x02010',
  '9:maj7': 'x02120',
  '9:sus2': 'x02200',
  '9:sus4': 'x02230',
  '11:7': 'x21202',
}

type Template = (number | null)[]

/** Hình chặn dời được: số là phím tính từ phím của nốt gốc (dây 6 với hình E, dây 5 với hình A). */
const E_SHAPES: Record<string, Template> = {
  M: [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  '7': [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  maj7: [0, null, 1, 1, 0, null],
  sus4: [0, 2, 2, 2, 0, 0],
}

const A_SHAPES: Record<string, Template> = {
  M: [null, 0, 2, 2, 2, 0],
  m: [null, 0, 2, 2, 1, 0],
  '7': [null, 0, 2, 0, 2, 0],
  m7: [null, 0, 2, 0, 1, 0],
  maj7: [null, 0, 2, 1, 2, 0],
  sus2: [null, 0, 2, 2, 0, 0],
  sus4: [null, 0, 2, 2, 3, 0],
  '7sus4': [null, 0, 2, 0, 3, 0],
  dim: [null, 0, 1, 2, 1, null],
  m7b5: [null, 0, 1, 0, 1, null],
  dim7: [null, 0, 1, 2, 1, 2],
  aug: [null, 0, 3, 2, 2, 1],
  '6': [null, 0, 2, 2, 2, 2],
  m6: [null, 0, 2, 2, 1, 2],
  add9: [null, 0, 2, 4, 2, 0],
}

export interface GuitarVoicing {
  /** Phím của từng dây, dây 6 → dây 1; null = không đánh. null cả mảng nếu là cách xếp dựng tạm (không có thế bấm thật). */
  frets: (number | null)[] | null
  /** Cao độ từng dây khi đánh, dây 6 → dây 1. */
  stringMidis: (number | null)[]
  /** Nốt bass (B) và bass luân phiên (B'). */
  bass: number
  altBass: number
  /** Các vị trí để tô trên cần đàn. */
  positions: StringFret[]
}

function fromFrets(frets: (number | null)[]): (number | null)[] {
  return frets.map((f, i) => (f === null ? null : STANDARD[i] + f))
}

function shapeFrets(shape: string): (number | null)[] {
  const frets: (number | null)[] = Array(6).fill(null)
  for (const p of parseShape(shape)) frets[6 - p.string] = p.fret
  return frets
}

function applyTemplate(t: Template, rootFret: number): (number | null)[] {
  return t.map((x) => (x === null ? null : x + rootFret))
}

/** Thế bấm cho hợp âm: thế mở nếu có, không thì hình chặn E / A ở vị trí thấp nhất. */
export function chordFrets(chord: ProgressionChord): (number | null)[] | null {
  const type = chordTypeId(chord.intervals)
  const c = chroma(chord.root)
  if (!type) return null
  const open = OPEN_SHAPES[`${c}:${type}`]
  if (open) return shapeFrets(open)
  const eFret = (c - 4 + 12) % 12 // dây 6 là E
  const aFret = (c - 9 + 12) % 12 // dây 5 là A
  const candidates: { fret: number; frets: (number | null)[] }[] = []
  if (E_SHAPES[type]) candidates.push({ fret: eFret === 0 ? 12 : eFret, frets: applyTemplate(E_SHAPES[type], eFret === 0 ? 12 : eFret) })
  if (A_SHAPES[type]) candidates.push({ fret: aFret, frets: applyTemplate(A_SHAPES[type], aFret) })
  if (!candidates.length) return null
  return candidates.reduce((best, x) => (x.fret < best.fret ? x : best)).frets
}

/**
 * Cách đánh hợp âm trên guitar: thế bấm, cao độ từng dây, dây bass và bass luân phiên.
 * Hợp âm không có thế bấm sẵn thì dựng tạm: bass ở dây 6/5, các nốt còn lại xếp lên dây 4 → 1.
 */
export function guitarVoicing(chord: ProgressionChord, fretsOverride?: (number | null)[]): GuitarVoicing {
  // `fretsOverride`: một thế bấm người học đã chọn (từ chordShapes) thay cho thế mặc định.
  const frets = fretsOverride ?? chordFrets(chord)
  const chordChromas = new Set(chord.notes.map(chroma))
  let stringMidis: (number | null)[]
  if (frets) {
    stringMidis = fromFrets(frets)
  } else {
    const root = rootMidiAtOrAbove(chroma(chord.root), 40)
    const tones = chord.notes.slice(1).map(chroma)
    const upper: number[] = []
    let prev = Math.max(root, 50)
    for (let i = 0; i < 4; i++) {
      const m = rootMidiAtOrAbove(tones[i % tones.length], prev + 1)
      upper.push(m)
      prev = m
    }
    stringMidis = root < 45 ? [root, null, ...upper] : [null, root, ...upper]
  }

  // Bass: nốt bass của hợp âm "/" nếu có; không thì nốt gốc thấp nhất trên dây 6–4.
  const bassChroma = chroma(chord.bass ?? chord.root)
  let bassIdx = stringMidis.findIndex((m, i) => i <= 2 && m !== null && m % 12 === bassChroma)
  let bass: number
  if (bassIdx >= 0) {
    bass = stringMidis[bassIdx]!
  } else {
    bass = rootMidiAtOrAbove(bassChroma, 40)
    bassIdx = bass < 45 ? 0 : 1
  }

  // Bass luân phiên: một trong ba dây trầm (6, 5, 4) khác dây bass, ưu tiên nốt quãng 5 của hợp âm,
  // ưu tiên dây đang bấm; dây buông được dùng nếu nốt buông thuộc hợp âm (D: bass dây 4, B′ = A dây 5 buông).
  const fifth = chord.intervals.find((i) => i.startsWith('5'))
  const fifthChroma = fifth ? (chroma(chord.root) + (fifth === '5d' ? 6 : fifth === '5A' ? 8 : 7)) % 12 : null
  const candidates = [0, 1, 2]
    .filter((i) => i !== bassIdx)
    .map((i) => {
      const fretted = stringMidis[i]
      const open = chordChromas.has(STANDARD[i] % 12) ? STANDARD[i] : null
      const m = fretted ?? open
      return m === null ? null : { m, score: (m % 12 === fifthChroma ? 2 : 0) + (fretted !== null ? 1 : 0) }
    })
    .filter((x): x is { m: number; score: number } => x !== null && x.m !== bass)
  const altBass = candidates.length ? candidates.reduce((best, x) => (x.score > best.score ? x : best)).m : bass + 7

  const positions: StringFret[] = frets ? frets.flatMap((f, i) => (f === null ? [] : [{ string: 6 - i, fret: f }])) : []
  return { frets, stringMidis, bass, altBass, positions }
}

/** Cao độ của dây `n` (1–6) trong cách xếp; dây không đánh thì lấy dây thấp hơn gần nhất. */
export function stringMidi(v: GuitarVoicing, n: number): number {
  for (let s = n; s <= 6; s++) {
    const m = v.stringMidis[6 - s]
    if (m !== null) return m
  }
  return v.bass
}

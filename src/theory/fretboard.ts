import { chromaOfMidi, midi, type Chroma } from './notes'

export interface Tuning {
  id: string
  name: string
  /** Dây buông từ dây trầm nhất (dây 6) đến dây cao nhất (dây 1). */
  strings: string[]
}

export const TUNINGS: Tuning[] = [
  { id: 'standard', name: 'Standard (E A D G B E)', strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'half-down', name: 'Hạ nửa cung (E♭ A♭ D♭ G♭ B♭ E♭)', strings: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'] },
  { id: 'drop-d', name: 'Drop D (D A D G B E)', strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'dadgad', name: 'DADGAD', strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  { id: 'open-g', name: 'Open G (D G D G B D)', strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
]

export function tuning(id: string): Tuning {
  const t = TUNINGS.find((x) => x.id === id)
  if (!t) throw new Error(`Không có tuning: ${id}`)
  return t
}

export interface FretPosition {
  /** Số dây theo cách gọi của người chơi guitar: 1 là dây cao nhất. */
  string: number
  fret: number
  midi: number
  chroma: Chroma
}

/** Mọi vị trí trên cần đàn từ phím 0 (dây buông) đến `fretCount`. */
export function fretboardPositions(t: Tuning, fretCount: number): FretPosition[] {
  const total = t.strings.length
  return t.strings.flatMap((open, idx) => {
    const openMidi = midi(open)
    return Array.from({ length: fretCount + 1 }, (_, fret) => ({
      string: total - idx,
      fret,
      midi: openMidi + fret,
      chroma: chromaOfMidi(openMidi + fret),
    }))
  })
}

/**
 * Vị trí ngang (0–1) của từng phím đàn, tính theo tỉ lệ thật của cần đàn
 * (mỗi phím ngắn hơn phím trước theo hệ số 2^(-1/12)), chuẩn hóa về `fretCount` phím.
 */
export function fretX(fret: number, fretCount: number): number {
  const pos = (f: number) => 1 - 2 ** (-f / 12)
  return pos(fret) / pos(fretCount)
}

export const INLAY_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
export const DOUBLE_INLAY_FRETS = [12, 24]

export interface StringFret {
  string: number
  fret: number
}

/**
 * Đọc thế bấm hợp âm viết từ dây 6 đến dây 1: "x32010" hoặc (khi có phím ≥ 10) "8,10,10,9,8,8".
 * "x" là dây không đánh.
 */
export function parseShape(shape: string): StringFret[] {
  const parts = shape.includes(',') ? shape.split(',') : shape.split('')
  if (parts.length !== 6) throw new Error(`Thế bấm phải có 6 dây: ${shape}`)
  return parts.flatMap((part, idx) => {
    const t = part.trim().toLowerCase()
    if (t === 'x') return []
    const fret = Number(t)
    if (!Number.isInteger(fret) || fret < 0) throw new Error(`Phím không hợp lệ trong thế bấm: ${shape}`)
    return [{ string: 6 - idx, fret }]
  })
}

/** Đọc danh sách vị trí dạng "dây:phím", cách nhau bởi khoảng trắng: "6:3 5:2 5:3". */
export function parsePositions(text: string): StringFret[] {
  return text
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [s, f] = pair.split(':').map(Number)
      if (!Number.isInteger(s) || !Number.isInteger(f) || s < 1 || f < 0) throw new Error(`Vị trí không hợp lệ: ${pair}`)
      return { string: s, fret: f }
    })
}

export function positionMidi(t: Tuning, p: StringFret): number {
  const open = t.strings[t.strings.length - p.string]
  if (!open) throw new Error(`Tuning không có dây ${p.string}`)
  return midi(open) + p.fret
}

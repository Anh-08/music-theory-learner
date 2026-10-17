import { Note } from 'tonal'

/** Số nửa cung tính từ C (0–11), không phụ thuộc quãng tám. */
export type Chroma = number

/** Hai cách viết tên cho 12 nốt: theo dấu thăng và theo dấu giáng. */
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const SOLFEGE = ['Đô', 'Đô♯', 'Rê', 'Rê♯', 'Mi', 'Fa', 'Fa♯', 'Son', 'Son♯', 'La', 'La♯', 'Si']

export const CHROMAS: Chroma[] = Array.from({ length: 12 }, (_, i) => i)

export function chroma(note: string): Chroma {
  const c = Note.chroma(note)
  if (c === undefined || Number.isNaN(c)) throw new Error(`Nốt không hợp lệ: ${note}`)
  return c
}

export function midi(note: string): number {
  const m = Note.midi(note)
  if (m === null) throw new Error(`Nốt không có cao độ: ${note}`)
  return m
}

export function chromaOfMidi(m: number): Chroma {
  return ((m % 12) + 12) % 12
}

/** Các cách viết có thể có của một chroma (1 hoặc 2 tên). */
export function spellingsOf(c: Chroma): string[] {
  const sharp = SHARP_NAMES[c]
  const flat = FLAT_NAMES[c]
  return sharp === flat ? [sharp] : [sharp, flat]
}

export function noteFromMidi(m: number, preferFlats = false): string {
  return preferFlats ? Note.fromMidi(m) : Note.fromMidiSharps(m)
}

/** Số dấu hóa trong một tên nốt (♭♭ tính là 2). */
export function accidentalCount(note: string): number {
  return Note.get(note).acc.length
}

/** Hiển thị ♯/♭ thay vì #/b: "Bb" → "B♭". */
export function displayNote(note: string): string {
  const { letter, acc } = Note.get(note)
  if (!letter) return note
  return letter + acc.replace(/#/g, '♯').replace(/b/g, '♭')
}

export function rootLabel(c: Chroma): string {
  return spellingsOf(c).map(displayNote).join(' / ')
}

export function solfege(c: Chroma): string {
  return SOLFEGE[c]
}

/**
 * Chọn cách viết chủ âm sao cho tập nốt sinh ra có ít dấu hóa nhất
 * (ví dụ giọng có 5 nốt ♯ chủ âm C♯ sẽ chọn D♭ trưởng thay vì C♯ trưởng).
 * Hòa thì ưu tiên dấu thăng.
 */
export function bestRootSpelling(c: Chroma, build: (root: string) => string[]): string {
  let best = spellingsOf(c)[0]
  let bestScore = Infinity
  for (const root of spellingsOf(c)) {
    const score = build(root).reduce((sum, n) => sum + accidentalCount(n), 0)
    if (score < bestScore) {
      best = root
      bestScore = score
    }
  }
  return best
}

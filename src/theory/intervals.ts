import { Interval } from 'tonal'

/**
 * Nhãn ngắn của một quãng tính từ chủ âm, dạng dùng trong công thức hợp âm/scale:
 * "1P" → "1", "3m" → "♭3", "5d" → "♭5", "4A" → "♯4", "7d" → "♭♭7", "9M" → "9".
 */
export function intervalLabel(name: string): string {
  const i = Interval.get(name)
  if (i.empty) throw new Error(`Quãng không hợp lệ: ${name}`)
  const acc = i.alt < 0 ? '♭'.repeat(-i.alt) : '♯'.repeat(i.alt)
  return acc + i.num
}

export function intervalBetween(from: string, to: string): string {
  return Interval.distance(from, to)
}

export function semitones(name: string): number {
  return Interval.get(name).semitones
}

const QUALITY_VI: Record<string, string> = {
  P: 'đúng',
  M: 'trưởng',
  m: 'thứ',
  A: 'tăng',
  d: 'giảm',
}

const QUALITY_EN: Record<string, string> = {
  P: 'perfect',
  M: 'major',
  m: 'minor',
  A: 'augmented',
  d: 'diminished',
}

const ORDINAL_EN = ['', 'unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'octave', '9th', '10th', '11th', '12th', '13th']

/** Tên đầy đủ: "3m" → "Quãng 3 thứ (minor 3rd)". */
export function intervalName(name: string): string {
  const i = Interval.get(name)
  if (i.empty) throw new Error(`Quãng không hợp lệ: ${name}`)
  if (i.num === 1 && i.q === 'P') return 'Đồng âm (unison)'
  if (i.num === 8 && i.q === 'P') return 'Quãng 8 đúng (octave)'
  return `Quãng ${i.num} ${QUALITY_VI[i.q]} (${QUALITY_EN[i.q]} ${ORDINAL_EN[i.num] ?? `${i.num}th`})`
}

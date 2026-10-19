import { Interval } from 'tonal'
import type { Locale } from '../i18n/locale'

/**
 * Short label of an interval measured from the root, as used in chord/scale formulas:
 * "1P" → "1", "3m" → "♭3", "5d" → "♭5", "4A" → "♯4", "7d" → "♭♭7", "9M" → "9".
 */
export function intervalLabel(name: string): string {
  const i = Interval.get(name)
  if (i.empty) throw new Error(`Invalid interval: ${name}`)
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

function englishName(i: ReturnType<typeof Interval.get>): string {
  if (i.num === 1 && i.q === 'P') return 'unison'
  if (i.num === 8 && i.q === 'P') return 'octave'
  return `${QUALITY_EN[i.q]} ${ORDINAL_EN[i.num] ?? `${i.num}th`}`
}

/** Full name: "3m" → "Quãng 3 thứ (minor 3rd)" (Vietnamese) or "Minor 3rd" (English). */
export function intervalName(name: string, locale: Locale = 'vi'): string {
  const i = Interval.get(name)
  if (i.empty) throw new Error(`Invalid interval: ${name}`)
  const en = englishName(i)
  if (locale === 'en') return en[0].toUpperCase() + en.slice(1)
  if (i.num === 1 && i.q === 'P') return 'Đồng âm (unison)'
  if (i.num === 8 && i.q === 'P') return 'Quãng 8 đúng (octave)'
  return `Quãng ${i.num} ${QUALITY_VI[i.q]} (${en})`
}

/** Short name: "3m" → "Quãng 3 thứ" / "Minor 3rd". */
export function intervalShortName(name: string, locale: Locale = 'vi'): string {
  return intervalName(name, locale).replace(/ \(.*\)$/, '')
}

import type { Locale } from '../../i18n/locale'
import { Interval, Note } from 'tonal'
import {
  accidentalCount,
  chroma,
  detectKey,
  displayNote,
  intervalLabel,
  makeHighlights,
  parseKey,
  parseProgression,
  romanNumeral,
  scaleFromRoot,
  scaleType,
  scaleTypeName,
  suggestScales,
  type HighlightMap,
  type KeyRef,
  type ProgressionChord,
  type ScaleSuggestion,
} from '../../theory'

const ROMAN_TOKEN = /(^|[\s|,–-])[b#♭♯]?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(?=[^a-z]|$)/

export function usesRomanNumerals(text: string): boolean {
  return ROMAN_TOKEN.test(text)
}

export interface Analysis {
  chords: ProgressionChord[]
  key: KeyRef
  romans: string[]
  suggestions: ScaleSuggestion[]
}

/**
 * Phân tích tiến trình người dùng nhập. `keyText` là giọng chọn tay ("C", "Am") hoặc null để tự đoán.
 * Số La Mã luôn cần một giọng: không chọn thì mặc định C trưởng.
 */
export function analyze(text: string, keyText: string | null): Analysis {
  const chosen = keyText ? parseKey(keyText) : null
  const roman = usesRomanNumerals(text)
  const chords = parseProgression(text, chosen ?? { tonic: 'C', mode: 'major' })
  const key = chosen ?? (roman ? { tonic: 'C', mode: 'major' as const } : detectKey(chords))
  return { chords, key, romans: chords.map((c) => romanNumeral(c, key)), suggestions: suggestScales(chords, key) }
}

/** Chủ âm giọng trưởng tương ứng: giọng thứ đổi sang giọng trưởng song song (Am → C). */
function majorTonic(key: KeyRef): string {
  return key.mode === 'major' ? key.tonic : Note.transpose(key.tonic, '3m')
}

function transposeNote(note: string, interval: string): string {
  const n = Note.transpose(note, interval)
  return accidentalCount(n) > 1 ? Note.simplify(n) : n
}

/**
 * Dịch giọng tiến trình người dùng nhập từ giọng `from` sang giọng `to`, giữ nguyên cách viết
 * (dấu ngăn cách, "*2", "%"). Số La Mã giữ nguyên vì đã tự theo giọng. Khác thể (trưởng ↔ thứ) thì
 * dịch theo giọng song song, nên C → Am giữ nguyên hợp âm. Ký hiệu không hiểu được để nguyên.
 */
export function transposeProgression(text: string, from: KeyRef, to: KeyRef): string {
  const interval = Interval.distance(majorTonic(from), majorTonic(to))
  if (interval === '1P') return text
  return text
    .split(/([\s|,–-]+)/)
    .map((part) => {
      const m = part.match(/^([A-G][#b♯♭]?)(.*?)(?:\/([A-G][#b♯♭]?))?(\*\d+)?$/)
      if (!m) return part
      const [, root, suffix, bass, times = ''] = m
      const norm = (n: string) => n.replace(/♯/g, '#').replace(/♭/g, 'b')
      return transposeNote(norm(root), interval) + suffix + (bass ? `/${transposeNote(norm(bass), interval)}` : '') + times
    })
    .join('')
}

export function chordLabel(c: ProgressionChord): string {
  const suffix = c.suffix.replace(/b(\d)/g, '♭$1').replace(/#(\d)/g, '♯$1')
  return displayNote(c.root) + suffix + (c.bass ? `/${displayNote(c.bass)}` : '')
}

export function scaleLabel(s: { root: string; typeId: string }, locale: Locale = 'vi'): string {
  return `${displayNote(s.root)} ${scaleTypeName(scaleType(s.typeId), locale)}`
}

/** Chỉ số hợp âm đang vang ở ô nhịp `bar`. */
export function chordIndexAtBar(chords: ProgressionChord[], bar: number): number {
  let acc = 0
  for (let i = 0; i < chords.length; i++) {
    acc += chords[i].bars
    if (bar < acc) return i
  }
  return chords.length - 1
}

/**
 * Tô sáng cho Jam: nốt của hợp âm hiện tại (màu thường, chủ âm hợp âm màu đỏ)
 * và các nốt còn lại của scale đang chọn (màu xám). Nhãn quãng tính từ nốt gốc của hợp âm.
 */
export function jamHighlights(chord: ProgressionChord, scale: { root: string; typeId: string } | null, labels: 'note' | 'interval'): HighlightMap {
  const chordLabels = chord.intervals.map(intervalLabel)
  const map = makeHighlights(chord.notes, chordLabels, labels)
  if (!scale) return map
  for (const n of scaleFromRoot(scale.root, scale.typeId).notes) {
    const c = chroma(n)
    if (map.has(c)) continue
    const label = labels === 'note' ? displayNote(n) : intervalLabel(Interval.simplify(Interval.distance(chord.root, n)) || '1P')
    map.set(c, { label, isRoot: false, color: 'neutral' })
  }
  return map
}

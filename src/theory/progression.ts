import { Chord, Note, Scale } from 'tonal'
import type { Locale } from '../i18n/locale'
import { CHORD_TYPES, chordFromRoot } from './chords'
import { chroma, displayNote } from './notes'

export type Mode = 'major' | 'minor'

export interface KeyRef {
  tonic: string
  mode: Mode
}

export interface ProgressionChord {
  /** Ký hiệu như người dùng viết sau khi chuẩn hóa: "Am7", "G/B". */
  symbol: string
  root: string
  /** Hậu tố loại hợp âm: "", "m", "7", "maj7"… */
  suffix: string
  intervals: string[]
  notes: string[]
  /** Nốt bass nếu là hợp âm có dấu "/" (C/E). */
  bass?: string
  /** Số ô nhịp hợp âm này kéo dài. */
  bars: number
}

export type TheoryErrorCode = 'empty' | 'badChord' | 'badBass' | 'repeatFirst' | 'badBars' | 'badKey'

/** Lỗi do người dùng nhập sai; giao diện dịch theo `code` + `params`, `message` là bản tiếng Việt. */
export class TheoryError extends Error {
  readonly code: TheoryErrorCode
  readonly params: Record<string, string>

  constructor(message: string, code: TheoryErrorCode, params: Record<string, string> = {}) {
    super(message)
    this.code = code
    this.params = params
  }
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
const ROMAN_RE = /^([b#♭♯]?)(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(.*)$/

function normalizeAccidentals(s: string): string {
  return s.replace(/♯/g, '#').replace(/♭/g, 'b')
}

export function keyScale(key: KeyRef): string[] {
  return Scale.get(`${key.tonic} ${key.mode === 'major' ? 'major' : 'aeolian'}`).notes
}

/** Đọc tên giọng: "C", "F#", "Am", "Bbm". */
export function parseKey(text: string): KeyRef {
  const t = normalizeAccidentals(text.trim())
  const minor = /m$/.test(t)
  const tonic = minor ? t.slice(0, -1) : t
  if (!/^[A-G][#b]?$/.test(tonic)) throw new TheoryError(`Giọng không hợp lệ: ${text}`, 'badKey', { key: text })
  return { tonic, mode: minor ? 'minor' : 'major' }
}

export function keyLabel(key: KeyRef, locale: Locale = 'vi'): string {
  if (locale === 'en') return `${displayNote(key.tonic)} ${key.mode}`
  return `${displayNote(key.tonic)} ${key.mode === 'major' ? 'trưởng' : 'thứ'}`
}

function sharpen(n: string): string {
  return n.endsWith('b') ? n.slice(0, -1) : `${n}#`
}

function flatten(n: string): string {
  return n.endsWith('#') ? n.slice(0, -1) : `${n}b`
}

/** Hậu tố loại hợp âm từ phần đuôi của số La Mã ("", "7", "°", "ø7", "maj7"…). */
function romanSuffix(rest: string, lower: boolean): string {
  const r = rest.replace(/^o/, '°')
  if (r === '°') return 'dim'
  if (r === '°7') return 'dim7'
  if (r === 'ø' || r === 'ø7') return 'm7b5'
  if (r === '+') return 'aug'
  if (!lower) return r
  if (r === '') return 'm'
  if (r.startsWith('m') || r.startsWith('dim')) return r
  return `m${r}`
}

function chordFromSymbol(symbol: string, bars: number): ProgressionChord {
  const [main, bassPart] = symbol.split('/')
  const c = Chord.get(main)
  if (c.empty || !c.tonic) throw new TheoryError(`Không hiểu hợp âm "${symbol}"`, 'badChord', { symbol })
  let bass: string | undefined
  if (bassPart !== undefined) {
    if (!/^[A-G][#b]?$/.test(bassPart)) throw new TheoryError(`Nốt bass không hợp lệ trong "${symbol}"`, 'badBass', { symbol })
    bass = bassPart
  }
  return { symbol, root: c.tonic, suffix: main.slice(c.tonic.length), intervals: c.intervals, notes: c.notes, bass, bars }
}

function romanToSymbol(token: string, key: KeyRef): string {
  const m = token.match(ROMAN_RE)!
  const [, acc, numeral, rest] = m
  const degree = ROMAN.indexOf(numeral.toUpperCase())
  let root = keyScale(key)[degree]
  if (acc === 'b') root = flatten(root)
  if (acc === '#') root = sharpen(root)
  const suffix = romanSuffix(rest, numeral === numeral.toLowerCase())
  return root + (suffix === 'M' ? '' : suffix)
}

/**
 * Đọc tiến trình hợp âm. Mỗi hợp âm là một ô nhịp; ngăn cách bằng khoảng trắng, "-", "|" hoặc ",".
 * Chấp nhận ký hiệu hợp âm ("Dm7 G7 Cmaj7", "C G/B Am") hoặc số La Mã theo giọng ("ii V I", "I-V-vi-IV", "bVII").
 * "C*2" là hai ô nhịp C; "%" lặp lại hợp âm trước.
 */
export function parseProgression(text: string, key: KeyRef = { tonic: 'C', mode: 'major' }): ProgressionChord[] {
  const tokens = normalizeAccidentals(text)
    .split(/[\s|,–-]+/)
    .filter(Boolean)
  if (tokens.length === 0) throw new TheoryError('Chưa có hợp âm nào', 'empty')
  const out: ProgressionChord[] = []
  for (const raw of tokens) {
    if (raw === '%') {
      if (!out.length) throw new TheoryError('"%" phải đứng sau một hợp âm', 'repeatFirst')
      out[out.length - 1] = { ...out[out.length - 1], bars: out[out.length - 1].bars + 1 }
      continue
    }
    const [body, times] = raw.split('*')
    const bars = times === undefined ? 1 : Number(times)
    if (!Number.isInteger(bars) || bars < 1 || bars > 16) throw new TheoryError(`Số ô nhịp không hợp lệ trong "${raw}"`, 'badBars', { token: raw })
    const symbol = ROMAN_RE.test(body) ? romanToSymbol(body, key) : body
    out.push(chordFromSymbol(symbol, bars))
  }
  return out
}

/** Danh sách hợp âm theo từng ô nhịp (hợp âm kéo dài nhiều ô được lặp lại). */
export function chordsPerBar(chords: ProgressionChord[]): ProgressionChord[] {
  return chords.flatMap((c) => Array.from({ length: c.bars }, () => c))
}

/** Id loại hợp âm trong CHORD_TYPES khớp với tập quãng, nếu có. */
export function chordTypeId(intervals: string[]): string | undefined {
  const key = intervals.join(' ')
  return CHORD_TYPES.find((t) => chordFromRoot('C', t.id).intervals.join(' ') === key)?.id
}

/** Ký hiệu La Mã của hợp âm trong một giọng: G7 trong C → "V7", Bb trong C → "♭VII", Bm7b5 → "viiø7". */
export function romanNumeral(chord: ProgressionChord, key: KeyRef): string {
  const scale = keyScale(key).map(chroma)
  const c = chroma(chord.root)
  let degree = scale.indexOf(c)
  let acc = ''
  if (degree < 0) {
    degree = scale.indexOf((c + 1) % 12)
    acc = '♭'
  }
  if (degree < 0) {
    degree = scale.indexOf((c + 11) % 12)
    acc = '♯'
  }
  const minorThird = chord.intervals.includes('3m')
  const numeral = minorThird ? ROMAN[degree].toLowerCase() : ROMAN[degree]
  const type = chordTypeId(chord.intervals)
  const tail: Record<string, string> = {
    M: '',
    m: '',
    dim: '°',
    aug: '+',
    '7': '7',
    maj7: 'maj7',
    m7: '7',
    m7b5: 'ø7',
    dim7: '°7',
    '6': '6',
    m6: '6',
    '9': '9',
    m9: '9',
    maj9: 'maj9',
    sus2: 'sus2',
    sus4: 'sus4',
    '7sus4': '7sus4',
    add9: 'add9',
  }
  const suffix = type ? tail[type] : chord.suffix.replace(/^m(?!aj)/, '')
  return `${acc}${numeral}${suffix}${chord.bass ? `/${displayNote(chord.bass)}` : ''}`
}

/** Hợp âm có phải toàn hợp âm 7 át (kiểu blues) không. */
export function isBluesLike(chords: ProgressionChord[]): boolean {
  return chords.length >= 3 && chords.every((c) => chordTypeId(c.intervals) === '7' || chordTypeId(c.intervals) === '9')
}

/**
 * Đoán giọng của tiến trình: chấm điểm 24 giọng theo số nốt hợp âm nằm trong scale,
 * cộng điểm nếu hợp âm đầu / cuối là hợp âm chủ.
 */
export function detectKey(chords: ProgressionChord[]): KeyRef {
  if (isBluesLike(chords)) return { tonic: chords[0].root, mode: 'major' }
  const tonics = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
  const candidates: KeyRef[] = tonics.flatMap((t) => [
    { tonic: t, mode: 'major' as const },
    { tonic: ['Db', 'Ab'].includes(t) ? Note.enharmonic(t) : t, mode: 'minor' as const },
  ])
  const first = chords[0]
  const last = chords[chords.length - 1]
  let best = candidates[0]
  let bestScore = -Infinity
  for (const key of candidates) {
    const scale = new Set(keyScale(key).map(chroma))
    let score = 0
    for (const ch of chords) {
      const inScale = ch.notes.filter((n) => scale.has(chroma(n))).length
      score += (inScale - (ch.notes.length - inScale) * 2) * ch.bars
    }
    const tonicMinor = key.mode === 'minor'
    const isTonic = (ch: ProgressionChord) => chroma(ch.root) === chroma(key.tonic) && ch.intervals.includes(tonicMinor ? '3m' : '3M')
    if (isTonic(first)) score += 4
    if (isTonic(last)) score += 3
    if (score > bestScore) {
      best = key
      bestScore = score
    }
  }
  return best
}

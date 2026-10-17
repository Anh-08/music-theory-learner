import { Chord } from 'tonal'
import type { Locale } from '../i18n/locale'
import { bestRootSpelling, displayNote, type Chroma } from './notes'
import { intervalLabel } from './intervals'

export interface ChordType {
  /** Ký hiệu loại hợp âm theo tonal. */
  id: string
  /** Hậu tố hiển thị sau tên chủ âm: "" (trưởng), "m", "maj7"… */
  suffix: string
  nameVi: string
  nameEn: string
  group: 'triad' | 'seventh' | 'extended'
}

export const CHORD_TYPES: ChordType[] = [
  { id: 'M', suffix: '', nameVi: 'Trưởng', nameEn: 'Major', group: 'triad' },
  { id: 'm', suffix: 'm', nameVi: 'Thứ', nameEn: 'Minor', group: 'triad' },
  { id: 'dim', suffix: 'dim', nameVi: 'Giảm', nameEn: 'Diminished', group: 'triad' },
  { id: 'aug', suffix: 'aug', nameVi: 'Tăng', nameEn: 'Augmented', group: 'triad' },
  { id: 'sus2', suffix: 'sus2', nameVi: 'Treo bậc 2', nameEn: 'Suspended 2nd', group: 'triad' },
  { id: 'sus4', suffix: 'sus4', nameVi: 'Treo bậc 4', nameEn: 'Suspended 4th', group: 'triad' },
  { id: 'maj7', suffix: 'maj7', nameVi: 'Bảy trưởng', nameEn: 'Major 7th', group: 'seventh' },
  { id: '7', suffix: '7', nameVi: 'Bảy (át)', nameEn: 'Dominant 7th', group: 'seventh' },
  { id: 'm7', suffix: 'm7', nameVi: 'Thứ bảy', nameEn: 'Minor 7th', group: 'seventh' },
  { id: 'm7b5', suffix: 'm7♭5', nameVi: 'Nửa giảm', nameEn: 'Half-diminished', group: 'seventh' },
  { id: 'dim7', suffix: 'dim7', nameVi: 'Bảy giảm', nameEn: 'Diminished 7th', group: 'seventh' },
  { id: '7sus4', suffix: '7sus4', nameVi: 'Bảy treo 4', nameEn: 'Dominant 7th sus4', group: 'seventh' },
  { id: 'mMaj7', suffix: 'm(maj7)', nameVi: 'Thứ bảy trưởng', nameEn: 'Minor-major 7th', group: 'seventh' },
  { id: '7b5', suffix: '7♭5', nameVi: 'Bảy giáng 5', nameEn: 'Dominant 7th ♭5', group: 'seventh' },
  { id: '7#5', suffix: '7♯5', nameVi: 'Bảy thăng 5', nameEn: 'Dominant 7th ♯5', group: 'seventh' },
  { id: '6', suffix: '6', nameVi: 'Sáu', nameEn: 'Major 6th', group: 'extended' },
  { id: 'm6', suffix: 'm6', nameVi: 'Thứ sáu', nameEn: 'Minor 6th', group: 'extended' },
  { id: 'add9', suffix: 'add9', nameVi: 'Thêm 9', nameEn: 'Add 9', group: 'extended' },
  { id: '9', suffix: '9', nameVi: 'Chín (át)', nameEn: 'Dominant 9th', group: 'extended' },
  { id: 'maj9', suffix: 'maj9', nameVi: 'Chín trưởng', nameEn: 'Major 9th', group: 'extended' },
  { id: 'm9', suffix: 'm9', nameVi: 'Thứ chín', nameEn: 'Minor 9th', group: 'extended' },
  { id: '69', suffix: '6/9', nameVi: 'Sáu chín', nameEn: '6/9', group: 'extended' },
  { id: '9sus4', suffix: '9sus4', nameVi: 'Chín treo 4', nameEn: '9th sus4', group: 'extended' },
  { id: '7b9', suffix: '7♭9', nameVi: 'Bảy giáng 9', nameEn: 'Dominant 7th ♭9', group: 'extended' },
  { id: '7#9', suffix: '7♯9', nameVi: 'Bảy thăng 9', nameEn: 'Dominant 7th ♯9', group: 'extended' },
  { id: '11', suffix: '11', nameVi: 'Mười một (át)', nameEn: 'Dominant 11th', group: 'extended' },
  { id: 'm11', suffix: 'm11', nameVi: 'Thứ mười một', nameEn: 'Minor 11th', group: 'extended' },
  { id: '13', suffix: '13', nameVi: 'Mười ba (át)', nameEn: 'Dominant 13th', group: 'extended' },
]

export interface ChordInfo {
  type: ChordType
  root: string
  notes: string[]
  intervals: string[]
  /** Công thức: "1", "3", "5", "♭7"… */
  labels: string[]
}

export function chordTypeName(t: ChordType, locale: Locale): string {
  return locale === 'vi' ? t.nameVi : t.nameEn
}

export function chordType(id: string): ChordType {
  const t = CHORD_TYPES.find((c) => c.id === id)
  if (!t) throw new Error(`Không có loại hợp âm: ${id}`)
  return t
}

/** Hợp âm với chủ âm viết đúng như truyền vào. */
export function chordFromRoot(root: string, typeId: string): ChordInfo {
  const type = chordType(typeId)
  const c = Chord.getChord(typeId, root)
  if (c.empty) throw new Error(`Không dựng được hợp âm: ${root} ${typeId}`)
  return { type, root, notes: c.notes, intervals: c.intervals, labels: c.intervals.map(intervalLabel) }
}

export function getChord(rootChroma: Chroma, typeId: string): ChordInfo {
  return chordFromRoot(bestRootSpelling(rootChroma, (r) => Chord.getChord(typeId, r).notes), typeId)
}

/** Tên hợp âm để hiển thị: "Bb" + "m7" → "B♭m7". */
export function chordSymbol(root: string, typeId: string): string {
  return displayNote(root) + chordType(typeId).suffix
}

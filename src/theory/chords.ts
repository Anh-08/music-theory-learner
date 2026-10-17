import { Chord } from 'tonal'
import { bestRootSpelling, type Chroma } from './notes'
import { intervalLabel } from './intervals'

export interface ChordType {
  /** Ký hiệu loại hợp âm theo tonal. */
  id: string
  /** Hậu tố hiển thị sau tên chủ âm: "" (trưởng), "m", "maj7"… */
  suffix: string
  nameVi: string
  group: 'Hợp âm ba' | 'Hợp âm 7' | 'Hợp âm mở rộng'
}

export const CHORD_TYPES: ChordType[] = [
  { id: 'M', suffix: '', nameVi: 'Trưởng', group: 'Hợp âm ba' },
  { id: 'm', suffix: 'm', nameVi: 'Thứ', group: 'Hợp âm ba' },
  { id: 'dim', suffix: 'dim', nameVi: 'Giảm', group: 'Hợp âm ba' },
  { id: 'aug', suffix: 'aug', nameVi: 'Tăng', group: 'Hợp âm ba' },
  { id: 'sus2', suffix: 'sus2', nameVi: 'Treo bậc 2', group: 'Hợp âm ba' },
  { id: 'sus4', suffix: 'sus4', nameVi: 'Treo bậc 4', group: 'Hợp âm ba' },
  { id: 'maj7', suffix: 'maj7', nameVi: 'Bảy trưởng', group: 'Hợp âm 7' },
  { id: '7', suffix: '7', nameVi: 'Bảy (át)', group: 'Hợp âm 7' },
  { id: 'm7', suffix: 'm7', nameVi: 'Thứ bảy', group: 'Hợp âm 7' },
  { id: 'm7b5', suffix: 'm7♭5', nameVi: 'Nửa giảm', group: 'Hợp âm 7' },
  { id: 'dim7', suffix: 'dim7', nameVi: 'Bảy giảm', group: 'Hợp âm 7' },
  { id: '7sus4', suffix: '7sus4', nameVi: 'Bảy treo 4', group: 'Hợp âm 7' },
  { id: '6', suffix: '6', nameVi: 'Sáu', group: 'Hợp âm mở rộng' },
  { id: 'm6', suffix: 'm6', nameVi: 'Thứ sáu', group: 'Hợp âm mở rộng' },
  { id: 'add9', suffix: 'add9', nameVi: 'Thêm 9', group: 'Hợp âm mở rộng' },
  { id: '9', suffix: '9', nameVi: 'Chín (át)', group: 'Hợp âm mở rộng' },
  { id: 'maj9', suffix: 'maj9', nameVi: 'Chín trưởng', group: 'Hợp âm mở rộng' },
  { id: 'm9', suffix: 'm9', nameVi: 'Thứ chín', group: 'Hợp âm mở rộng' },
]

export interface ChordInfo {
  type: ChordType
  root: string
  notes: string[]
  intervals: string[]
  /** Công thức: "1", "3", "5", "♭7"… */
  labels: string[]
}

export function chordType(id: string): ChordType {
  const t = CHORD_TYPES.find((c) => c.id === id)
  if (!t) throw new Error(`Không có loại hợp âm: ${id}`)
  return t
}

export function getChord(rootChroma: Chroma, typeId: string): ChordInfo {
  const type = chordType(typeId)
  const root = bestRootSpelling(rootChroma, (r) => Chord.getChord(typeId, r).notes)
  const c = Chord.getChord(typeId, root)
  return { type, root, notes: c.notes, intervals: c.intervals, labels: c.intervals.map(intervalLabel) }
}

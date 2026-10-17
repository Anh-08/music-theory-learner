import { Scale } from 'tonal'
import { bestRootSpelling, type Chroma } from './notes'
import { intervalLabel } from './intervals'

export interface ScaleType {
  /** Tên scale theo tonal. */
  id: string
  name: string
  nameVi: string
  description: string
}

export const SCALE_TYPES: ScaleType[] = [
  { id: 'major', name: 'Major', nameVi: 'Trưởng', description: 'Scale nền tảng của hầu hết nhạc phương Tây. Công thức cung–nửa cung: W W H W W W H.' },
  { id: 'aeolian', name: 'Natural minor', nameVi: 'Thứ tự nhiên', description: 'Âm giai thứ cơ bản (còn gọi Aeolian), nghe buồn, trầm hơn scale trưởng.' },
  { id: 'major pentatonic', name: 'Major pentatonic', nameVi: 'Ngũ cung trưởng', description: 'Scale trưởng bỏ bậc 4 và 7 — gần như không có nốt "nghịch", rất an toàn khi improvise.' },
  { id: 'minor pentatonic', name: 'Minor pentatonic', nameVi: 'Ngũ cung thứ', description: 'Scale thứ bỏ bậc 2 và 6. Là "cửa vào" phổ biến nhất của solo rock, blues, pop.' },
  { id: 'blues', name: 'Blues', nameVi: 'Blues', description: 'Ngũ cung thứ thêm nốt ♭5 ("blue note") tạo màu blues đặc trưng.' },
  { id: 'dorian', name: 'Dorian', nameVi: 'Dorian', description: 'Điệu thức thứ có bậc 6 trưởng — sáng hơn thứ tự nhiên, hay dùng trên hợp âm m7.' },
  { id: 'phrygian', name: 'Phrygian', nameVi: 'Phrygian', description: 'Điệu thức thứ có bậc ♭2 — màu Tây Ban Nha, flamenco, metal.' },
  { id: 'lydian', name: 'Lydian', nameVi: 'Lydian', description: 'Điệu thức trưởng có bậc ♯4 — nghe bay bổng, mơ màng (nhạc phim).' },
  { id: 'mixolydian', name: 'Mixolydian', nameVi: 'Mixolydian', description: 'Điệu thức trưởng có bậc ♭7 — dùng trên hợp âm 7 (át), rất phổ biến trong rock và blues.' },
  { id: 'locrian', name: 'Locrian', nameVi: 'Locrian', description: 'Điệu thức có ♭2 và ♭5 — không ổn định, dùng trên hợp âm m7♭5.' },
  { id: 'harmonic minor', name: 'Harmonic minor', nameVi: 'Thứ hòa âm', description: 'Thứ tự nhiên nâng bậc 7 lên nửa cung, tạo hợp âm V trưởng trong giọng thứ. Màu "phương Đông".' },
  { id: 'melodic minor', name: 'Melodic minor', nameVi: 'Thứ giai điệu', description: 'Thứ tự nhiên nâng bậc 6 và 7 — nền tảng của nhiều scale jazz.' },
]

export interface ScaleInfo {
  type: ScaleType
  root: string
  /** Tên nốt, viết theo đúng giọng (ví dụ F trưởng có B♭ chứ không phải A♯). */
  notes: string[]
  /** Quãng theo tonal: "1P", "3m"… */
  intervals: string[]
  /** Nhãn quãng: "1", "♭3"… */
  labels: string[]
}

export function scaleType(id: string): ScaleType {
  const t = SCALE_TYPES.find((s) => s.id === id)
  if (!t) throw new Error(`Không có scale: ${id}`)
  return t
}

export function getScale(rootChroma: Chroma, typeId: string): ScaleInfo {
  const type = scaleType(typeId)
  const root = bestRootSpelling(rootChroma, (r) => Scale.get(`${r} ${typeId}`).notes)
  const s = Scale.get(`${root} ${typeId}`)
  return { type, root, notes: s.notes, intervals: s.intervals, labels: s.intervals.map(intervalLabel) }
}

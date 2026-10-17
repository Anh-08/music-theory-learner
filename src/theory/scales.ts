import { Scale } from 'tonal'
import type { Locale, Localized } from '../i18n/locale'
import { bestRootSpelling, type Chroma } from './notes'
import { intervalLabel } from './intervals'

export interface ScaleType {
  /** Tên scale theo tonal. */
  id: string
  /** Tên tiếng Anh. */
  name: string
  nameVi: string
  description: Localized
}

export const SCALE_TYPES: ScaleType[] = [
  { id: 'major', name: 'Major', nameVi: 'Trưởng', description: { vi: 'Scale nền tảng của hầu hết nhạc phương Tây. Công thức cung–nửa cung: W W H W W W H.', en: 'The foundation of most Western music. Step pattern: W W H W W W H.' } },
  { id: 'aeolian', name: 'Natural minor', nameVi: 'Thứ tự nhiên', description: { vi: 'Âm giai thứ cơ bản (còn gọi Aeolian), nghe buồn, trầm hơn scale trưởng.', en: 'The basic minor scale (also called Aeolian) — darker and sadder than the major scale.' } },
  { id: 'major pentatonic', name: 'Major pentatonic', nameVi: 'Ngũ cung trưởng', description: { vi: 'Scale trưởng bỏ bậc 4 và 7 — gần như không có nốt "nghịch", rất an toàn khi improvise.', en: 'The major scale without degrees 4 and 7 — almost no clashing notes, very safe for improvising.' } },
  { id: 'minor pentatonic', name: 'Minor pentatonic', nameVi: 'Ngũ cung thứ', description: { vi: 'Scale thứ bỏ bậc 2 và 6. Là "cửa vào" phổ biến nhất của solo rock, blues, pop.', en: 'The minor scale without degrees 2 and 6. The most common gateway into rock, blues and pop soloing.' } },
  { id: 'blues', name: 'Blues', nameVi: 'Blues', description: { vi: 'Ngũ cung thứ thêm nốt ♭5 ("blue note") tạo màu blues đặc trưng.', en: 'Minor pentatonic plus the ♭5 ("blue note") for the signature blues sound.' } },
  { id: 'dorian', name: 'Dorian', nameVi: 'Dorian', description: { vi: 'Điệu thức thứ có bậc 6 trưởng — sáng hơn thứ tự nhiên, hay dùng trên hợp âm m7.', en: 'A minor mode with a major 6th — brighter than natural minor, often used over m7 chords.' } },
  { id: 'phrygian', name: 'Phrygian', nameVi: 'Phrygian', description: { vi: 'Điệu thức thứ có bậc ♭2 — màu Tây Ban Nha, flamenco, metal.', en: 'A minor mode with a ♭2 — Spanish, flamenco and metal colours.' } },
  { id: 'lydian', name: 'Lydian', nameVi: 'Lydian', description: { vi: 'Điệu thức trưởng có bậc ♯4 — nghe bay bổng, mơ màng (nhạc phim).', en: 'A major mode with a ♯4 — floating and dreamy (think film music).' } },
  { id: 'mixolydian', name: 'Mixolydian', nameVi: 'Mixolydian', description: { vi: 'Điệu thức trưởng có bậc ♭7 — dùng trên hợp âm 7 (át), rất phổ biến trong rock và blues.', en: 'A major mode with a ♭7 — fits dominant 7th chords, very common in rock and blues.' } },
  { id: 'locrian', name: 'Locrian', nameVi: 'Locrian', description: { vi: 'Điệu thức có ♭2 và ♭5 — không ổn định, dùng trên hợp âm m7♭5.', en: 'A mode with ♭2 and ♭5 — unstable, used over m7♭5 chords.' } },
  { id: 'harmonic minor', name: 'Harmonic minor', nameVi: 'Thứ hòa âm', description: { vi: 'Thứ tự nhiên nâng bậc 7 lên nửa cung, tạo hợp âm V trưởng trong giọng thứ. Màu "phương Đông".', en: 'Natural minor with a raised 7th, giving a major V chord in minor keys. An "exotic" sound.' } },
  { id: 'melodic minor', name: 'Melodic minor', nameVi: 'Thứ giai điệu', description: { vi: 'Thứ tự nhiên nâng bậc 6 và 7 — nền tảng của nhiều scale jazz.', en: 'Natural minor with raised 6th and 7th — the basis of many jazz scales.' } },
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

/** Tên loại scale theo ngôn ngữ: "Ngũ cung thứ" / "Minor pentatonic". */
export function scaleTypeName(t: ScaleType, locale: Locale): string {
  return locale === 'vi' ? t.nameVi : t.name
}

export function scaleType(id: string): ScaleType {
  const t = SCALE_TYPES.find((s) => s.id === id)
  if (!t) throw new Error(`Không có scale: ${id}`)
  return t
}

/** Scale với chủ âm viết đúng như truyền vào (không tự đổi C♯ thành D♭). */
export function scaleFromRoot(root: string, typeId: string): ScaleInfo {
  const type = scaleType(typeId)
  const s = Scale.get(`${root} ${typeId}`)
  if (s.empty) throw new Error(`Không dựng được scale: ${root} ${typeId}`)
  return { type, root, notes: s.notes, intervals: s.intervals, labels: s.intervals.map(intervalLabel) }
}

/** Scale theo chroma của chủ âm, tự chọn cách viết ít dấu hóa nhất. */
export function getScale(rootChroma: Chroma, typeId: string): ScaleInfo {
  return scaleFromRoot(bestRootSpelling(rootChroma, (r) => Scale.get(`${r} ${typeId}`).notes), typeId)
}

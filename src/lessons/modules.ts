import type { Localized } from '../i18n/locale'

export interface ModuleInfo {
  id: string
  number: number
  title: Localized
  description: Localized
}

/** Thứ tự các module trong lộ trình (xem PLAN.md mục 4). Module chưa có bài hiển thị là "sắp có". */
export const MODULES: ModuleInfo[] = [
  {
    id: 'm0-ban-do',
    number: 0,
    title: { vi: 'Bản đồ âm thanh', en: 'The map of notes' },
    description: { vi: '12 nốt nhạc, cung và nửa cung, tìm nốt nhanh trên cây đàn của bạn.', en: 'The 12 notes, whole and half steps, finding notes quickly on your instrument.' },
  },
  {
    id: 'm1-quang',
    number: 1,
    title: { vi: 'Quãng', en: 'Intervals' },
    description: { vi: 'Khoảng cách giữa hai nốt — viên gạch của mọi hợp âm và giai điệu.', en: 'The distance between two notes — the building block of every chord and melody.' },
  },
  {
    id: 'm2-scale-truong',
    number: 2,
    title: { vi: 'Scale trưởng và giọng', en: 'The major scale and keys' },
    description: { vi: 'Công thức scale trưởng, tên các bậc, vòng quãng năm và hóa biểu.', en: 'The major scale formula, scale degrees, the circle of fifths and key signatures.' },
  },
  {
    id: 'm3-hop-am-ba',
    number: 3,
    title: { vi: 'Hợp âm ba', en: 'Triads' },
    description: { vi: 'Dựng hợp âm từ quãng 3, thế đảo, CAGED và 7 hợp âm thuận giọng.', en: 'Building chords from thirds, inversions, CAGED and the 7 diatonic chords.' },
  },
  {
    id: 'm4-tien-trinh',
    number: 4,
    title: { vi: 'Tiến trình hợp âm', en: 'Chord progressions' },
    description: { vi: 'Số La Mã, chức năng hợp âm, các tiến trình kinh điển.', en: 'Roman numerals, chord functions and the classic progressions.' },
  },
  {
    id: 'm5-ngu-cung-blues',
    number: 5,
    title: { vi: 'Ngũ cung và Blues', en: 'Pentatonics and the blues' },
    description: { vi: 'Cửa vào improvise: pentatonic, blues scale, bài jam đầu tiên.', en: 'Your gateway to improvising: pentatonic scales, the blues scale and your first jam.' },
  },
  {
    id: 'm6-hop-am-7',
    number: 6,
    title: { vi: 'Hợp âm 7 và mở rộng', en: 'Seventh and extended chords' },
    description: { vi: 'maj7, 7, m7, m7♭5, sus, add9 và cách voicing.', en: 'maj7, 7, m7, m7♭5, sus, add9 and how to voice them.' },
  },
  {
    id: 'm7-improvise-theo-hop-am',
    number: 7,
    title: { vi: 'Improvise theo hợp âm', en: 'Improvising over the chords' },
    description: { vi: 'Chord tones, guide tones, nốt tiếp cận, phát triển motif.', en: 'Chord tones, guide tones, approach notes and developing motifs.' },
  },
  {
    id: 'm8-dieu-thuc',
    number: 8,
    title: { vi: 'Điệu thức (Modes)', en: 'Modes' },
    description: { vi: 'Bảy điệu thức của scale trưởng và màu sắc của chúng.', en: 'The seven modes of the major scale and their colours.' },
  },
  {
    id: 'm9-mo-rong-hoa-am',
    number: 9,
    title: { vi: 'Mở rộng hòa âm', en: 'Expanding harmony' },
    description: { vi: 'Giọng thứ, át phụ, hợp âm mượn, chuyển giọng.', en: 'Minor keys, secondary dominants, borrowed chords and modulation.' },
  },
  {
    id: 'm10-sang-tac',
    number: 10,
    title: { vi: 'Sáng tác một bài hoàn chỉnh', en: 'Writing a complete song' },
    description: { vi: 'Cấu trúc bài, viết tiến trình và giai điệu.', en: 'Song structure, writing progressions and melodies.' },
  },
]

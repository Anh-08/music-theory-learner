export interface ModuleInfo {
  id: string
  number: number
  title: string
  description: string
}

/** Thứ tự các module trong lộ trình (xem PLAN.md mục 4). Module chưa có bài hiển thị là "sắp có". */
export const MODULES: ModuleInfo[] = [
  { id: 'm0-ban-do', number: 0, title: 'Bản đồ âm thanh', description: '12 nốt nhạc, cung và nửa cung, tìm nốt nhanh trên cây đàn của bạn.' },
  { id: 'm1-quang', number: 1, title: 'Quãng', description: 'Khoảng cách giữa hai nốt — viên gạch của mọi hợp âm và giai điệu.' },
  { id: 'm2-scale-truong', number: 2, title: 'Scale trưởng và giọng', description: 'Công thức scale trưởng, tên các bậc, vòng quãng năm và hóa biểu.' },
  { id: 'm3-hop-am-ba', number: 3, title: 'Hợp âm ba', description: 'Dựng hợp âm từ quãng 3, thế đảo, CAGED và 7 hợp âm thuận giọng.' },
  { id: 'm4-tien-trinh', number: 4, title: 'Tiến trình hợp âm', description: 'Số La Mã, chức năng hợp âm, các tiến trình kinh điển.' },
  { id: 'm5-ngu-cung-blues', number: 5, title: 'Ngũ cung và Blues', description: 'Cửa vào improvise: pentatonic, blues scale, bài jam đầu tiên.' },
  { id: 'm6-hop-am-7', number: 6, title: 'Hợp âm 7 và mở rộng', description: 'maj7, 7, m7, m7♭5, sus, add9 và cách voicing.' },
  { id: 'm7-improvise-theo-hop-am', number: 7, title: 'Improvise theo hợp âm', description: 'Chord tones, guide tones, nốt tiếp cận, phát triển motif.' },
  { id: 'm8-dieu-thuc', number: 8, title: 'Điệu thức (Modes)', description: 'Bảy điệu thức của scale trưởng và màu sắc của chúng.' },
  { id: 'm9-mo-rong-hoa-am', number: 9, title: 'Mở rộng hòa âm', description: 'Giọng thứ, át phụ, hợp âm mượn, chuyển giọng.' },
  { id: 'm10-sang-tac', number: 10, title: 'Sáng tác một bài hoàn chỉnh', description: 'Cấu trúc bài, viết tiến trình và giai điệu.' },
]

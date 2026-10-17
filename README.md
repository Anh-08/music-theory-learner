# Music Theory Learner

Ứng dụng web giúp người **đã biết chơi** guitar hoặc piano học nhạc lý một cách thực hành — để hiểu bài nhạc được tạo ra như thế nào, tự đệm và **improvise**. Song ngữ Việt – Anh (nút VI / EN ở thanh trên).

*A hands-on music theory course for guitarists and pianists who can already play, aimed at accompanying songs and improvising. Available in Vietnamese and English.*

**Dùng ngay:** https://anh-08.github.io/music-theory-learner/ (cài được lên điện thoại như một ứng dụng, dùng offline).

Kế hoạch chi tiết: [PLAN.md](PLAN.md)

## Có gì bên trong

- **Lộ trình 48 bài** (Module 0 – 10 và nhánh guitar): 12 nốt, quãng, scale trưởng, vòng quãng năm, hợp âm ba, thế đảo, CAGED, hợp âm thuận giọng, tiến trình, blues, ngũ cung, hợp âm 7, chord tones, guide tones, điệu thức, át phụ, hợp âm mượn, sáng tác — và nhánh **đệm guitar theo điệu** (móc dây, quạt chả). Mỗi bài hiển thị trên cần đàn hoặc bàn phím tùy nhạc cụ bạn chọn, có nghe minh họa, câu hỏi, bài bấm trên đàn và luyện tai.
- **Explorer**: scale và hợp âm trên guitar, piano, bass, ukulele, mandolin.
- **Jam Room**: gõ tiến trình (ký hiệu hợp âm hoặc số La Mã), ứng dụng đoán giọng, phát nhạc nền trống – bass – đệm, tô nốt của hợp âm đang vang theo thời gian thực và gợi ý scale để improvise.
- **Đệm guitar**: 24 điệu quạt / móc (cả 3/4 và 12/8) trên lưới phách có vạch chạy, tăng tempo dần, tự tạo điệu, chấm độ đều tay qua micro, đổi thế bấm của từng hợp âm.
- **Thế bấm hợp âm**: nhiều cách bấm cho mọi hợp âm (trưởng, thứ, sus, dim, aug, 6, 7, maj7, m7♭5, dim7, 9, 11, 13, 7♭9, 7♯9…) với sơ đồ, số ngón, chặn và nút nghe.
- **Công cụ**: Key Explorer (vòng quãng năm, hợp âm thuận giọng và chức năng), nhận diện hợp âm, kết nối đàn thật (MIDI hoặc micro).
- **Ôn tập hằng ngày**: 7 bộ thẻ sinh câu hỏi ngẫu nhiên, lịch ôn lặp lại ngắt quãng.
- Tiến độ lưu trong trình duyệt, xuất / nhập được bằng file JSON. Không có tài khoản, không gửi dữ liệu đi đâu.

## Chạy trên máy

Cần Node.js 20 trở lên.

```bash
npm install
npm run dev
```

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev server |
| `npm run build` | Kiểm tra type và build ra `dist/` |
| `npm test` | Chạy test một lần (thêm/đổi tên file bài học mà test chưa thấy? xóa `node_modules/.vitest-cache`) |
| `npm run test:watch` | Chạy test ở chế độ theo dõi |
| `npm run lint` | Lint bằng oxlint |

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/theory/` | Nhạc lý thuần (không phụ thuộc React): nốt, quãng, scale, hợp âm, tiến trình, giọng, thế bấm guitar… |
| `src/audio/` | Âm thanh bằng Tone.js: phát nốt, nhạc nền Jam, điệu đệm, groove |
| `src/input/` | Đàn thật: Web MIDI, nhận diện cao độ và nhịp qua micro |
| `src/components/` | Cần đàn, bàn phím, lưới phách, các component dùng trong bài học và bài tập |
| `src/features/` | Các trang: lộ trình, bài học, Explorer, Jam Room, đệm guitar, giọng, nhận diện hợp âm, ôn tập, kết nối |
| `src/lessons/` | Bài học MDX: `<module>/<NN-ten-bai>.mdx` (tiếng Việt) và `.en.mdx` (tiếng Anh) |
| `src/i18n/` | Chuỗi giao diện hai ngôn ngữ |

### Thêm một bài học

Tạo `src/lessons/<module>/<NN-ten-bai>.mdx` với `export const meta = { title, description, minutes }`, viết nội dung Markdown và dùng trực tiếp các component trong `src/lessons/mdxComponents.ts` (`<Show>`, `<Play>`, `<PlayChords>`, `<Jam>`, `<RhythmPlayer>`, `<Quiz>`, `<FindNotes>`, `<EarQuiz>`…). Thêm bản `.en.mdx` với **cùng các `id` bài tập**. Test sẽ kiểm tra bài hiển thị được ở cả hai ngôn ngữ và hai nhạc cụ, id không trùng, và hai bản có cùng bộ bài tập.

## Deploy

Mỗi lần push lên `main`, GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) chạy lint, test, build và đăng lên GitHub Pages.

## Giấy phép

Mã nguồn: [MIT](LICENSE).

Âm thanh piano: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) của Alexander Holm (CC-BY 3.0), nạp từ bản do [Tone.js](https://tonejs.github.io/) lưu trữ. Logic nhạc lý dựa trên [tonal](https://github.com/tonaljs/tonal). Ví dụ bài hát trong bài học chỉ nhắc tên bài và tiến trình hợp âm.

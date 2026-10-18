# Kế hoạch dự án: Music Theory Learner

> Ứng dụng web giúp người **đã biết chơi** guitar hoặc piano học nhạc lý một cách thực hành — để hiểu bài nhạc được tạo ra như thế nào và **tự improvise** được.

---

## 1. Mục tiêu

### Người dùng là ai?
- Đã chơi được guitar hoặc piano ở mức cơ bản–trung bình: bấm hợp âm quen thuộc, đánh được vài bài, tìm phím/phím đàn không quá khó khăn.
- Chưa hiểu (hoặc hiểu rời rạc) *tại sao* các hợp âm đi với nhau, *tại sao* một scale nghe hợp với một bài.
- Muốn: tự đệm theo bài mới (với guitar: đệm được nhiều điệu, cả móc dây lẫn quạt chả), tự viết tiến trình hợp âm, và solo/ngẫu hứng (improvise) trên một backing track.

### Nguyên tắc thiết kế
1. **Học trên chính cây đàn của mình.** Mọi khái niệm đều được hiển thị trên cần đàn guitar *và* bàn phím piano; người dùng chọn nhạc cụ chính một lần, ứng dụng ưu tiên hiển thị theo đó.
2. **Nghe trước, lý thuyết sau.** Mỗi khái niệm đều bấm vào là nghe được. Nhạc lý là để giải thích âm thanh, không phải ngược lại.
3. **Mỗi bài học kết thúc bằng việc chơi.** Không chỉ quiz: có bài tập "chơi theo backing track" để áp dụng ngay.
4. **Không bắt đầu từ con số 0.** Bỏ qua phần đọc nốt nhạc trên khuông, nhịp cơ bản… vì người dùng đã chơi được. Tập trung vào quãng → scale → hợp âm → tiến trình → improvise.
5. **Song ngữ Việt – Anh**, tiếng Việt là bản gốc; trong bản tiếng Việt, thuật ngữ kèm tiếng Anh trong ngoặc, ví dụ: *quãng (interval)*, *điệu thức (mode)* — vì phần lớn tài liệu, video bên ngoài dùng tiếng Anh. Nút VI / EN ở thanh trên đổi cả giao diện lẫn bài học.

### Không làm (ít nhất ở giai đoạn đầu)
- Không có tài khoản, server, thanh toán. Đây là repo cá nhân, chạy hoàn toàn trên trình duyệt.
- Không dạy kỹ thuật tay cơ bản (cách cầm pick, tư thế, bấm hợp âm cho rõ tiếng…). Riêng **pattern đệm theo điệu** cho guitar (móc dây, quạt chả) thì có dạy — xem nhánh *Đệm theo điệu* ở mục 4.
- Không dạy đọc bản nhạc khuông nhạc (có thể thêm sau như một module tùy chọn).

---

## 2. Công nghệ

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Ngôn ngữ | **TypeScript** | Logic nhạc lý có nhiều kiểu dữ liệu (nốt, quãng, hợp âm) — type giúp tránh lỗi. |
| Framework | **React + Vite** | Phổ biến, nhiều tài liệu, build nhanh, xuất ra site tĩnh. |
| Logic nhạc lý | **[tonal](https://github.com/tonaljs/tonal)** | Thư viện MIT, đã có sẵn nốt, quãng, scale, chord, key, mode, Roman numeral. Không tự viết lại từ đầu. |
| Âm thanh | **[Tone.js](https://tonejs.github.io/)** + sample piano/guitar | Phát nốt, hợp âm, lên lịch nhịp (Transport) cho backing track và các điệu đệm. |
| Thế bấm hợp âm guitar | **[chords-db](https://github.com/tombatossals/chords-db)** (MIT) hoặc tự định nghĩa | tonal không có thế bấm; cần biết từng dây chơi nốt gì để phát âm thanh quạt/móc và xác định dây bass. |
| Đồ họa đàn | **SVG tự vẽ** (React component) | Cần đàn và bàn phím cần tương tác (click, highlight, tô màu theo bậc) — tự vẽ SVG kiểm soát tốt nhất. |
| Nội dung bài học | **MDX** (Markdown + component) | Viết bài bằng Markdown, nhúng thẳng `<Fretboard />`, `<Piano />`, `<Quiz />` vào giữa bài. |
| Style | **Tailwind CSS** | Nhanh, gọn, có dark mode. |
| Lưu tiến độ | **localStorage** | Không cần backend. Có nút xuất/nhập file JSON để sao lưu. |
| Test | **Vitest** + Testing Library | Đặc biệt test kỹ phần logic nhạc lý (dễ sai, khó phát hiện bằng mắt). |
| Deploy | **GitHub Pages** qua GitHub Actions | Miễn phí, tự build mỗi lần push lên `main`. |

### Tính năng tùy chọn (giai đoạn sau)
- **Web MIDI API**: cắm đàn piano điện/MIDI keyboard vào máy tính → ứng dụng nhận biết nốt người dùng đang bấm để chấm bài.
- **Nhận diện cao độ qua micro** (thư viện như `pitchy`): cho guitar acoustic — đàn một nốt, ứng dụng biết nốt đó là gì.
- **PWA**: cài lên điện thoại, dùng offline.

---

## 3. Các thành phần chính của ứng dụng

### 3.1. Công cụ (Tools) — dùng tự do, không theo bài
1. **Fretboard / Piano Explorer**
   - Chọn scale hoặc hợp âm + chủ âm → hiển thị trên cần đàn/bàn phím.
   - Chế độ hiển thị nhãn: *tên nốt* (C, D, E…), *quãng* (1, ♭3, 5…), *bậc* (1–7).
   - Guitar: chọn tuning (Standard, Drop D, DADGAD…), số phím, lọc theo vị trí (position) / hệ CAGED / 3-nốt-mỗi-dây.
   - Click vào nốt để nghe.
2. **Chord Builder**: chọn chủ âm + loại hợp âm → thấy công thức (1-3-5-♭7…), các thế bấm guitar, cách đặt tay piano (bao gồm thế đảo).
3. **Chord Identifier**: bấm các nốt trên đàn ảo → ứng dụng cho biết đó là hợp âm gì.
4. **Key Explorer**: chọn giọng → liệt kê 7 hợp âm thuận giọng (diatonic), chức năng của từng hợp âm, vòng quãng năm (circle of fifths) tương tác.
5. **Jam Room (Backing Track)** — *công cụ quan trọng nhất cho improvise*
   - Chọn tiến trình (có sẵn hoặc tự gõ, ví dụ `ii-V-I` hoặc `Am F C G`), giọng, tempo, nhịp điệu (pop, rock, blues shuffle, bossa…).
   - Ứng dụng phát vòng lặp: trống + bass + hợp âm.
   - Đồng thời **highlight trên cần đàn/bàn phím**: scale nên dùng, và các **nốt trong hợp âm hiện tại** (chord tones) đổi màu theo từng hợp âm đang phát.
   - Phần guitar đệm trong backing track chơi theo **điệu** người dùng chọn (dùng chung thư viện điệu với Rhythm Trainer).
6. **Rhythm Trainer — Đệm theo điệu (guitar)**
   - Thư viện điệu: chọn điệu (Ballad, Slow Rock, Valse, Bolero, Bossa Nova…) và kiểu chơi (**quạt** hoặc **móc**).
   - Hiển thị pattern trên **lưới phách**: hàng mũi tên ↓ ↑ / x cho quạt; hàng 6 dây với nốt B, 1, 2, 3 cho móc. Vạch chạy (playhead) theo nhạc, phách đang chơi sáng lên.
   - Nghe mẫu với âm thanh guitar mô phỏng: quạt xuống phát dây 6→1 lệch nhau vài mili-giây, quạt lên phát 1→6, chặn tiếng là tiếng "chát" tắt.
   - Chọn tiến trình hợp âm → điệu tự áp vào từng hợp âm (nốt bass tự đổi theo hợp âm, ví dụ C bass dây 5, G bass dây 6).
   - Chỉnh tempo, metronome, chế độ "chỉ trống + bass" để người dùng tự đệm, chế độ tăng tempo dần sau mỗi vòng.
   - Tự tạo điệu riêng bằng cách bấm vào lưới và lưu lại.

### 3.2. Lộ trình học (Curriculum)
Chia thành các module, mỗi module gồm nhiều bài ngắn (10–15 phút). Mỗi bài có cấu trúc:

> **Nghe** → **Hiểu** (giải thích + hình minh họa tương tác) → **Thấy trên đàn** → **Luyện tập** (quiz / bài nghe) → **Chơi** (bài tập với Jam Room)

### 3.3. Bài tập (Exercises)
- **Nhận diện trên đàn**: "Bấm nốt F# trên dây 3", "Tìm quãng 3 thứ từ nốt A".
- **Xây dựng**: "Bấm hợp âm Dm7", "Đánh scale E Dorian".
- **Luyện tai (ear training)**: nghe và đoán quãng, chất lượng hợp âm (trưởng/thứ/7…), bậc hợp âm trong tiến trình.
- **Phân tích**: cho tiến trình của một bài quen thuộc → xác định giọng và số La Mã.
- **Ứng tác có hướng dẫn**: "Solo 8 ô nhịp trên tiến trình này, chỉ dùng nốt 1-3-5 của mỗi hợp âm."
- **Đệm (guitar)**: nghe và đoán điệu/nhịp; chọn đúng nốt bass cho hợp âm; ghép pattern quạt từ các ô ↓ ↑ x cho khớp đoạn nhạc mẫu; đệm theo tiến trình ở tempo tăng dần.
- Ôn tập theo **lặp lại ngắt quãng** (spaced repetition) — câu sai sẽ xuất hiện lại sớm hơn.

---

## 4. Lộ trình nội dung (Curriculum chi tiết)

### Module 0 — Bản đồ âm thanh
- 12 nốt nhạc, cung & nửa cung, dấu thăng/giáng, nốt trùng âm (enharmonic).
- Guitar: tìm tên nốt bất kỳ trên cần đàn (dây 6 & 5 làm mốc, quãng 8 theo hình).
- Piano: nhóm 2 phím đen / 3 phím đen, các mốc C và F.

### Module 1 — Quãng (Intervals): viên gạch của mọi thứ
- Quãng 2, 3, 4, 5, 6, 7, 8; trưởng/thứ/đúng/tăng/giảm.
- Hình dạng (shape) của từng quãng trên cần đàn và trên bàn phím.
- Luyện tai: mỗi quãng gắn với một bài hát quen thuộc để nhớ.

### Module 2 — Scale trưởng & giọng (Major scale & keys)
- Công thức cung–nửa cung (W-W-H-W-W-W-H) và cách tự dựng scale từ bất kỳ nốt nào.
- Bậc của scale (scale degrees) và tên gọi: chủ âm, át âm, hạ át âm…
- Vòng quãng năm (circle of fifths) và hóa biểu (key signature).
- Guitar: các thế (pattern) scale trưởng trên cần đàn.

### Module 3 — Hợp âm ba (Triads)
- Dựng hợp âm từ quãng 3 chồng lên nhau: trưởng, thứ, giảm, tăng.
- Thế đảo (inversions) — piano: tay di chuyển ít; guitar: hợp âm trên 3 dây.
- Hệ thống **CAGED** (guitar): cùng một hợp âm ở 5 vị trí trên cần đàn.
- **Hợp âm thuận giọng (diatonic chords)**: 7 hợp âm sinh ra từ scale trưởng (I ii iii IV V vi vii°).

### Module 4 — Tiến trình hợp âm (Chord progressions)
- Ký hiệu số La Mã và hệ Nashville.
- Chức năng: Tonic – Subdominant – Dominant; cảm giác "căng" và "giải quyết".
- Các tiến trình kinh điển: I–IV–V, I–V–vi–IV, vi–IV–I–V, ii–V–I, 12-bar blues, vòng Canon…
- Phân tích tiến trình của các bài hát quen thuộc (cả nhạc Việt và nhạc quốc tế).
- Chuyển giọng (transpose) — hiểu bằng số La Mã thì chuyển giọng nào cũng được.

### Module 5 — Ngũ cung & Blues: cửa vào Improvise
- Pentatonic trưởng và thứ, quan hệ giọng song song/tương đối (relative/parallel).
- Guitar: 5 hộp (box) pentatonic và cách nối các hộp.
- Blues scale, "blue note".
- **Bài tập Jam đầu tiên**: solo bằng pentatonic thứ trên 12-bar blues và trên I–V–vi–IV.

### Module 6 — Hợp âm 7 và mở rộng
- maj7, 7, m7, m7♭5, dim7; công thức và âm sắc.
- Hợp âm thuận giọng dạng 7 (Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7).
- sus2, sus4, add9, 6, 9, 11, 13 — hiểu "tension" và cách tô màu.
- Piano: voicing hai tay, shell voicing (1-3-7). Guitar: voicing trên dây 6 và dây 5, voicing drop 2.

### Module 7 — Improvise theo hợp âm (Chord tones & melody)
- **Nhắm chord tones**: đặt nốt 1-3-5-7 của hợp âm hiện tại vào phách mạnh.
- **Guide tones** (nốt 3 và 7) và cách chúng nối mượt giữa các hợp âm.
- Nốt tiếp cận (approach notes), nốt bao vây (enclosure), nốt chromatic.
- Phát triển ý nhạc: motif, lặp lại – biến tấu, hỏi–đáp (call & response).
- Tiết tấu trong solo: khoảng nghỉ, nhịp nghịch (syncopation) — *nốt đúng nhưng nhịp nhàm cũng không hay*.

### Module 8 — Điệu thức (Modes)
- 7 điệu thức của scale trưởng: Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian.
- Hiểu mode theo **"màu sắc"** (nốt đặc trưng) thay vì chỉ "bắt đầu từ bậc khác".
- Chord–scale: hợp âm nào thì dùng mode nào (m7 → Dorian, 7 → Mixolydian…).
- Jam: các vamp một/hai hợp âm để cảm nhận từng mode.

### Module 9 — Mở rộng hòa âm
- Giọng thứ: thứ tự nhiên, thứ hòa âm (harmonic minor), thứ giai điệu (melodic minor); tại sao V trong giọng thứ thường là hợp âm trưởng.
- Át phụ (secondary dominants): V/V, V/vi…
- Hợp âm mượn (modal interchange / borrowed chords): ♭VI, ♭VII, iv trong giọng trưởng.
- Thay thế tritone (tritone substitution), hợp âm giảm chuyển tiếp.
- Chuyển giọng trong bài (modulation).

### Module 10 — Sáng tác một bài hoàn chỉnh
- Cấu trúc bài: intro, verse, pre-chorus, chorus, bridge.
- Viết tiến trình cho từng đoạn, tạo tương phản.
- Viết giai điệu trên tiến trình (dùng kiến thức chord tone ở Module 7).
- Dự án cuối: tự viết một đoạn 16 ô nhịp + solo trên đó.

> Thứ tự module có chủ ý: người dùng được **chơi improvise từ Module 5**, sớm nhất có thể, rồi mới đào sâu. Mỗi module sau đều quay lại Jam Room với kiến thức mới.

### Nhánh riêng cho guitar — Đệm theo điệu (móc dây & quạt chả)

Một nhánh học **song song** với lộ trình chính, mở khóa sau Module 3 (khi đã biết hợp âm ba và hợp âm thuận giọng). Mục tiêu: cầm một tờ hợp âm của bài bất kỳ là đệm hát được, chọn đúng điệu, chuyển hợp âm không mất nhịp.

**Đ1 — Nhịp và cách đếm**
- Phách, ô nhịp, nhịp 2/4, 3/4, 4/4, 6/8, 12/8.
- Chia phách: nốt đen, móc đơn, móc kép, chùm ba (triplet), cảm giác swing/shuffle.
- Đếm thành tiếng "1 & 2 &", "1 e & a"; phách mạnh/phách yếu, đảo phách (syncopation).

**Đ2 — Đọc ký hiệu điệu**
- Quạt: ↓ (quạt xuống), ↑ (quạt lên), **chặn/chả** (x – chặn tiếng bằng lòng bàn tay), nhấn (accent), quạt câm (ghost strum — tay vẫn đưa nhưng không chạm dây).
- Móc: **B** (nốt bass), **B'** (bass luân phiên), số dây 1-2-3 cho các nốt treble.
- **Nốt bass của từng hợp âm**: hợp âm nào bass ở dây 6, dây 5 hay dây 4; bass luân phiên giữa chủ âm và bậc 5 (alternating bass).

**Đ3 — Các điệu quạt**
| Điệu | Nhịp | Ghi chú |
|---|---|---|
| Ballad / Pop | 4/4 | Điệu cơ bản nhất, nhiều biến thể |
| Slow | 4/4 | Chậm, nhẹ |
| Slow Rock | 12/8 | Cảm giác chùm ba |
| Rock / Pop Rock | 4/4 | Quạt móc đơn đều, nhấn phách 2 & 4 |
| Disco | 4/4 | Chặn tiếng ở phách 2 & 4 |
| Fox (Fox Trot) | 4/4 | Bass + chặn luân phiên |
| Blues / Shuffle | 4/4 (swing) | Cảm giác "lắc" |
| Valse | 3/4 | Bass – chả – chả |
| Boston | 3/4 | Valse chậm, có biến thể |
| Bolero | 4/4 | Có cả kiểu quạt và kiểu móc |
| Chachacha | 4/4 | Nhịp "cha-cha-cha" đặc trưng |
| Rumba | 4/4 | Nhấn phách lệch |
| Bossa Nova | 4/4 | Đánh bằng ngón, bass và hợp âm so le |
| Tango | 2/4 hoặc 4/4 | Dứt khoát, chặn tiếng |
| Surf | 4/4 | Sôi động |
| Reggae | 4/4 | Chặn tiếng ở phách yếu |

**Đ4 — Các điệu móc (fingerpicking / arpeggio)**
- Móc Ballad cơ bản (B-3-2-3-1-3-2-3) và các biến thể.
- Móc Slow, Slow Rock (12/8), Valse/Boston (3/4), Bolero.
- **Travis picking**: ngón cái giữ bass luân phiên đều, các ngón còn lại chơi giai điệu/hợp âm.
- Rải hợp âm lên – xuống (arpeggio) cho intro/outro.

**Đ5 — Kết hợp và làm cho tiếng đệm "sống"**
- Chuyển hợp âm không mất nhịp: thay đổi ở phách nào, quạt dây buông lúc chuyển.
- Câu bass nối giữa các hợp âm (bass walk-up / walk-down), ví dụ C → Am qua nốt B.
- Thêm nốt tô màu (sus2, sus4, add9) vào trong điệu móc — áp dụng Module 6.
- Phối theo đoạn: verse móc nhẹ → chorus quạt mạnh; đoạn dạo (intro), đoạn kết (outro), break.

**Đ6 — Chọn điệu cho bài hát**
- Nghe bài và nhận diện nhịp (3/4 hay 4/4, đều hay swing) và tempo.
- Một bài có thể đệm bằng nhiều điệu — thử cùng một tiến trình với các điệu khác nhau.
- Mỗi điệu kèm vài bài hát quen thuộc làm ví dụ (chỉ ghi tên bài và tiến trình hợp âm).

**Mỗi bài điệu có cấu trúc:**
> **Nghe mẫu** (tempo thật) → **Xem pattern** trên lưới phách, có vạch chạy theo nhạc → **Tập chậm** (tempo 50–60%, metronome) trên 1 hợp âm → **Tập chuyển hợp âm** trên tiến trình 2–4 hợp âm → **Đệm cả vòng** cùng trống + bass của Jam Room, tăng tempo dần.

---

## 5. Cấu trúc thư mục dự kiến

```
music-theory-learner/
├── public/
│   └── samples/              # sample âm thanh piano, guitar, trống
├── src/
│   ├── theory/               # logic nhạc lý thuần (không phụ thuộc React)
│   │   ├── notes.ts
│   │   ├── intervals.ts
│   │   ├── scales.ts
│   │   ├── chords.ts
│   │   ├── progressions.ts
│   │   ├── fretboard.ts      # tính vị trí nốt theo tuning
│   │   ├── rhythm.ts         # nhịp, chia phách, kiểu dữ liệu cho điệu đệm
│   │   └── __tests__/
│   ├── audio/                # Tone.js: phát nốt, hợp âm, backing track
│   │   ├── instruments.ts
│   │   ├── player.ts
│   │   ├── grooves/          # các kiểu nhịp trống + bass: pop, rock, blues, bossa…
│   │   └── strum.ts          # mô phỏng tiếng quạt/móc từ thế bấm hợp âm
│   ├── components/
│   │   ├── Fretboard/
│   │   ├── Piano/
│   │   ├── ChordDiagram/
│   │   ├── CircleOfFifths/
│   │   ├── RhythmGrid/       # lưới phách hiển thị pattern quạt/móc
│   │   └── Quiz/
│   ├── features/
│   │   ├── explorer/         # Fretboard/Piano Explorer
│   │   ├── chord-builder/
│   │   ├── key-explorer/
│   │   ├── jam-room/
│   │   ├── rhythm-trainer/   # tập đệm theo điệu (guitar)
│   │   └── exercises/
│   ├── lessons/              # nội dung bài học dạng MDX
│   │   ├── 00-ban-do-am-thanh/
│   │   ├── 01-quang/
│   │   ├── ...
│   │   └── dem-guitar/       # nhánh Đệm theo điệu (Đ1–Đ6)
│   ├── data/
│   │   ├── rhythms/          # định nghĩa từng điệu (quạt & móc) dạng JSON/TS
│   │   └── chord-shapes/     # thế bấm hợp âm guitar
│   ├── store/                # tiến độ học, cài đặt (localStorage)
│   └── App.tsx
├── .github/workflows/deploy.yml
├── PLAN.md                   # file này
├── README.md
└── package.json
```

Nguyên tắc: thư mục `theory/` **không import React hay Tone.js** — chỉ là hàm thuần, dễ test. Giao diện và âm thanh chỉ gọi vào đó.

---

## 6. Các giai đoạn thực hiện

### Giai đoạn 0 — Khởi tạo (≈ 1 buổi)
- [x] Tạo project Vite + React + TypeScript + Tailwind + Vitest.
- [x] `git init`, tạo repo GitHub, viết README ngắn.
- [x] GitHub Actions deploy lên GitHub Pages (deploy ngay trang "Hello" để chắc pipeline chạy).

### Giai đoạn 1 — Nền móng nhạc lý + đàn ảo
- [x] Lớp `theory/` bọc quanh tonal: nốt, quãng, scale, chord, tính vị trí trên cần đàn. Viết test.
- [x] Component `<Fretboard />` (SVG): tuning, số phím, highlight nốt, nhãn nốt/quãng/bậc, click để nghe.
- [x] Component `<Piano />` (SVG): số quãng tám tùy chỉnh, highlight, click để nghe.
- [x] Âm thanh: phát nốt đơn và hợp âm (piano + guitar).
- [x] Trang **Explorer** (scale & chord trên cả hai nhạc cụ).

> Ghi chú: piano dùng sample Salamander nạp lúc chạy (dự phòng bằng synth khi mất mạng); guitar tạm dùng PluckSynth (tổng hợp Karplus-Strong, không cần sample). Thay bằng sample guitar thật khi làm Giai đoạn 4 (đệm theo điệu) nếu cần tiếng hay hơn.

✅ *Kết quả: đã là một công cụ tra cứu scale/hợp âm dùng được.*

### Giai đoạn 2 — Hệ thống bài học (MVP)
- [x] Cấu hình MDX, layout bài học, mục lục, nút "bài trước/bài sau".
- [x] Component `<Quiz />` và các dạng bài tập cơ bản (chọn đáp án, bấm nốt trên đàn ảo, nghe & đoán).
- [x] Lưu tiến độ trong localStorage.
- [x] Viết nội dung **Module 0 → 3**.

> Cách viết bài học: mỗi bài là một file `src/lessons/<module>/<NN-ten-bai>.mdx` có `export const meta = { title, description, minutes }`. Dùng được trực tiếp các component `<Show>`, `<Play>`, `<PlayChords>`, `<OnlyFor>`, `<Callout>`, `<CircleOfFifths>`, `<Quiz>`, `<FindNotes>`, `<EarQuiz>`, `<NoteDrill>` (xem `src/lessons/mdxComponents.ts`). Mỗi bài tập cần `id` duy nhất — test sẽ báo nếu trùng. Bản tiếng Anh là file `<NN-ten-bai>.en.mdx` cạnh bản tiếng Việt, dùng **đúng cùng các `id`** để tiến độ dùng chung (test kiểm tra). Chuỗi giao diện nằm ở `src/i18n/messages.ts`.

✅ *Kết quả: MVP — học được từ đầu đến hợp âm thuận giọng.*

### Giai đoạn 3 — Jam Room
- [x] Bộ phân tích tiến trình (nhập `ii-V-I` hoặc `Dm7 G7 Cmaj7`).
- [x] Sequencer bằng Tone.Transport: trống + bass + hợp âm, chỉnh tempo, lặp vòng.
- [x] Highlight chord tones đổi theo thời gian thực trên đàn ảo.
- [x] Gợi ý scale phù hợp cho tiến trình.
- [x] Viết nội dung **Module 4 → 5**, gắn bài tập Jam.

> Ghi chú: trang `#/jam` nhận tham số `?p=<tiến trình>&key=<giọng>&groove=<pop|ballad|rock|blues|bossa>&tempo=<bpm>`. Trong bài học dùng `<Jam progression="..." songKey="..." groove="..." scale="..." />`. Các mẫu nhịp nằm ở `src/audio/grooves.ts` — Giai đoạn 4 (đệm guitar theo điệu) có thể mở rộng từ đây. Hiện chỉ hỗ trợ nhịp 4/4; Valse/Boston (3/4) cần bổ sung khi làm Giai đoạn 4.

✅ *Kết quả: người dùng có thể bắt đầu improvise thật sự.*

### Giai đoạn 4 — Đệm guitar theo điệu
- [x] Định dạng dữ liệu cho điệu: mỗi bước trên lưới phách là quạt xuống/lên, chặn tiếng, nghỉ, hoặc danh sách dây cần móc (B, B', 1, 2, 3…).
- [x] Dữ liệu thế bấm hợp âm guitar → suy ra dây bass và bass luân phiên cho từng hợp âm.
- [x] Mô phỏng âm thanh quạt (lệch thời gian giữa các dây, lực nhấn) và móc; tiếng chặn dây.
- [x] Component `<RhythmGrid />` có playhead chạy theo Tone.Transport.
- [x] Trang **Rhythm Trainer**: chọn điệu, tiến trình, tempo, metronome, tăng tempo dần, tự tạo điệu.
- [x] Nhập khoảng 15 điệu quạt + 8 điệu móc ở mục 4.
- [x] Gắn điệu vào phần guitar đệm của Jam Room.
- [x] Viết nội dung nhánh **Đ1 → Đ6**.

> Ghi chú: điệu nằm ở `src/audio/rhythms.ts` (15 điệu quạt + 9 điệu móc, có cả nhịp 3/4 và 12/8), thế bấm ở `src/theory/guitarVoicing.ts`. Trang `#/rhythm?r=<id điệu>&p=<tiến trình>`. Trong bài học: `<RhythmPlayer rhythm="..." progression="..." />`, `<RhythmQuiz options="..." />`, `<PatternView pattern="..." />`. Nhánh guitar nằm sau Module 5 trong lộ trình. Âm thanh guitar vẫn là PluckSynth.

✅ *Kết quả: cầm tờ hợp âm là đệm hát được với nhiều điệu.*

### Giai đoạn 5 — Nội dung nâng cao
- [x] Module 6 → 10.
- [x] Luyện tai nâng cao, spaced repetition.
- [x] Key Explorer + vòng quãng năm tương tác, Chord Identifier.

> Ghi chú: trang Ôn tập (`#/review`) có 7 bộ thẻ sinh câu hỏi ngẫu nhiên (gọi tên quãng, đọc nốt hợp âm, hóa biểu, hợp âm thuận giọng, nghe quãng, nghe loại hợp âm kể cả hợp âm 7, nghe tiến trình), lịch ôn theo hộp Leitner lưu trong tiến độ. Key Explorer ở `#/keys`, nhận diện hợp âm ở `#/identify` (cả hai nằm trong menu Công cụ). Nội dung bài học được tải riêng từng bài (plugin `lesson-meta` trong `vite.config.ts`).

### Giai đoạn 6 — Tùy chọn / mở rộng
- [x] Web MIDI input (piano điện).
- [x] Nhận diện cao độ qua micro (guitar).
- [x] Nghe micro để chấm độ đều tay khi đệm (phát hiện thời điểm quạt/móc so với phách).
- [x] PWA dùng offline.
- [x] Giao diện và bài học tiếng Anh (i18n).
- [x] Thêm nhạc cụ khác (bass, ukulele — chỉ cần đổi tuning của `<Fretboard />`).

> Ghi chú: trang `#/connect` (menu Công cụ) kết nối đàn MIDI hoặc micro; nhận diện cao độ bằng phương pháp McLeod tự viết (`src/input/pitch.ts`), không gửi âm thanh đi đâu. Đàn thật dùng được trong bài luyện tên nốt, bài "bấm trên đàn", nhận diện hợp âm, Explorer và chấm nhịp ở trang Đệm guitar. PWA qua `vite-plugin-pwa`: cài được lên điện thoại, dùng offline (sample piano được lưu sau lần nghe đầu). Explorer có thêm tuning bass 4/5 dây, ukulele, ukulele baritone, mandolin.

### Giai đoạn 7 — Luyện phản xạ hợp âm (guitar)

Mục tiêu: hợp âm hiện lên **liên tục theo metronome**, người dùng phải đổi tay kịp; nhờ các hợp âm nối nhau **mượt** nên luyện lâu không thấy khó chịu, và tai tự quen cách hợp âm đi với nhau. Khác Rhythm Trainer ở chỗ tiến trình **không lặp cố định** mà luôn thay đổi, nên không học thuộc được — phải đọc và phản xạ.

Đã chốt: chỉ cho guitar; **không dùng micro, không chấm điểm** — người dùng tự tập theo metronome; màn hình **chỉ có hợp âm**, không hiện số La Mã hay lời giải thích.

**Màn hình** (trang mới `#/reflex/chords`, menu *Luyện phản xạ*):
- Một "băng chạy" ngang: hợp âm **hiện tại** to ở giữa kèm thế bấm, 1–2 hợp âm **sắp tới** mờ hơn bên phải (để chuẩn bị tay), đèn phách nháy theo metronome. Đếm ngược 1 ô nhịp trước khi bắt đầu.
- Thế bấm lấy từ `chordShapes` (`src/theory/guitarShapes.ts`), ưu tiên thế **gần thế trước** để tay ít phải nhảy.
- Âm thanh: chỉ metronome (phách 1 nhấn mạnh). Tùy chọn bật tiếng hợp âm mẫu, mặc định tắt.

**Cách đánh — 2 kiểu:**
1. **Quạt theo phách**: mỗi phách metronome quạt xuống 1 lần; mỗi hợp âm giữ N phách (4 → 2 → 1).
2. **Một lượt điệu**: mỗi hợp âm chơi đúng **1 lượt điệu** (1 ô nhịp) của điệu đã chọn trong `src/audio/rhythms.ts`, hiện pattern nhỏ dưới hợp âm bằng `<PatternView />`; số phách theo nhịp của điệu (3/4, 4/4, 12/8).

**Nguồn hợp âm — làm sao cho mượt:**
- **Nối vòng**: các tiến trình quen tai (I–V–vi–IV, vi–IV–I–V, I–vi–IV–V, ii–V–I, vòng Canon…), mỗi vòng chơi 1–2 lần rồi nối sang vòng khác **cùng giọng**, ở ranh giới ô nhịp; chỉ nối khi hợp âm cuối vòng trước đi tự nhiên sang hợp âm đầu vòng sau (ví dụ kết ở V thì vòng sau bắt đầu bằng I hoặc vi).
- **Tự sinh**: "đồ thị hòa âm" trong giọng — nút là các hợp âm thuận giọng, cạnh có trọng số theo thói quen nhạc phổ thông (I → bất kỳ; ii → V; iii → vi, IV; IV → V, I, ii; V → I, vi; vi → ii, IV). Ưu tiên bước chuyển có **nốt chung** và bước nhảy gốc quãng 4/5; câu 4 hoặc 8 ô nhịp, luôn **kết bằng cadence** (V–I, IV–I) để nghe tròn câu. Bỏ vii° ở mức dễ (khó bấm, nghe gắt).
- **Tránh khó chịu**: không đổi giọng đột ngột. Chỉ khi bật tùy chọn mới đổi giọng, và chỉ sang giọng gần (giọng tương đối, giọng cách một dấu hóa) qua **hợp âm chung** (pivot chord).
- **Tự nhập**: gõ vài tiến trình (dùng `parseProgression`), app nối chúng theo quy tắc trên.
- Bộ sinh ngẫu nhiên có seed để chia sẻ qua URL (`?seed=`).

**Mức khó** (chỉnh riêng từng cái, hoặc chọn sẵn Dễ / Vừa / Khó):
- Số phách mỗi hợp âm (kiểu quạt theo phách), tempo, tùy chọn tự tăng tempo sau mỗi câu.
- Ẩn thế bấm (chỉ còn tên hợp âm).
- Giọng: chỉ giọng dễ bấm thế mở (C, G, D, A, E, Am, Em, Dm) → mọi giọng (thêm hợp âm chặn).
- Loại hợp âm: hợp âm ba → thêm 7 (V7, ii7…) → thêm sus/add9.

**Việc cần làm:**
- [ ] `src/theory/chordFlow.ts`: đồ thị chức năng có trọng số "mượt", sinh câu có cadence, nối vòng, đổi giọng qua pivot, seed. Test kỹ (mọi bước chuyển nằm trong danh sách cho phép, câu luôn kết đúng, cùng seed ra cùng chuỗi).
- [ ] Chọn thế bấm gần nhau cho cả chuỗi hợp âm.
- [ ] Component băng chạy hợp âm + trang `#/reflex/chords`, metronome và chế độ một lượt điệu (dùng lại lịch phát của Rhythm Trainer).
- [ ] Bài học song ngữ ngắn ở nhánh guitar, nhúng `<ChordReflex />`; chuỗi giao diện trong `src/i18n/messages.ts`.

### Giai đoạn 8 — Luyện phản xạ nốt trên cần đàn guitar

Mục tiêu: thấy tên nốt là bấm được ngay, không phải đếm ngăn. Nốt hiện lên liên tục theo thời gian giới hạn (hoặc theo metronome), giống Giai đoạn 7 nhưng với từng nốt.

**Cách chỉ nốt cần tìm — theo vùng cần đàn (mặc định).** Trên một dây, nốt cùng tên lặp lại sau 12 ngăn, nên chia cần đàn thành 2 vùng: **ngăn 0–11** và **ngăn 12–22**. Trong mỗi vùng, mỗi tên nốt chỉ có **đúng một vị trí** trên một dây. Màn hình hiện tên nốt (Mi) kèm một **cần đàn thu nhỏ**, vùng cần tìm được tô sáng; không cần biết quãng tám hay ký hiệu gì thêm.

```
        Dây 6
         Mi
  ┌────────────┬──────────┐
  │░░░░░░░░░░░░│██████████│   ← vùng tô sáng = nơi cần tìm
  └────────────┴──────────┘
   0          11 12        22    (đáp án: ngăn 12)
```

**Tên có quãng tám — chế độ nâng cao** (bật trong cài đặt của trang, dành cho người đã vững nhạc lý): dùng ký hiệu cao độ khoa học theo cao độ thật — dây 6 buông là **E2**, ngăn 12 dây 6 là **E3**, dây 1 buông là **E4**; bản tiếng Việt hiện *Mi3 (E3)*. Khi bật thì ẩn cần đàn thu nhỏ. Không dùng "Mi thấp / Mi cao" vì cả cần đàn có tới 4 nốt Mi khác cao độ (E2–E5).

**Phần 1 — Trên một dây**
- Chọn một dây (hoặc để app đổi dây sau mỗi N nốt).
- **Cấp 1 — một vùng cố định**: chỉ luyện trong ngăn 0–11 (hoặc chỉ 12–22). Vùng không đổi nên chỉ cần nhớ tên nốt. Đây là cách vào dễ nhất.
- **Cấp 2 — cả dây**: mỗi lượt app chọn ngẫu nhiên vùng, cần đàn thu nhỏ cho biết vùng nào; người dùng phải bấm **đúng nốt trong vùng đó**.
- **Cấp 3 — nâng cao**: như cấp 2 nhưng chỉ hiện tên có quãng tám (E2 / E3), không có cần đàn thu nhỏ.
- Về ý "bấm tất cả nốt Mi trên dây": trên một dây hai nốt cùng tên luôn cách nhau đúng 12 ngăn, nên tìm được một nốt là suy ra nốt kia — đúng như lo ngại, người dùng sẽ "cộng 12" thay vì nhớ. Vì vậy **không dùng** chế độ "tìm tất cả" cho một dây; dùng cấp 1 + cấp 2 ở trên. Chế độ "tìm tất cả" chỉ có ý nghĩa trên nhiều dây (xem dưới).

**Phần 2 — Trên nhiều dây**
- **Tên nốt + dây**: "Fa♯ — dây 3", dây chọn ngẫu nhiên trong các dây được bật; cần đàn thu nhỏ tô sáng dây và vùng cần tìm. Có cấp 1–3 như phần 1.
- **Tìm tất cả trên cần đàn**: "Tìm mọi nốt Fa♯ từ ngăn 0 đến 12" — bấm hết các vị trí trên mọi dây. Ở đây không có mẹo "cộng 12" vì các dây lệch nhau quãng 4 (riêng dây 3–2 là quãng 3 trưởng), nên người dùng học được **hình quãng tám** giữa các dây. Có giới hạn thời gian cho cả lượt.
- **Cao độ chính xác** (chỉ có ở chế độ nâng cao, vì cần tên có quãng tám): "Tìm mọi vị trí của G3" — cùng một cao độ có ở nhiều dây (dây 6 ngăn 15, dây 5 ngăn 10, dây 4 ngăn 5, dây 3 buông). Rất có ích khi solo: biết chơi một câu ở nhiều vị trí.
- **Theo thế (position)**: giới hạn trong một khung 4–5 ngăn (ví dụ ngăn 5–8), mọi dây — đúng cách nghĩ khi improvise trong một hộp scale.

**Cơ chế phản xạ (dùng chung cho mọi chế độ):**
- Mỗi nốt có thời gian giới hạn (ví dụ 5 giây → 1,5 giây), hoặc nốt đổi theo metronome (1 nốt mỗi ô nhịp → mỗi phách).
- Sau khi bấm: phát tiếng nốt đó (gắn tai với vị trí), tô xanh/đỏ, hiện vị trí đúng nếu sai hoặc hết giờ.
- Nốt yếu (sai nhiều, phản ứng chậm) xuất hiện thường hơn; lưu theo từng **vị trí dây/ngăn** vào lịch Leitner (`note-pos:3:11`).
- **Bản đồ nhiệt** cần đàn cuối buổi: ô nào chậm/sai nhiều tô đậm — thấy ngay "vùng mù" (thường là ngăn 6–11 trên dây 3, 4).
- Kỷ lục cá nhân: số nốt đúng / phút, thời gian phản ứng trung bình.
- Chế độ ngược (đã có một phần ở `NoteDrill`): app chỉ một vị trí → người dùng gọi tên nốt.

**Cách nhận câu trả lời:**
- **Bấm trên đàn ảo** (`<Fretboard />` với `onNoteClick`) — cách mặc định: biết chính xác dây + ngăn.
- **Đàn thật qua micro** (tùy chọn): nhận cao độ đúng đến quãng tám (đủ cho cấp 2 và chế độ cao độ chính xác), nhưng **không phân biệt được dây** — E3 ở dây 6 ngăn 12 và dây 4 ngăn 2 nghe như nhau. Với chế độ "tên nốt + dây" thì chấp nhận đúng cao độ (người dùng tự giữ đúng dây). Với "tìm tất cả", người dùng đánh lần lượt từng vị trí, app đếm số cao độ khác nhau đã nghe.
- Tuning lấy theo cài đặt (Standard, Drop D…), nên dùng được cho bass/ukulele luôn.

**Việc cần làm:**
- [ ] `src/theory/fretTargets.ts`: sinh mục tiêu theo chế độ/dây/vùng/tuning (đảm bảo mỗi tên nốt chỉ có một vị trí trong vùng trên một dây), kiểm tra câu trả lời (vị trí hoặc cao độ), chọn nốt theo trọng số yếu. Dùng `fretboardPositions` / `positionForMidi` trong `src/theory/fretboard.ts`. Test kỹ.
- [ ] Component cần đàn thu nhỏ chỉ vùng/dây; trang `#/reflex/notes`: thanh chọn chế độ, công tắc chế độ nâng cao, đếm giờ/metronome, đàn ảo, phản hồi.
- [ ] Nối micro (cao độ có quãng tám) + MIDI.
- [ ] Bản đồ nhiệt, kỷ lục, lịch ôn theo vị trí.
- [ ] Bài học song ngữ ngắn ở Module 0 ("Thuộc cần đàn"), nhúng `<FretReflex mode="..." />`.

**Đã chốt với người dùng (18/10/2026):**
1. Phản xạ hợp âm chỉ cho guitar, không dùng micro, không chấm điểm.
2. Hợp âm đổi theo metronome: quạt 1 lần mỗi phách, hoặc chơi 1 lượt điệu cho mỗi hợp âm.
3. Màn hình chỉ hiện hợp âm, không giải thích; ưu tiên chuyển hợp âm mượt.
4. Luyện nốt: mặc định chỉ nốt bằng **vùng cần đàn**; tên E2/E3 là chế độ nâng cao cho người đã vững nhạc lý.

## 10. Trạng thái (17/10/2026)

Đã xong toàn bộ 6 giai đoạn: 48 bài học song ngữ (Module 0–10 và nhánh guitar), Explorer, Key Explorer, nhận diện hợp âm, Jam Room, trang tập đệm, ôn tập lặp lại ngắt quãng, kết nối đàn thật, PWA.

Bổ sung sau: trang **Thế bấm hợp âm** (`#/chords`, menu Công cụ) — bộ tìm thế bấm tự động (`src/theory/guitarShapes.ts`) cho 31 loại hợp âm (thêm m(maj7), 7♭5, 7♯5, 6/9, 9sus4, 7♭9, 7♯9, 11, m11, 13) ở nhiều vị trí, có số ngón và chặn; đổi thế bấm của từng hợp âm ngay trong trang Đệm guitar; bài Đ7 "Thế bấm hợp âm".

Ý tưởng cho sau này:
- Sample guitar thật thay cho PluckSynth (cần nguồn sample có giấy phép rõ ràng).
- Hiển thị khuông nhạc (VexFlow / abcjs) cho người học piano.
- Thêm ví dụ phân tích từ các bài hát Việt Nam (chỉ tiến trình hợp âm).
- Nhánh đệm tương tự cho piano (tay trái, comping).
- Phụ thuộc `@tailwindcss/typography` kéo theo `postcss-selector-parser` có cảnh báo bảo mật mức trung bình (chỉ dùng lúc build) — cập nhật khi có bản sửa.

---

## 7. Quy ước

- **Commit**: theo Conventional Commits (`feat:`, `fix:`, `content:`, `docs:`…) để lịch sử dễ đọc.
- **Nhánh**: làm việc trực tiếp trên `main` là được (repo cá nhân); tách nhánh khi thử nghiệm lớn.
- **Tên nốt**: mặc định hệ chữ cái (C D E F G A B) — phổ biến trong cộng đồng guitar/piano Việt Nam qua hợp âm. Có tùy chọn hiển thị Đô Rê Mi.
- **Thăng/giáng**: hiển thị đúng theo giọng (giọng F dùng B♭, không dùng A#) — tonal đã xử lý việc này.
- **Bản quyền**:
  - Mã nguồn: giấy phép **MIT**.
  - Sample âm thanh: chỉ dùng sample miễn phí có giấy phép rõ ràng (ví dụ Salamander Grand Piano – CC-BY), ghi nguồn trong README.
  - Ví dụ bài hát: chỉ dùng **tiến trình hợp âm** để phân tích (không chép lời hay bản nhạc đầy đủ).

---

## 8. Câu hỏi còn để ngỏ

Những điều có thể quyết định dần trong lúc làm:
1. Có muốn hiển thị khuông nhạc (sheet music) cho piano không? Nếu có, dùng thư viện **VexFlow** hoặc **abcjs**.
2. Giao diện có cần tối ưu cho điện thoại ngay từ đầu không, hay ưu tiên máy tính (cần đàn ảo rộng)?
3. Nhạc Việt nào sẽ được dùng làm ví dụ phân tích tiến trình trong Module 4 và làm ví dụ cho từng điệu đệm?
4. Có làm nhánh đệm tương tự cho piano (đệm tay trái, các kiểu rải hợp âm, comping) không?

---

## 9. Bước tiếp theo

Bắt đầu **Giai đoạn 0**: khởi tạo project, `git init`, tạo repo GitHub và cấu hình deploy GitHub Pages.

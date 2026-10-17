# Music Theory Learner

Ứng dụng web giúp người **đã biết chơi** guitar hoặc piano học nhạc lý một cách thực hành: quãng, scale, hợp âm, tiến trình, điệu thức — và đệm theo điệu cho guitar — để hiểu bài nhạc được tạo ra như thế nào và tự improvise.

Kế hoạch chi tiết: [PLAN.md](PLAN.md)

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
| `npm test` | Chạy test một lần |
| `npm run test:watch` | Chạy test ở chế độ theo dõi |
| `npm run lint` | Lint bằng oxlint |

## Deploy

Mỗi lần push lên `main`, GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) chạy test, build và đăng lên GitHub Pages.

Lần đầu cần bật Pages: **Settings → Pages → Source: GitHub Actions**.

## Giấy phép

Mã nguồn: [MIT](LICENSE).

Âm thanh piano: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) của Alexander Holm (CC-BY 3.0), nạp từ bản do [Tone.js](https://tonejs.github.io/) lưu trữ. Logic nhạc lý dựa trên [tonal](https://github.com/tonaljs/tonal).

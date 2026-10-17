import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Vitest không bật `globals`, nên Testing Library không tự dọn DOM sau mỗi test.
afterEach(() => cleanup())

// jsdom không có Web Audio: thay phần phát nhạc bằng hàm rỗng để test không chạm tới Tone.js.
vi.mock('../audio/player', () => ({
  playNote: vi.fn(async () => {}),
  playEvents: vi.fn(async () => {}),
  stopPlayback: vi.fn(async () => {}),
}))

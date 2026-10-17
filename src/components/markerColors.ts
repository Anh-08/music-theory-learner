import type { Highlight } from '../theory'

/** Lớp Tailwind cho màu nền của vòng đánh dấu nốt (dùng chung cho Fretboard và Piano). */
export function markerFill(h: Highlight): string {
  switch (h.color) {
    case 'correct':
      return 'fill-emerald-500'
    case 'wrong':
      return 'fill-amber-500'
    case 'question':
      return 'fill-violet-500'
    case 'neutral':
      return 'fill-stone-500'
    default:
      return h.isRoot ? 'fill-rose-500' : 'fill-sky-600 dark:fill-sky-500'
  }
}

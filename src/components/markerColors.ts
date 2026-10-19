import type { Highlight } from '../theory'

/** Tailwind classes for the note marker background (shared by Fretboard and Piano). */
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

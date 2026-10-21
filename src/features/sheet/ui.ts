import { displayNote } from '../../theory/notes'

export const card = 'rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900'
export const btn = 'rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800'
export const btnPrimary = 'rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700'

/** Key name for display: "Bbm" → "B♭m". */
export function keyName(k: string): string {
  const minor = k.endsWith('m')
  return displayNote(minor ? k.slice(0, -1) : k) + (minor ? 'm' : '')
}

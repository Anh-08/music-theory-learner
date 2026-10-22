import { displayNote } from '../../theory/notes'
import type { CheckScale, LabelMode, NoteRole } from '../../theory/scoreAnalysis'

export const card = 'rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900'
export const btn = 'rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800'
export const btnPrimary = 'rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700'

/** Key name for display: "Bbm" → "B♭m". */
export function keyName(k: string): string {
  const minor = k.endsWith('m')
  return displayNote(minor ? k.slice(0, -1) : k) + (minor ? 'm' : '')
}

export interface PlaybackSettings {
  /** Tempo factor in percent (50–150). */
  speed: number
  loop: boolean
  countIn: boolean
  metronome: boolean
}

export const DEFAULT_PLAYBACK: PlaybackSettings = { speed: 100, loop: false, countIn: true, metronome: false }

export interface AnalysisSettings {
  mode: LabelMode
  scale: CheckScale
  colors: boolean
}

export const DEFAULT_ANALYSIS: AnalysisSettings = { mode: 'off', scale: 'key', colors: false }

export const ROLE_CLASS: Record<NoteRole, string> = {
  chord: 'text-rose-600 dark:text-rose-400',
  scale: 'text-sky-700 dark:text-sky-400',
  outside: 'text-amber-600 dark:text-amber-400',
}

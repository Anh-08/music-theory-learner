import type { ReactNode } from 'react'
import { Note } from 'tonal'
import { chordEvents, sequenceEvents } from '../../audio/events'
import { usePlayer } from '../../audio/usePlayer'
import { useT } from '../../i18n/useT'
import { useSettings } from '../../store/settingsContext'
import { midi } from '../../theory'

interface PlayProps {
  /** Notes with octave numbers, space-separated: "C4 E4". */
  notes: string
  /** "sequence": one by one (default), "chord": together, "both": one by one then together. */
  as?: 'sequence' | 'chord' | 'both'
  children?: ReactNode
}

/** Small inline listen button inside a paragraph. */
export function Play({ notes, as = 'sequence', children }: PlayProps) {
  const { instrument } = useSettings()
  const { play } = usePlayer(instrument)
  const { t } = useT()
  const midis = notes.trim().split(/\s+/).map(midi)

  const onClick = () => {
    if (as === 'chord') return void play(chordEvents(midis, instrument === 'guitar' ? 0.035 : 0))
    const seq = sequenceEvents(midis, 0.5)
    if (as === 'sequence') return void play(seq)
    const start = midis.length * 0.5 + 0.1
    return void play([...seq, ...chordEvents(midis).map((e) => ({ ...e, at: e.at + start }))])
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="not-prose mx-0.5 inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 align-baseline text-sm text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
      aria-label={t('play.aria', { notes })}
    >
      ▶ {children ?? notes.split(/\s+/).map((n) => Note.pitchClass(n)).join(' ')}
    </button>
  )
}

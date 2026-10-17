import { useMemo } from 'react'
import { usePlayer } from '../../audio/usePlayer'
import { useT } from '../../i18n/useT'
import { useSettings } from '../../store/settingsContext'
import { displayNote } from '../../theory'
import { InstrumentView } from './InstrumentView'
import { buildShow, type ShowSpec } from './showModel'

interface ShowProps extends ShowSpec {
  caption?: string
  frets?: number
}

/** Hiển thị scale / hợp âm / nhóm nốt trên nhạc cụ của người học, kèm nút nghe. Dùng trong bài học MDX. */
export function Show({ caption, frets, root, scale, chord, notes, shape, positions, labels, play: playMode }: ShowProps) {
  const { instrument } = useSettings()
  const { t, locale } = useT()
  const { playing, activeMidis, play, stop, playNote } = usePlayer(instrument)
  const model = useMemo(
    () => buildShow({ root, scale, chord, notes, shape, positions, labels, play: playMode }, instrument, locale),
    [root, scale, chord, notes, shape, positions, labels, playMode, instrument, locale],
  )

  return (
    <figure className="not-prose my-6">
      <InstrumentView
        highlights={model.highlights}
        activeMidis={activeMidis}
        only={model.only}
        onlyMidis={model.onlyMidis}
        fretCount={frets}
        onPick={(m) => playNote(m)}
      />
      <figcaption className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
        {model.events.length > 0 && (
          <button
            type="button"
            onClick={() => (playing ? void stop() : void play(model.events))}
            className="rounded-md bg-rose-500 px-3 py-1 text-xs font-medium text-white hover:bg-rose-600"
          >
            {playing ? t('common.stop') : t('common.play')}
          </button>
        )}
        <span>{caption ?? model.notes.map(displayNote).join(' – ')}</span>
      </figcaption>
    </figure>
  )
}

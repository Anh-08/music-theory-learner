import { useMemo, useState } from 'react'
import { usePlayer } from '../../audio/usePlayer'
import { useT } from '../../i18n/useT'
import { useSettings } from '../../store/settingsContext'
import { displayNote } from '../../theory'
import { InstrumentView } from './InstrumentView'
import { buildShow, neckPositions, neckRun, type NeckRun, type ShowSpec } from './showModel'

interface ShowProps extends ShowSpec {
  caption?: string
  frets?: number
  /** Scale on guitar: also offer the scale positions ("thế") along the neck, one by one or all in a row. */
  neck?: boolean
}

/** Shows a scale / chord / group of notes on the learner's instrument, with a listen button. Used in MDX lessons. */
export function Show({ caption, frets = 12, neck, root, scale, chord, notes, shape, positions, labels, play: playMode }: ShowProps) {
  const { instrument } = useSettings()
  const { t, locale } = useT()
  const { playing, activeMidis, activeStep, play, stop, playNote } = usePlayer(instrument)
  const model = useMemo(
    () => buildShow({ root, scale, chord, notes, shape, positions, labels, play: playMode }, instrument, locale),
    [root, scale, chord, notes, shape, positions, labels, playMode, instrument, locale],
  )

  const boxes = useMemo(
    () => (neck && instrument === 'guitar' && root && scale && !shape && !positions ? neckPositions(root, scale, frets) : []),
    [neck, instrument, root, scale, shape, positions, frets],
  )
  /** Selected position (index in `boxes`), or null for the whole neck. */
  const [picked, setPicked] = useState<number | null>(null)
  const view = picked !== null && picked < boxes.length ? picked : null
  /** The position run being played, if any (null while playing the plain one-octave run). */
  const [run, setRun] = useState<NeckRun | null>(null)

  const runStep = playing && run && activeStep !== null ? run.steps[activeStep] : undefined
  const shown = runStep ? runStep.position : view
  const box = shown !== null ? boxes[shown] : undefined

  const start = (next: NeckRun | null) => {
    setRun(next)
    void play(next ? next.events : model.events)
  }
  const onPlay = () => start(view !== null ? neckRun(boxes, [view]) : null)
  const onPlayAll = () => start(neckRun(boxes, boxes.map((_, i) => i)))

  const boxLabel = (i: number) => t('show.position', { n: i + 1, lo: boxes[i].lo, hi: boxes[i].hi })

  return (
    <figure className="not-prose my-6">
      {boxes.length > 0 && (
        <div role="radiogroup" aria-label={t('show.positions')} className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="mr-1 font-medium text-stone-500 dark:text-stone-400">{t('show.positions')}</span>
          {[null, ...boxes.map((_, i) => i)].map((i) => (
            <button
              key={i ?? 'all'}
              type="button"
              role="radio"
              aria-checked={shown === i}
              onClick={() => {
                if (playing) void stop()
                setPicked(i)
              }}
              className={`rounded-full border px-2.5 py-1 transition-colors ${
                shown === i
                  ? 'border-rose-500 bg-rose-500 text-white'
                  : 'border-stone-300 text-stone-600 hover:border-rose-400 hover:text-rose-600 dark:border-stone-700 dark:text-stone-300'
              }`}
            >
              {i === null ? t('show.wholeNeck') : boxLabel(i)}
            </button>
          ))}
        </div>
      )}
      <InstrumentView
        highlights={model.highlights}
        activeMidis={activeMidis}
        activePositions={run && playing ? (runStep ? [runStep.spot] : []) : undefined}
        only={box ? box.notes : model.only}
        onlyMidis={model.onlyMidis}
        fretCount={frets}
        onPick={(m) => playNote(m)}
      />
      <figcaption className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
        {model.events.length > 0 && (
          <button
            type="button"
            onClick={() => (playing ? void stop() : onPlay())}
            className="rounded-md bg-rose-500 px-3 py-1 text-xs font-medium text-white hover:bg-rose-600"
          >
            {playing ? t('common.stop') : t('common.play')}
          </button>
        )}
        {boxes.length > 1 && !playing && (
          <button
            type="button"
            onClick={onPlayAll}
            className="rounded-md border border-rose-500 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
          >
            {t('show.playAll')}
          </button>
        )}
        <span>{caption ?? model.notes.map(displayNote).join(' – ')}</span>
        {runStep && <span className="font-medium text-rose-600 dark:text-rose-400">{boxLabel(runStep.position)}</span>}
      </figcaption>
    </figure>
  )
}

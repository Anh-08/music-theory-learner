import { useId, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { playScore, stopScore, useScorePlayer } from '../../audio/scorePlayer'
import { newSheetId, saveSheet } from '../../features/sheet/sheetStore'
import { ROLE_CLASS } from '../../features/sheet/ui'
import { useT } from '../../i18n/useT'
import { useSettings } from '../../store/settingsContext'
import { LickSyntaxError, parseLick } from '../../theory/lickText'
import { analyzeScore, type LabelMode } from '../../theory/scoreAnalysis'
import type { ScoreViewMode } from '../../theory/scoreLayout'
import { ScoreView } from '../Score/ScoreView'

export interface TabViewProps {
  /** The lick in the short text notation of `parseLick` (see src/theory/lickText.ts). */
  notes: string
  songKey?: string
  tempo?: number
  /** Time signature, "4/4" by default. */
  time?: string
  view?: ScoreViewMode
  /** Show each note's interval to the chord ("chord") or degree in the key ("key"), coloured by role. */
  labels?: LabelMode
  title?: string
  caption?: string
}

/** A short read-only score inside a lesson, with play and "open in the editor". */
export function TabView({ notes, songKey = 'C', tempo = 90, time = '4/4', view, labels, title, caption }: TabViewProps) {
  const { t } = useT()
  const { instrument } = useSettings()
  const navigate = useNavigate()
  const owner = useId()
  const player = useScorePlayer()
  const playing = player.playing && player.owner === owner

  const parsed = useMemo(() => {
    const [a, b] = time.split('/').map(Number)
    try {
      return { score: parseLick(notes, { keySig: songKey, tempo, timeSig: [a || 4, b || 4], title: title ?? '' }), error: null }
    } catch (err) {
      if (err instanceof LickSyntaxError) return { score: null, error: err.token }
      throw err
    }
  }, [notes, songKey, tempo, time, title])

  const score = parsed.score
  const scoreLabels = useMemo(
    () => (score && labels && labels !== 'off' ? analyzeScore(score, labels).map((x) => ({ measure: x.ref.measure, event: x.ref.event, text: x.label, className: ROLE_CLASS[x.role] })) : undefined),
    [score, labels],
  )

  if (!score) return <p className="not-prose rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">Lick syntax error: “{parsed.error}”</p>

  const open = () => {
    const id = newSheetId()
    saveSheet({ ...score, id, title: title ?? caption ?? '' })
    navigate(`/sheet/${id}`)
  }

  return (
    <figure className="not-prose my-6 space-y-2 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-wrap items-center gap-2">
        {playing ? (
          <button type="button" className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-medium text-white dark:bg-stone-200 dark:text-stone-900" onClick={() => void stopScore()}>
            {t('sheet.stop')}
          </button>
        ) : (
          <button type="button" className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700" onClick={() => void playScore(score, { instrument, countIn: true, owner })}>
            {t('common.play')}
          </button>
        )}
        <button type="button" className="ml-auto text-sm text-rose-600 hover:underline" onClick={open}>
          {t('tabView.open')}
        </button>
      </div>
      <ScoreView score={score} view={view ?? (instrument === 'piano' ? 'staff' : 'both')} playing={playing ? player.current : null} labels={scoreLabels} />
      {labels && labels !== 'off' && (
        <p className="text-xs">
          {(['chord', 'scale', 'outside'] as const).map((r) => (
            <span key={r} className={`mr-3 ${ROLE_CLASS[r]}`}>
              ● {t(`sheet.role.${r}`)}
            </span>
          ))}
        </p>
      )}
      {caption && <figcaption className="text-sm text-stone-500">{caption}</figcaption>}
    </figure>
  )
}

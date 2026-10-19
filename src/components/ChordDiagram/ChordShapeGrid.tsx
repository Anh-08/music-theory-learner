import { useMemo } from 'react'
import { chordEvents } from '../../audio/events'
import { usePlayer } from '../../audio/usePlayer'
import { useT } from '../../i18n/useT'
import { chordShapes, shapeMidis } from '../../theory'
import { ChordDiagram } from './ChordDiagram'
import { shapeCaption, shapeIntervalLabels } from './shapeLabels'

interface ChordShapeGridProps {
  root: string
  intervals: string[]
  /** Display name, e.g. "Cmaj7". */
  name: string
  /** Unique chord key (used as the cache key), e.g. "Cmaj7". */
  symbol: string
  labels?: 'fingers' | 'intervals'
  max?: number
}

/** Grid of diagrams for every shape of a chord, each with a listen button. */
export function ChordShapeGrid({ root, intervals, name, symbol, labels = 'fingers', max = 8 }: ChordShapeGridProps) {
  const { t } = useT()
  const { play } = usePlayer('guitar')
  const shapes = useMemo(() => chordShapes({ root, intervals, symbol }, max), [root, intervals, symbol, max])

  if (!shapes.length) return <p className="text-sm text-stone-500">{t('shapes.none')}</p>

  return (
    <ul aria-label={t('shapes.count', { n: shapes.length })} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {shapes.map((sh, i) => {
        const { labels: intervalLabels, roots } = shapeIntervalLabels(sh, root, intervals)
        const strum = () => {
          const midis = shapeMidis(sh).filter((m): m is number => m !== null)
          void play(chordEvents(midis, 0.035, 2.2))
        }
        return (
          <li key={i} className="flex flex-col items-center gap-1 rounded-xl border border-stone-200 bg-white p-2 dark:border-stone-800 dark:bg-stone-900">
            <ChordDiagram shape={sh} name={name} labels={labels === 'intervals' ? intervalLabels : undefined} rootStrings={roots} />
            <p className="text-center text-xs text-stone-500">{shapeCaption(sh, t)}</p>
            <button type="button" onClick={strum} className="rounded-md bg-rose-500 px-2.5 py-0.5 text-xs font-medium text-white hover:bg-rose-600">
              {t('common.play')}
            </button>
          </li>
        )
      })}
    </ul>
  )
}


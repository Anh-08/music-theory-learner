import type { Step } from '../../audio/rhythms'
import { useT } from '../../i18n/useT'
import type { MessageKey } from '../../i18n/messages'
import { countLabels, toggleCell, visibleRows, type GridRow } from './gridModel'

interface RhythmGridProps {
  steps: Step[]
  beatsPerBar: number
  stepsPerBeat: number
  /** Step currently sounding (playhead), -1 when not playing. */
  current?: number
  /** If given, clicking a cell edits the rhythm. */
  onChange?: (steps: Step[]) => void
}

function strumSymbol(step: Step): { text: string; value: MessageKey; light?: boolean } | null {
  if (step.kind === 'mute') return { text: '✕', value: 'grid.mute' }
  if (step.kind !== 'strum') return null
  if (step.dir === 'down') return { text: '↓', value: step.light ? 'grid.lightDown' : 'grid.down', light: step.light }
  return { text: '↑', value: step.light ? 'grid.lightUp' : 'grid.up', light: step.light }
}

/** Rhythm grid: each column is a step of the bar, rows are strum / bass / each string. */
export function RhythmGrid({ steps, beatsPerBar, stepsPerBeat, current = -1, onChange }: RhythmGridProps) {
  const { t } = useT()
  const editing = Boolean(onChange)
  const rows = visibleRows(steps, editing)
  const counts = countLabels(beatsPerBar, stepsPerBeat)

  const rowLabel = (row: GridRow) => (row === 'strum' ? t('grid.strum') : row === 'bass' ? t('grid.bass') : t('grid.string', { n: row }))

  const cell = (row: GridRow, step: Step): { text: string; value: string; light?: boolean } => {
    if (row === 'strum') {
      const s = strumSymbol(step)
      return s ? { text: s.text, value: t(s.value), light: s.light } : { text: '', value: t('grid.rest') }
    }
    const notes = step.kind === 'pick' ? step.notes : []
    if (row === 'bass') {
      const b = notes.includes('B') ? 'B' : notes.includes("B'") ? 'B′' : ''
      return { text: b, value: b || t('grid.off') }
    }
    return notes.includes(row) ? { text: '●', value: t('grid.on') } : { text: '', value: t('grid.off') }
  }

  return (
    <div className="overflow-x-auto">
      <table aria-label={t('grid.aria')} className="border-separate border-spacing-0.5 text-center text-sm select-none">
        <thead>
          <tr>
            <th />
            {counts.map((c, i) => (
              <th
                key={i}
                scope="col"
                className={`w-9 pb-1 text-xs font-medium ${i % stepsPerBeat === 0 ? 'text-stone-700 dark:text-stone-200' : 'text-stone-400'} ${i === current ? 'text-rose-600 dark:text-rose-400' : ''}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row)}>
              <th scope="row" className="pr-2 text-left text-xs font-medium whitespace-nowrap text-stone-500">
                {rowLabel(row)}
              </th>
              {steps.map((step, i) => {
                const c = cell(row, step)
                const cls = `h-9 w-9 rounded-md border text-base leading-none transition-colors ${
                  i === current ? 'border-rose-400 bg-rose-100 dark:bg-rose-950' : i % stepsPerBeat === 0 ? 'border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800' : 'border-stone-200 dark:border-stone-700'
                } ${c.light ? 'text-xs text-stone-500' : 'font-bold'}`
                const label = t('grid.cell', { row: rowLabel(row), n: i + 1, value: c.value })
                return (
                  <td key={i}>
                    {editing ? (
                      <button type="button" aria-label={label} className={`${cls} hover:border-violet-400`} onClick={() => onChange!(steps.map((s, j) => (j === i ? toggleCell(s, row) : s)))}>
                        {c.text}
                      </button>
                    ) : (
                      <div aria-label={label} role="img" className={`${cls} flex items-center justify-center`}>
                        {c.text}
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

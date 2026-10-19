import { useT } from '../../i18n/useT'

export interface HeatCell {
  string: number
  fret: number
  /** 0 (fine) – 1 (blind spot). */
  value: number
}

export interface FretHeatMapProps {
  stringCount: number
  fretCount: number
  cells: HeatCell[]
}

const CELL = 22
const LEFT = 24
const TOP = 6

/** The neck as a grid: darker cells were missed or slow. Cells never asked stay blank. */
export function FretHeatMap({ stringCount, fretCount, cells }: FretHeatMapProps) {
  const { t } = useT()
  const width = LEFT + (fretCount + 1) * CELL + 4
  const height = TOP + stringCount * CELL + 18
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('noteReflex.heatAria')} className="h-auto w-full min-w-[520px]">
      {Array.from({ length: stringCount }, (_, i) => i + 1).map((s) => (
        <g key={s}>
          <text x={LEFT - 8} y={TOP + (s - 1) * CELL + CELL / 2 + 4} textAnchor="end" className="fill-stone-500 text-[10px]">
            {s}
          </text>
          {Array.from({ length: fretCount + 1 }, (_, f) => {
            const c = cells.find((x) => x.string === s && x.fret === f)
            return (
              <rect
                key={f}
                x={LEFT + f * CELL + 1}
                y={TOP + (s - 1) * CELL + 1}
                width={CELL - 2}
                height={CELL - 2}
                rx={3}
                className={c ? 'fill-rose-600 stroke-rose-300 dark:stroke-rose-900' : 'fill-stone-100 dark:fill-stone-800'}
                fillOpacity={c ? 0.12 + c.value * 0.88 : 1}
                strokeWidth={c ? 1 : 0}
              >
                {c && <title>{t('noteReflex.heatCell', { string: s, fret: f, pct: Math.round(c.value * 100) })}</title>}
              </rect>
            )
          })}
        </g>
      ))}
      {Array.from({ length: fretCount + 1 }, (_, f) => f)
        .filter((f) => f % 3 === 0 || f === 12)
        .map((f) => (
          <text key={f} x={LEFT + f * CELL + CELL / 2} y={height - 4} textAnchor="middle" className="fill-stone-400 text-[10px]">
            {f}
          </text>
        ))}
    </svg>
  )
}

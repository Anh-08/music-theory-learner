import { useT } from '../../i18n/useT'

export interface MiniFretboardProps {
  stringCount: number
  /** Strings to search (1 = highest, drawn on top). */
  strings: number[]
  /** Fret range to search (the highlighted zone). */
  frets: [number, number]
  fretCount: number
}

const W = 260
const LEFT = 14
const RIGHT = 250
const TOP = 8
const GAP = 9

/** A small neck showing where to look: the highlighted zone and string(s), without any note. */
export function MiniFretboard({ stringCount, strings, frets, fretCount }: MiniFretboardProps) {
  const { t } = useT()
  const [from, to] = frets
  const col = (W - LEFT - (W - RIGHT)) / (fretCount + 1)
  // Column 0 is the open string, column f the space of fret f.
  const x = (f: number) => LEFT + f * col
  const y = (s: number) => TOP + (s - 1) * GAP
  const height = TOP + (stringCount - 1) * GAP + 22
  const sorted = [...strings].sort((a, b) => a - b)
  const label = t('noteReflex.miniAria', {
    strings: sorted.join(', '),
    from,
    to,
  })
  return (
    <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className="h-auto w-full max-w-xs">
      <rect x={x(1)} y={TOP - 4} width={x(fretCount + 1) - x(1)} height={(stringCount - 1) * GAP + 8} rx={2} className="fill-amber-100 dark:fill-stone-800" />
      <rect x={x(from)} y={TOP - 5} width={x(to + 1) - x(from)} height={(stringCount - 1) * GAP + 10} rx={3} className="fill-rose-200 dark:fill-rose-900/70" />
      <line x1={x(1)} x2={x(1)} y1={TOP - 4} y2={y(stringCount) + 4} strokeWidth={3} className="stroke-stone-600 dark:stroke-stone-300" />
      {[12].filter((f) => f < fretCount).map((f) => (
        <line key={f} x1={x(f)} x2={x(f)} y1={TOP - 4} y2={y(stringCount) + 4} strokeWidth={1} strokeDasharray="2 2" className="stroke-stone-400" />
      ))}
      {Array.from({ length: stringCount }, (_, i) => i + 1).map((s) => {
        const on = sorted.includes(s)
        return (
          <g key={s}>
            <line x1={LEFT - 6} x2={x(fretCount + 1)} y1={y(s)} y2={y(s)} strokeWidth={1} className="stroke-stone-400 dark:stroke-stone-500" />
            {on && <line x1={x(from)} x2={x(to + 1)} y1={y(s)} y2={y(s)} strokeWidth={3.5} strokeLinecap="round" className="stroke-rose-500" />}
          </g>
        )
      })}
      {[...new Set([from, to])].map((f) => (
        <text key={f} x={x(f) + col / 2} y={height - 4} textAnchor="middle" className="fill-stone-500 text-[10px] font-medium">
          {f}
        </text>
      ))}
    </svg>
  )
}

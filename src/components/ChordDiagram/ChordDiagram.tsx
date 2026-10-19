import { useT } from '../../i18n/useT'
import type { ChordShape } from '../../theory'

interface ChordDiagramProps {
  shape: ChordShape
  /** Chord name shown on the diagram. */
  name?: string
  /** Label per string (string 6 → 1), e.g. intervals "1 3 5"; empty shows finger numbers. */
  labels?: (string | null)[]
  /** Strings holding the root (string 6 → 1), drawn in red. */
  rootStrings?: boolean[]
  size?: number
  /** Do not draw the name on the diagram (it is shown outside) — the name is still used for screen readers. */
  hideName?: boolean
}

const STRINGS = 6
const FRETS = 5

/** Vertical chord-book style diagram: strings vertical, frets horizontal, dots with finger numbers; x / o on top. */
export function ChordDiagram({ shape, name, labels, rootStrings, size = 150, hideName = false }: ChordDiagramProps) {
  const { t } = useT()
  const fretted = shape.frets.filter((f): f is number => f !== null && f > 0)
  const maxF = fretted.length ? Math.max(...fretted) : 0
  // Low shapes (within the first 5 frets) are drawn from the nut; higher shapes from their lowest fret, marked "Nfr".
  const base = maxF <= FRETS ? 1 : Math.min(...fretted)
  const W = 100
  const H = 120
  const left = 18
  const top = 28
  const gapX = (W - left - 10) / (STRINGS - 1)
  const gapY = (H - top - 8) / FRETS
  const x = (i: number) => left + i * gapX
  const yMid = (f: number) => top + (f - base + 0.5) * gapY
  const frets = shape.frets.map((f) => (f === null ? 'x' : f)).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W} role="img" aria-label={t('shapes.diagramAria', { name: name ?? '', frets })} className="select-none">
      {name && !hideName && (
        <text x={W / 2} y={10} textAnchor="middle" className="fill-stone-800 text-[11px] font-bold dark:fill-stone-100">
          {name}
        </text>
      )}
      {base === 1 ? (
        <rect x={left - 1} y={top - 3} width={W - left - 10 + 2} height={3} className="fill-stone-700 dark:fill-stone-300" />
      ) : (
        <text x={left - 5} y={yMid(base) + 3} textAnchor="end" className="fill-stone-500 text-[8px]">
          {base}fr
        </text>
      )}
      {Array.from({ length: FRETS + 1 }, (_, i) => (
        <line key={`f${i}`} x1={left} x2={W - 10} y1={top + i * gapY} y2={top + i * gapY} strokeWidth={0.8} className="stroke-stone-400 dark:stroke-stone-500" />
      ))}
      {Array.from({ length: STRINGS }, (_, i) => (
        <line key={`s${i}`} x1={x(i)} x2={x(i)} y1={top} y2={top + FRETS * gapY} strokeWidth={0.8} className="stroke-stone-400 dark:stroke-stone-500" />
      ))}
      {shape.barre && shape.barre.fret - base < FRETS && (
        <rect
          x={x(6 - shape.barre.from) - 4}
          y={yMid(shape.barre.fret) - 4}
          width={x(6 - shape.barre.to) - x(6 - shape.barre.from) + 8}
          height={8}
          rx={4}
          className="fill-stone-700 dark:fill-stone-200"
        />
      )}
      {shape.frets.map((f, i) => {
        const cx = x(i)
        if (f === null)
          return (
            <text key={i} x={cx} y={top - 7} textAnchor="middle" className="fill-stone-500 text-[9px]">
              ×
            </text>
          )
        if (f === 0)
          return (
            <circle key={i} cx={cx} cy={top - 10} r={3} fill="none" strokeWidth={1} className={rootStrings?.[i] ? 'stroke-rose-500' : 'stroke-stone-500'} />
          )
        const label = labels?.[i] ?? (shape.fingers[i] ? String(shape.fingers[i]) : '')
        return (
          <g key={i}>
            <circle cx={cx} cy={yMid(f)} r={5.5} className={rootStrings?.[i] ? 'fill-rose-500' : 'fill-stone-800 dark:fill-stone-100'} />
            <text x={cx} y={yMid(f) + 2.6} textAnchor="middle" className={`text-[7px] font-semibold ${rootStrings?.[i] ? 'fill-white' : 'fill-white dark:fill-stone-900'}`}>
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

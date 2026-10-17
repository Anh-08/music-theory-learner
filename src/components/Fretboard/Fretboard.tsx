import type { KeyboardEvent } from 'react'
import {
  DOUBLE_INLAY_FRETS,
  INLAY_FRETS,
  displayNote,
  fretX,
  fretboardPositions,
  rootLabel,
  type FretPosition,
  type HighlightMap,
  type Tuning,
} from '../../theory'
import { useT } from '../../i18n/useT'
import { markerFill } from '../markerColors'

export interface FretboardProps {
  tuning: Tuning
  fretCount: number
  highlights: HighlightMap
  /** Các nốt đang vang (midi) — được nhấn mạnh thêm. */
  activeMidis?: ReadonlySet<number>
  onNoteClick?: (position: FretPosition) => void
  /** Nếu có: chỉ tô sáng đúng các vị trí này (ví dụ một thế bấm), thay vì mọi vị trí cùng tên nốt. */
  only?: ReadonlyArray<{ string: number; fret: number }>
}

const WIDTH = 1000
const NUT_X = 70
const BOARD_RIGHT = 985
const TOP = 22
const STRING_GAP = 30
const MARKER_R = 12

export function Fretboard({ tuning, fretCount, highlights, activeMidis, onNoteClick, only }: FretboardProps) {
  const { t, locale } = useT()
  const stringCount = tuning.strings.length
  const boardHeight = (stringCount - 1) * STRING_GAP
  const height = TOP + boardHeight + 44
  const boardWidth = BOARD_RIGHT - NUT_X

  const lineX = (fret: number) => NUT_X + fretX(fret, fretCount) * boardWidth
  const noteX = (fret: number) => (fret === 0 ? NUT_X - 22 : (lineX(fret - 1) + lineX(fret)) / 2)
  // Dây 1 (cao nhất) nằm trên cùng, như khi nhìn xuống cần đàn hoặc đọc tab.
  const stringY = (string: number) => TOP + (string - 1) * STRING_GAP
  const midY = TOP + boardHeight / 2

  const positions = fretboardPositions(tuning, fretCount)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="w-full min-w-[720px] select-none"
      role="group"
      aria-label={t('fretboard.aria', { frets: fretCount, tuning: tuning.name[locale] })}
    >
      <rect x={NUT_X} y={TOP - 8} width={boardWidth} height={boardHeight + 16} rx={3} className="fill-amber-100 dark:fill-stone-800" />

      {INLAY_FRETS.filter((f) => f <= fretCount).map((f) =>
        DOUBLE_INLAY_FRETS.includes(f) ? (
          <g key={f}>
            <circle cx={noteX(f)} cy={midY - STRING_GAP} r={5} className="fill-amber-300 dark:fill-stone-600" />
            <circle cx={noteX(f)} cy={midY + STRING_GAP} r={5} className="fill-amber-300 dark:fill-stone-600" />
          </g>
        ) : (
          <circle key={f} cx={noteX(f)} cy={midY} r={5} className="fill-amber-300 dark:fill-stone-600" />
        ),
      )}

      {Array.from({ length: fretCount }, (_, i) => i + 1).map((f) => (
        <line key={f} x1={lineX(f)} x2={lineX(f)} y1={TOP - 8} y2={TOP + boardHeight + 8} strokeWidth={2} className="stroke-stone-400 dark:stroke-stone-500" />
      ))}
      <line x1={NUT_X} x2={NUT_X} y1={TOP - 8} y2={TOP + boardHeight + 8} strokeWidth={6} className="stroke-stone-700 dark:stroke-stone-300" />

      {tuning.strings.map((open, idx) => {
        const string = stringCount - idx
        return (
          <g key={string}>
            <line
              x1={NUT_X - 40}
              x2={BOARD_RIGHT}
              y1={stringY(string)}
              y2={stringY(string)}
              strokeWidth={0.8 + idx * 0.35}
              className="stroke-stone-500 dark:stroke-stone-400"
            />
            <text x={10} y={stringY(string) + 4} className="fill-stone-500 text-[12px] dark:fill-stone-400">
              {displayNote(open.replace(/\d+$/, ''))}
            </text>
          </g>
        )
      })}

      {Array.from({ length: fretCount }, (_, i) => i + 1).map((f) => (
        <text key={f} x={noteX(f)} y={TOP + boardHeight + 32} textAnchor="middle" className="fill-stone-400 text-[11px]">
          {f}
        </text>
      ))}

      {positions.map((p) => {
        const h = !only || only.some((o) => o.string === p.string && o.fret === p.fret) ? highlights.get(p.chroma) : undefined
        const active = activeMidis?.has(p.midi) ?? false
        const x = noteX(p.fret)
        const y = stringY(p.string)
        const name = rootLabel(p.chroma)
        const activate = () => onNoteClick?.(p)
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            activate()
          }
        }
        return (
          <g
            key={`${p.string}-${p.fret}`}
            role="button"
            tabIndex={h ? 0 : -1}
            aria-label={t('fretboard.position', { string: p.string, where: p.fret === 0 ? t('fretboard.open') : t('fretboard.fret', { n: p.fret }), note: name })}
            data-highlighted={h ? (h.isRoot ? 'root' : 'tone') : undefined}
            onClick={activate}
            onKeyDown={onKeyDown}
            className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-amber-500"
          >
            <rect x={x - 18} y={y - STRING_GAP / 2} width={36} height={STRING_GAP} fill="transparent" />
            {h && (
              <>
                <circle
                  cx={x}
                  cy={y}
                  r={active ? MARKER_R + 3 : MARKER_R}
                  strokeWidth={active ? 3 : 2}
                  className={`transition-all duration-100 ${markerFill(h)} ${active ? 'stroke-amber-400' : 'stroke-white dark:stroke-stone-900'}`}
                />
                <text x={x} y={y + 4} textAnchor="middle" className={`pointer-events-none fill-white font-semibold ${h.label.length > 3 ? 'text-[8px]' : h.label.length > 2 ? 'text-[9px]' : 'text-[11px]'}`}>
                  {h.label}
                </text>
              </>
            )}
            {!h && active && <circle cx={x} cy={y} r={MARKER_R - 2} className="fill-amber-400/70" />}
          </g>
        )
      })}
    </svg>
  )
}

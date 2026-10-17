import type { KeyboardEvent } from 'react'
import { noteFromMidi, pianoKeys, rootLabel, type HighlightMap, type PianoKey } from '../../theory'
import { useT } from '../../i18n/useT'
import { markerFill } from '../markerColors'

export interface PianoProps {
  /** Phím đầu và phím cuối (midi), nên là phím trắng. */
  startMidi: number
  endMidi: number
  highlights: HighlightMap
  activeMidis?: ReadonlySet<number>
  onKeyClick?: (midi: number) => void
  /** Nếu có: chỉ tô sáng đúng các phím này thay vì mọi quãng tám. */
  onlyMidis?: ReadonlySet<number>
}

const WHITE_W = 40
const WHITE_H = 150
const BLACK_W = 24
const BLACK_H = 95
const PAD = 2

export function Piano({ startMidi, endMidi, highlights, activeMidis, onKeyClick, onlyMidis }: PianoProps) {
  const { t } = useT()
  const keys = pianoKeys(startMidi, endMidi)
  const whiteCount = keys.filter((k) => !k.black).length
  const width = whiteCount * WHITE_W + PAD * 2
  const height = WHITE_H + PAD * 2

  const renderKey = (k: PianoKey) => {
    const h = !onlyMidis || onlyMidis.has(k.midi) ? highlights.get(k.chroma) : undefined
    const active = activeMidis?.has(k.midi) ?? false
    const x = PAD + (k.black ? (k.whiteIndex + 1) * WHITE_W - BLACK_W / 2 : k.whiteIndex * WHITE_W)
    const w = k.black ? BLACK_W : WHITE_W
    const keyH = k.black ? BLACK_H : WHITE_H
    const cx = x + w / 2
    const cy = PAD + keyH - (k.black ? 16 : 22)
    const r = k.black ? 10 : 13
    const activate = () => onKeyClick?.(k.midi)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        activate()
      }
    }

    const keyClass = k.black
      ? active
        ? 'fill-amber-500'
        : 'fill-stone-900 dark:fill-stone-950 hover:fill-stone-700'
      : active
        ? 'fill-amber-200'
        : 'fill-white hover:fill-stone-100 dark:fill-stone-200 dark:hover:fill-stone-300'

    return (
      <g
        key={k.midi}
        role="button"
        tabIndex={h ? 0 : -1}
        aria-label={t('piano.key', { note: rootLabel(k.chroma), octave: Math.floor(k.midi / 12) - 1 })}
        data-highlighted={h ? (h.isRoot ? 'root' : 'tone') : undefined}
        onClick={activate}
        onKeyDown={onKeyDown}
        className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-amber-500"
      >
        <rect x={x} y={PAD} width={w} height={keyH} rx={k.black ? 3 : 4} strokeWidth={1.5} className={`stroke-stone-400 transition-colors duration-100 dark:stroke-stone-600 ${keyClass}`} />
        {h && (
          <>
            <circle cx={cx} cy={cy} r={r} className={markerFill(h)} />
            <text x={cx} y={cy + 4} textAnchor="middle" className={`pointer-events-none fill-white font-semibold ${h.label.length > 2 ? 'text-[8px]' : 'text-[11px]'}`}>
              {h.label}
            </text>
          </>
        )}
      </g>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full select-none"
      style={{ minWidth: whiteCount * 26 }}
      role="group"
      aria-label={t('piano.aria', { from: noteFromMidi(startMidi), to: noteFromMidi(endMidi) })}
    >
      {keys.filter((k) => !k.black).map(renderKey)}
      {keys.filter((k) => k.black).map(renderKey)}
    </svg>
  )
}

import { chordEvents } from '../../audio/events'
import { PLAY_RANGE } from '../../audio/instruments'
import { usePlayer } from '../../audio/usePlayer'
import { useT } from '../../i18n/useT'
import { useSettings } from '../../store/settingsContext'
import { chordFromRoot, chroma, displayNote, rootMidiAtOrAbove, stackIntervals, type KeyRef } from '../../theory'

/** Các giọng theo chiều kim đồng hồ: mỗi bước lên một quãng 5 đúng. */
const KEYS = [
  { major: 'C', minor: 'A', sig: '' },
  { major: 'G', minor: 'E', sig: '1♯' },
  { major: 'D', minor: 'B', sig: '2♯' },
  { major: 'A', minor: 'F#', sig: '3♯' },
  { major: 'E', minor: 'C#', sig: '4♯' },
  { major: 'B', minor: 'G#', sig: '5♯' },
  { major: 'F#', minor: 'D#', sig: '6♯ / 6♭' },
  { major: 'Db', minor: 'Bb', sig: '5♭' },
  { major: 'Ab', minor: 'F', sig: '4♭' },
  { major: 'Eb', minor: 'C', sig: '3♭' },
  { major: 'Bb', minor: 'G', sig: '2♭' },
  { major: 'F', minor: 'D', sig: '1♭' },
]

const SIZE = 340
const C = SIZE / 2

interface CircleOfFifthsProps {
  /** Giọng trưởng cần tô (dùng trong bài học). */
  highlight?: string
  /** Giọng đang chọn (Key Explorer) — tô cả giọng trưởng lẫn giọng thứ. */
  selected?: KeyRef
  /** Có thì bấm vào giọng để chọn (vẫn nghe hợp âm chủ). */
  onSelect?: (key: KeyRef) => void
}

/** Vòng quãng năm: vòng ngoài là giọng trưởng, vòng trong là giọng thứ tương ứng. Bấm để nghe hợp âm chủ. */
export function CircleOfFifths({ highlight, selected, onSelect }: CircleOfFifthsProps) {
  const { instrument } = useSettings()
  const { play } = usePlayer(instrument)
  const { t } = useT()

  const isSelected = (tonic: string, mode: KeyRef['mode']) => selected?.mode === mode && chroma(selected.tonic) === chroma(tonic)

  const playChord = (root: string, type: 'M' | 'm') => {
    onSelect?.({ tonic: root, mode: type === 'M' ? 'major' : 'minor' })
    const info = chordFromRoot(root, type)
    const midis = stackIntervals(rootMidiAtOrAbove(chroma(root), PLAY_RANGE[instrument].chord), info.intervals)
    void play(chordEvents(midis, instrument === 'guitar' ? 0.035 : 0))
  }

  const at = (i: number, r: number) => {
    const a = (i / 12) * 2 * Math.PI - Math.PI / 2
    return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) }
  }

  return (
    <figure className="not-prose my-6 flex flex-col items-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-sm select-none" role="group" aria-label={t('circle.aria')}>
        <circle cx={C} cy={C} r={160} className="fill-stone-100 dark:fill-stone-800" />
        <circle cx={C} cy={C} r={100} className="fill-stone-200 dark:fill-stone-700" />
        <circle cx={C} cy={C} r={58} className="fill-stone-50 dark:fill-stone-900" />
        {KEYS.map((k, i) => {
          const outer = at(i, 135)
          const sig = at(i, 113)
          const inner = at(i, 80)
          const isHi = highlight === k.major || isSelected(k.major, 'major')
          const isMinorHi = isSelected(k.minor, 'minor')
          return (
            <g key={k.major}>
              <g role="button" aria-label={t('circle.majorChord', { name: displayNote(k.major) })} className="cursor-pointer" onClick={() => playChord(k.major, 'M')}>
                <circle cx={outer.x} cy={outer.y} r={19} className={isHi ? 'fill-rose-500' : 'fill-white hover:fill-rose-100 dark:fill-stone-950 dark:hover:fill-rose-950'} />
                <text x={outer.x} y={outer.y + 5} textAnchor="middle" className={`pointer-events-none text-[14px] font-bold ${isHi ? 'fill-white' : 'fill-stone-800 dark:fill-stone-100'}`}>
                  {displayNote(k.major)}
                </text>
              </g>
              <text x={sig.x} y={sig.y + 3} textAnchor="middle" className="pointer-events-none fill-stone-500 text-[8px]">
                {k.sig}
              </text>
              <g role="button" aria-label={t('circle.minorChord', { name: displayNote(k.minor) })} className="cursor-pointer" onClick={() => playChord(k.minor, 'm')}>
                <circle cx={inner.x} cy={inner.y} r={15} className={isMinorHi ? 'fill-sky-600' : 'fill-transparent hover:fill-sky-100 dark:hover:fill-sky-950'} />
                <text x={inner.x} y={inner.y + 4} textAnchor="middle" className={`pointer-events-none text-[11px] ${isMinorHi ? 'fill-white font-bold' : 'fill-stone-600 dark:fill-stone-300'}`}>
                  {displayNote(k.minor)}m
                </text>
              </g>
            </g>
          )
        })}
        <text x={C} y={C - 4} textAnchor="middle" className="fill-stone-500 text-[10px]">
          {t('circle.up5')}
        </text>
        <text x={C} y={C + 12} textAnchor="middle" className="fill-stone-500 text-[10px]">
          {t('circle.up4')}
        </text>
      </svg>
      <figcaption className="mt-1 text-sm text-stone-500">{t('circle.caption')}</figcaption>
    </figure>
  )
}

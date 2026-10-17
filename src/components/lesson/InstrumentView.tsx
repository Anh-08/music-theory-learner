import type { InstrumentId } from '../../audio/instruments'
import { useSettings } from '../../store/settingsContext'
import { tuning, type FretPosition, type HighlightMap, type StringFret } from '../../theory'
import { Fretboard } from '../Fretboard/Fretboard'
import { Piano } from '../Piano/Piano'
import { pianoRangeFor } from './showModel'

export interface InstrumentViewProps {
  highlights: HighlightMap
  activeMidis?: ReadonlySet<number>
  onPick?: (midi: number, position?: FretPosition) => void
  /** Guitar: chỉ tô các vị trí này. */
  only?: StringFret[]
  /** Piano: chỉ tô các phím này. */
  onlyMidis?: ReadonlySet<number>
  fretCount?: number
  pianoRange?: [number, number]
  /** Bỏ qua nhạc cụ trong cài đặt. */
  instrument?: InstrumentId
}

const STANDARD = tuning('standard')

/** Cần đàn hoặc bàn phím, tùy nhạc cụ người học đã chọn. */
export function InstrumentView({ highlights, activeMidis, onPick, only, onlyMidis, fretCount = 12, pianoRange, instrument }: InstrumentViewProps) {
  const settings = useSettings()
  const which = instrument ?? settings.instrument
  const [start, end] = pianoRange ?? pianoRangeFor(onlyMidis)

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white p-2 dark:border-stone-800 dark:bg-stone-900">
      {which === 'guitar' ? (
        <Fretboard tuning={STANDARD} fretCount={fretCount} highlights={highlights} activeMidis={activeMidis} only={only} onNoteClick={(p) => onPick?.(p.midi, p)} />
      ) : (
        <Piano startMidi={start} endMidi={end} highlights={highlights} activeMidis={activeMidis} onlyMidis={onlyMidis} onKeyClick={(m) => onPick?.(m)} />
      )}
    </div>
  )
}

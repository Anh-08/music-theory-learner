import { PLAY_RANGE } from '../../audio/instruments'
import { parseChordSymbol, progressionEvents } from '../../audio/progression'
import { usePlayer } from '../../audio/usePlayer'
import { useT } from '../../i18n/useT'
import { useSettings } from '../../store/settingsContext'
import { displayNote } from '../../theory'

function displaySymbol(symbol: string): string {
  const { tonic } = parseChordSymbol(symbol)
  return displayNote(tonic) + symbol.slice(tonic.length)
}

/** Nút nghe một chuỗi hợp âm: <PlayChords chords="C G Am F" />. */
export function PlayChords({ chords, seconds = 1.4 }: { chords: string; seconds?: number }) {
  const { instrument } = useSettings()
  const { play, playing, stop } = usePlayer(instrument)
  const { t } = useT()
  const symbols = chords.trim().split(/\s+/)
  const label = symbols.map(displaySymbol).join(' – ')

  const onClick = () => {
    if (playing) return void stop()
    void play(progressionEvents(symbols, PLAY_RANGE[instrument].chord, seconds, instrument === 'guitar' ? 0.035 : 0))
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('playChords.aria', { chords: label })}
      className="not-prose mx-0.5 inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 align-baseline text-sm text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
    >
      {playing ? '■' : '▶'} {label}
    </button>
  )
}

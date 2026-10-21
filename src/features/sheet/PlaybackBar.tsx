import { ClickSettings } from '../../components/ui/ClickSettings'
import { useT } from '../../i18n/useT'
import type { PlaybackSettings } from './ui'

const btn = 'rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'

/** Play / stop, loop, speed, count-in and metronome for the sheet editor. */
export function PlaybackBar({
  playing,
  countingIn,
  settings,
  onSettings,
  onPlay,
  onStop,
}: {
  playing: boolean
  countingIn: boolean
  settings: PlaybackSettings
  onSettings: (s: PlaybackSettings) => void
  onPlay: (fromCursor: boolean) => void
  onStop: () => void
}) {
  const { t } = useT()
  const set = (patch: Partial<PlaybackSettings>) => onSettings({ ...settings, ...patch })
  const check = (key: 'loop' | 'countIn' | 'metronome', label: string, title?: string) => (
    <label className="flex items-center gap-1.5 text-sm" title={title}>
      <input type="checkbox" checked={settings[key]} onChange={(e) => set({ [key]: e.target.checked })} />
      {label}
    </label>
  )
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {playing ? (
        <button type="button" className="rounded-lg bg-stone-800 px-4 py-1.5 text-sm font-medium text-white dark:bg-stone-200 dark:text-stone-900" onClick={onStop}>
          {t('sheet.stop')}
        </button>
      ) : (
        <>
          <button type="button" className="rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-700" onClick={() => onPlay(false)}>
            {t('sheet.play')}
          </button>
          <button type="button" className={btn} onClick={() => onPlay(true)}>
            {t('sheet.playCursor')}
          </button>
        </>
      )}
      {countingIn && <span className="text-sm text-amber-700 dark:text-amber-400">{t('sheet.countingIn')}</span>}
      <label className="flex items-center gap-2 text-sm">
        <span className="whitespace-nowrap">{t('sheet.speed', { pct: settings.speed })}</span>
        <input type="range" min={50} max={150} step={5} value={settings.speed} onChange={(e) => set({ speed: Number(e.target.value) })} aria-label={t('sheet.speed', { pct: settings.speed })} />
      </label>
      {check('loop', t('sheet.loop'), t('sheet.loopHint'))}
      {check('countIn', t('sheet.countIn'))}
      {check('metronome', t('sheet.metronome'))}
      <ClickSettings />
    </div>
  )
}

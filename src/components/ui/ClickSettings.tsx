import { CLICK_SOUNDS, MAX_CLICK_VOLUME, nudgeClickVolume, previewClick, setClickSettings, useClickSettings, type ClickSound } from '../../audio/click'
import type { MessageKey } from '../../i18n/messages'
import { useT } from '../../i18n/useT'
import { Segmented } from './Segmented'

const SOUND_LABEL: Record<ClickSound, MessageKey> = { soft: 'click.soft', wood: 'click.wood', sharp: 'click.sharp' }
const STEP = 0.1

const stepBtn = 'h-8 w-8 shrink-0 rounded-md border border-stone-300 text-base leading-none hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800'

/** The metronome volume: − / slider / +, 0–200% (above 100% is boosted). Shared by every feature. */
export function ClickVolume() {
  const { t } = useT()
  const { volume } = useClickSettings()
  const pct = Math.round(volume * 100)
  const max = Math.round(MAX_CLICK_VOLUME * 100)

  return (
    <div className="text-sm">
      <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">{t('click.volume', { pct })}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => nudgeClickVolume(-STEP)} disabled={pct <= 0} aria-label={t('click.quieter')} className={stepBtn}>
          −
        </button>
        <input
          type="range"
          min={0}
          max={max}
          step={10}
          value={pct}
          onChange={(e) => setClickSettings({ volume: Number(e.target.value) / 100 })}
          onPointerUp={() => void previewClick()}
          onKeyUp={() => void previewClick()}
          aria-label={t('click.volumeAria')}
          className="w-full min-w-24 accent-rose-500"
        />
        <button type="button" onClick={() => nudgeClickVolume(STEP)} disabled={pct >= max} aria-label={t('click.louder')} className={stepBtn}>
          +
        </button>
      </div>
    </div>
  )
}

/** Small pop-over next to a tempo slider: the metronome sound and volume, shared by every feature. */
export function ClickSettings() {
  const { t } = useT()
  const { sound, volume } = useClickSettings()

  return (
    <details className="relative text-sm">
      <summary className="cursor-pointer list-none rounded-md border border-stone-300 px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:text-white">
        {t('click.settingsWithVolume', { pct: Math.round(volume * 100) })} ▾
      </summary>
      <div className="absolute z-20 mt-1 w-72 space-y-3 rounded-lg border border-stone-200 bg-white p-3 shadow-lg dark:border-stone-700 dark:bg-stone-900">
        <Segmented
          label={t('click.sound')}
          value={sound}
          onChange={(s) => {
            setClickSettings({ sound: s })
            void previewClick()
          }}
          options={CLICK_SOUNDS.map((s) => ({ value: s, label: t(SOUND_LABEL[s]) }))}
        />
        <ClickVolume />
        <p className="text-xs text-stone-500 dark:text-stone-400">{t('click.hint')}</p>
      </div>
    </details>
  )
}

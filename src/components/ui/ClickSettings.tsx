import { CLICK_SOUNDS, previewClick, setClickSettings, useClickSettings, type ClickSound } from '../../audio/click'
import type { MessageKey } from '../../i18n/messages'
import { useT } from '../../i18n/useT'
import { Segmented } from './Segmented'

const SOUND_LABEL: Record<ClickSound, MessageKey> = { soft: 'click.soft', wood: 'click.wood', sharp: 'click.sharp' }

/** Small pop-over next to a tempo slider: the metronome sound and volume, shared by every feature. */
export function ClickSettings() {
  const { t } = useT()
  const { sound, volume } = useClickSettings()
  const pct = Math.round(volume * 100)

  return (
    <details className="relative text-sm">
      <summary className="cursor-pointer list-none rounded-md border border-stone-300 px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:text-white">
        {t('click.settings')} ▾
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
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">{t('click.volume', { pct })}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            onChange={(e) => setClickSettings({ volume: Number(e.target.value) / 100 })}
            onPointerUp={() => void previewClick()}
            onKeyUp={() => void previewClick()}
            className="w-full accent-rose-500"
          />
        </label>
        <p className="text-xs text-stone-500 dark:text-stone-400">{t('click.hint')}</p>
      </div>
    </details>
  )
}

import { connectMic, connectMidi, disconnectLive } from '../../input/liveInput'
import { useLiveInput } from '../../input/useLiveInput'
import { useT } from '../../i18n/useT'
import { displayNote, noteFromMidi } from '../../theory'

const note = (m: number) => displayNote(noteFromMidi(m).replace(/\d+$/, '')) + (Math.floor(m / 12) - 1)

export function ConnectPage() {
  const { t } = useT()
  const live = useLiveInput()

  const statusLine = (source: 'midi' | 'mic') => {
    if (live.source !== source) return null
    if (live.status === 'connecting') return t('connect.connecting')
    if (live.status === 'unsupported') return t('connect.unsupported')
    if (live.status === 'error') return t(`connect.${live.error ?? 'other'}`)
    if (live.status === 'on') return live.error ? t(`connect.${live.error}`) : t('connect.on')
    return null
  }

  const card = 'space-y-3 rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900'
  const btn = 'rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600'
  const btn2 = 'rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-stone-700'

  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t('connect.title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">{t('connect.intro')}</p>
      </header>

      <section className={card}>
        <h2 className="text-lg font-semibold">{t('connect.midiTitle')}</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">{t('connect.midiDesc')}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => void connectMidi()} className={btn}>
            {t('connect.midiButton')}
          </button>
          {live.source === 'midi' && (
            <button type="button" onClick={disconnectLive} className={btn2}>
              {t('connect.disconnect')}
            </button>
          )}
        </div>
        {statusLine('midi') && (
          <p role="status" className="text-sm">
            {statusLine('midi')}
          </p>
        )}
        {live.source === 'midi' && live.status === 'on' && (
          <div className="text-sm text-stone-600 dark:text-stone-400">
            {live.devices.length > 0 && <p>{t('connect.devices', { names: live.devices.join(', ') })}</p>}
            <p className="text-2xl font-bold text-stone-800 dark:text-stone-100">{live.held.length ? t('connect.held', { notes: live.held.map(note).join(' ') }) : '—'}</p>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">{t('connect.micTitle')}</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">{t('connect.micDesc')}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => void connectMic()} className={btn}>
            {t('connect.micButton')}
          </button>
          {live.source === 'mic' && (
            <button type="button" onClick={disconnectLive} className={btn2}>
              {t('connect.disconnect')}
            </button>
          )}
        </div>
        {statusLine('mic') && (
          <p role="status" className="text-sm">
            {statusLine('mic')}
          </p>
        )}
        {live.source === 'mic' && live.status === 'on' && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-stone-500">
              {t('connect.level')}
              <meter min={0} max={1} value={live.level} className="w-48" />
            </label>
            <p className="text-2xl font-bold">
              {live.detected ? t('connect.detected', { note: note(live.detected.midi), cents: live.detected.cents > 0 ? `+${live.detected.cents}` : live.detected.cents }) : t('connect.silence')}
            </p>
          </div>
        )}
      </section>

      <p className="text-sm text-stone-600 dark:text-stone-400">{t('connect.where')}</p>
    </div>
  )
}

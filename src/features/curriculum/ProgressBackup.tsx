import { useRef, useState, type ChangeEvent } from 'react'
import { useT } from '../../i18n/useT'
import { emptyProgress, parseProgress } from '../../store/progress'
import { useProgress } from '../../store/progressContext'

/** Xuất / nhập / xóa tiến độ (tiến độ chỉ nằm trong trình duyệt này). */
export function ProgressBackup() {
  const { progress, replace } = useProgress()
  const { t } = useT()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `music-theory-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const parsed = parseProgress(await file.text())
    if (!parsed) return setMessage(t('backup.invalid'))
    if (!window.confirm(t('backup.confirmReplace'))) return
    replace(parsed)
    setMessage(t('backup.imported', { n: parsed.completedLessons.length }))
  }

  const reset = () => {
    if (!window.confirm(t('backup.confirmReset'))) return
    replace(emptyProgress())
    setMessage(t('backup.resetDone'))
  }

  const btn = 'rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'

  return (
    <section className="rounded-xl border border-stone-200 p-4 text-sm dark:border-stone-800">
      <h2 className="font-semibold">{t('backup.title')}</h2>
      <p className="mt-1 text-stone-500">{t('backup.desc')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={exportJson} className={btn}>
          {t('backup.export')}
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={btn}>
          {t('backup.import')}
        </button>
        <button type="button" onClick={reset} className={`${btn} text-rose-600`}>
          {t('backup.reset')}
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={importJson} aria-label={t('backup.chooseFile')} />
      </div>
      {message && (
        <p role="status" className="mt-2 text-stone-600 dark:text-stone-300">
          {message}
        </p>
      )}
    </section>
  )
}

import { useRef, useState, type ChangeEvent } from 'react'
import { emptyProgress, parseProgress } from '../../store/progress'
import { useProgress } from '../../store/progressContext'

/** Xuất / nhập / xóa tiến độ (tiến độ chỉ nằm trong trình duyệt này). */
export function ProgressBackup() {
  const { progress, replace } = useProgress()
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
    if (!parsed) return setMessage('File không đúng định dạng tiến độ.')
    if (!window.confirm('Thay tiến độ hiện tại bằng tiến độ trong file?')) return
    replace(parsed)
    setMessage(`Đã nhập: ${parsed.completedLessons.length} bài đã học.`)
  }

  const reset = () => {
    if (!window.confirm('Xóa toàn bộ tiến độ học? Không thể hoàn tác.')) return
    replace(emptyProgress())
    setMessage('Đã xóa tiến độ.')
  }

  const btn = 'rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'

  return (
    <section className="rounded-xl border border-stone-200 p-4 text-sm dark:border-stone-800">
      <h2 className="font-semibold">Tiến độ của bạn</h2>
      <p className="mt-1 text-stone-500">Tiến độ chỉ lưu trong trình duyệt này. Tải file về để sao lưu hoặc chuyển sang máy khác.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={exportJson} className={btn}>
          Tải tiến độ về
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={btn}>
          Nhập từ file
        </button>
        <button type="button" onClick={reset} className={`${btn} text-rose-600`}>
          Xóa tiến độ
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={importJson} aria-label="Chọn file tiến độ" />
      </div>
      {message && (
        <p role="status" className="mt-2 text-stone-600 dark:text-stone-300">
          {message}
        </p>
      )}
    </section>
  )
}

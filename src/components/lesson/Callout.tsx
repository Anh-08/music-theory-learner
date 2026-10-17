import type { ReactNode } from 'react'

const STYLES = {
  tip: { icon: '💡', box: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40' },
  note: { icon: '📌', box: 'border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40' },
  practice: { icon: '🎸', box: 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40' },
}

/** Hộp ghi chú trong bài học. `practice` là phần "cầm đàn lên tập". */
export function Callout({ type = 'note', title, children }: { type?: keyof typeof STYLES; title?: string; children: ReactNode }) {
  const s = STYLES[type]
  return (
    <aside className={`my-6 rounded-xl border px-4 py-1 ${s.box}`}>
      {title && (
        <p className="font-semibold">
          {s.icon} {title}
        </p>
      )}
      {children}
    </aside>
  )
}

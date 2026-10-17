import type { ReactNode } from 'react'

interface ExerciseCardProps {
  /** Id bài tập — cũng dùng làm khóa lưu tiến độ, phải duy nhất trong toàn bộ bài học. */
  id: string
  kind: string
  done?: boolean
  doneLabel?: string
  children: ReactNode
}

/** Khung chung cho mọi bài tập trong bài học. */
export function ExerciseCard({ id, kind, done, doneLabel = 'Đã làm đúng', children }: ExerciseCardProps) {
  return (
    <section data-exercise-id={id} className="not-prose my-8 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <header className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-violet-600 uppercase dark:text-violet-400">{kind}</span>
        {done && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">✓ {doneLabel}</span>}
      </header>
      {children}
    </section>
  )
}

export function Feedback({ correct, children }: { correct: boolean; children: ReactNode }) {
  return (
    <div
      role="status"
      className={`mt-3 rounded-lg px-3 py-2 text-sm ${
        correct ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
      }`}
    >
      {children}
    </div>
  )
}

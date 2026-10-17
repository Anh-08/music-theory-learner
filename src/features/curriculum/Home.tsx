import { useState } from 'react'
import { Link } from 'react-router'
import { LESSONS, lessonMeta, lessonPath, lessonsOf } from '../../lessons/registry'
import { moduleLabel } from '../../lessons/moduleLabel'
import { MODULES } from '../../lessons/modules'
import { useT } from '../../i18n/useT'
import { useProgress } from '../../store/progressContext'
import { ProgressBackup } from './ProgressBackup'
import { DECKS, pickSession } from '../review/cards'

export function Home() {
  const { progress } = useProgress()
  const { t, locale } = useT()
  const [now] = useState(() => Date.now())
  const done = new Set(progress.completedLessons)
  const nextLesson = LESSONS.find((l) => !done.has(l.id))
  const doneCount = LESSONS.filter((l) => done.has(l.id)).length
  // Chỉ nhắc ôn tập khi người học đã bắt đầu ôn (có thẻ trong lịch) và có thẻ đến hạn.
  const srs = progress.srs ?? {}
  const dueCount = Object.keys(srs).length ? pickSession(srs, DECKS.map((d) => d.id), now, 99).filter((id) => srs[id]).length : 0

  return (
    <div className="space-y-10">
      <section className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('home.title')}</h1>
        <p className="mt-3 text-lg text-stone-600 dark:text-stone-400">{t('home.intro')}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {nextLesson && (
            <Link to={lessonPath(nextLesson)} className="rounded-lg bg-rose-500 px-5 py-2.5 font-medium text-white hover:bg-rose-600">
              {t(doneCount === 0 ? 'home.start' : 'home.continue', { title: lessonMeta(nextLesson, locale).title })}
            </Link>
          )}
          <span className="text-sm text-stone-500">{t('home.doneCount', { done: doneCount, total: LESSONS.length })}</span>
          {dueCount > 0 && (
            <Link to="/review" className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400">
              {t('home.reviewDue', { n: dueCount })}
            </Link>
          )}
        </div>
      </section>

      <section aria-label={t('home.curriculum')} className="grid gap-4 md:grid-cols-2">
        {MODULES.map((m) => {
          const lessons = lessonsOf(m.id)
          const finished = lessons.filter((l) => done.has(l.id)).length
          const available = lessons.length > 0
          return (
            <article
              key={m.id}
              className={`rounded-xl border p-4 ${available ? 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900' : 'border-dashed border-stone-300 text-stone-400 dark:border-stone-800'}`}
            >
              <header className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">
                  <span className="text-stone-400">{moduleLabel(m, locale, t)} · </span>
                  {m.title[locale]}
                </h2>
                {available ? (
                  <span className="text-xs text-stone-500">
                    {finished}/{lessons.length}
                  </span>
                ) : (
                  <span className="text-xs">{t('home.comingSoon')}</span>
                )}
              </header>
              <p className="mt-1 text-sm text-stone-500">{m.description[locale]}</p>
              {available && (
                <>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800" aria-hidden>
                    <div className="h-full bg-emerald-500" style={{ width: `${(finished / lessons.length) * 100}%` }} />
                  </div>
                  <ol className="mt-3 space-y-1 text-sm">
                    {lessons.map((l) => (
                      <li key={l.id}>
                        <Link to={lessonPath(l)} className="flex gap-2 hover:text-rose-600">
                          <span className="w-4 text-emerald-600">{done.has(l.id) ? '✓' : '·'}</span>
                          {lessonMeta(l, locale).title}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </article>
          )
        })}
      </section>

      <ProgressBackup />
    </div>
  )
}

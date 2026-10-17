import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { useT } from '../../i18n/useT'
import { findLesson, lessonMeta, lessonPath, lessonsOf, localizedLesson, neighbors } from '../../lessons/registry'
import { mdxComponents } from '../../lessons/mdxComponents'
import { moduleLabel } from '../../lessons/moduleLabel'
import { MODULES } from '../../lessons/modules'
import { useProgress } from '../../store/progressContext'

export function LessonPage() {
  const { moduleId = '', slug = '' } = useParams()
  const lesson = findLesson(moduleId, slug)
  const { progress, setLessonDone } = useProgress()
  const { t, locale } = useT()

  useEffect(() => {
    document.documentElement.scrollTop = 0
  }, [moduleId, slug])

  if (!lesson) {
    return (
      <div className="py-16 text-center">
        <p>{t('lesson.notFound')}</p>
        <Link to="/" className="text-rose-600 underline">
          {t('notFound.back')}
        </Link>
      </div>
    )
  }

  const mod = MODULES.find((m) => m.id === lesson.moduleId)!
  const siblings = lessonsOf(lesson.moduleId)
  const { prev, next } = neighbors(lesson.id)
  const done = progress.completedLessons.includes(lesson.id)
  const { Component, meta, fallback } = localizedLesson(lesson, locale)

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label={t('lesson.moduleNav', { label: moduleLabel(mod, locale, t) })} className="text-sm lg:sticky lg:top-6 lg:self-start">
        <Link to="/" className="text-xs text-stone-500 hover:underline">
          {t('lesson.back')}
        </Link>
        <p className="mt-2 font-semibold">{t('lesson.moduleHeading', { label: moduleLabel(mod, locale, t), title: mod.title[locale] })}</p>
        <ol className="mt-2 space-y-1">
          {siblings.map((l, i) => (
            <li key={l.id}>
              <Link
                to={lessonPath(l)}
                aria-current={l.id === lesson.id ? 'page' : undefined}
                className={`flex gap-2 rounded-md px-2 py-1 ${l.id === lesson.id ? 'bg-rose-50 font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : 'hover:bg-stone-100 dark:hover:bg-stone-800'}`}
              >
                <span className="w-4 shrink-0 text-stone-400">{progress.completedLessons.includes(l.id) ? '✓' : `${i + 1}.`}</span>
                {lessonMeta(l, locale).title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0">
        <p className="text-xs text-stone-500">{t('lesson.meta', { label: moduleLabel(mod, locale, t), minutes: meta.minutes })}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{meta.title}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">{meta.description}</p>
        {fallback && (
          <p role="note" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            {t('lesson.untranslated')}
          </p>
        )}

        <article className="prose prose-stone mt-6 max-w-none dark:prose-invert prose-headings:scroll-mt-6 prose-table:text-sm">
          <Component components={mdxComponents} />
        </article>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-6 dark:border-stone-800">
          <button
            type="button"
            onClick={() => setLessonDone(lesson.id, !done)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${done ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            {done ? t('lesson.done') : t('lesson.markDone')}
          </button>
          <div className="flex gap-2 text-sm">
            {prev && (
              <Link to={lessonPath(prev)} className="rounded-lg border border-stone-300 px-3 py-2 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800">
                ← {lessonMeta(prev, locale).title}
              </Link>
            )}
            {next && (
              <Link to={lessonPath(next)} className="rounded-lg bg-rose-500 px-3 py-2 text-white hover:bg-rose-600">
                {lessonMeta(next, locale).title} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

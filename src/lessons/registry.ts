import type { MDXProps } from 'mdx/types'
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { LOCALES, type Locale } from '../i18n/locale'
import { MODULES } from './modules'

export interface LessonMeta {
  title: string
  description: string
  /** Estimated study time (minutes). */
  minutes: number
}

export interface LessonVariant {
  meta: LessonMeta
  /** Lesson content, loaded when the lesson is opened (one chunk per lesson). */
  Component: LazyExoticComponent<ComponentType<MDXProps>>
}

export interface Lesson {
  /** "<moduleId>/<slug>" — shared across languages (progress does not depend on language). */
  id: string
  moduleId: string
  slug: string
  variants: Partial<Record<Locale, LessonVariant>>
}

// Each lesson is src/lessons/<moduleId>/<NN-slug>.mdx (Vietnamese) and <NN-slug>.en.mdx (English),
// each file has `export const meta = {...}`. Meta is preloaded (via `?meta`, see vite.config.ts); content loads on demand.
const metas = import.meta.glob<LessonMeta>('./*/*.mdx', { eager: true, query: '?meta', import: 'meta' })
const contents = import.meta.glob<{ default: ComponentType<MDXProps> }>('./*/*.mdx')

const moduleOrder = new Map(MODULES.map((m, i) => [m.id, i]))

function collect(): Lesson[] {
  const byId = new Map<string, Lesson>()
  for (const [path, meta] of Object.entries(metas)) {
    const [, moduleId, name] = path.match(/^\.\/([^/]+)\/(.+)\.mdx$/)!
    if (!moduleOrder.has(moduleId)) throw new Error(`Lesson ${path} belongs to a module missing from MODULES`)
    if (!meta?.title) throw new Error(`Lesson ${path} is missing export const meta`)
    const locale: Locale = name.endsWith('.en') ? 'en' : 'vi'
    const slug = name.replace(/\.en$/, '')
    const id = `${moduleId}/${slug}`
    const lesson = byId.get(id) ?? { id, moduleId, slug, variants: {} }
    lesson.variants[locale] = { meta, Component: lazy(contents[path]) }
    byId.set(id, lesson)
  }
  return [...byId.values()].sort((a, b) => moduleOrder.get(a.moduleId)! - moduleOrder.get(b.moduleId)! || a.slug.localeCompare(b.slug))
}

export const LESSONS: Lesson[] = collect()

/** A lesson in the given language; without a translation, use the other language's version (`fallback: true`). */
export function localizedLesson(l: Lesson, locale: Locale): LessonVariant & { fallback: boolean } {
  const exact = l.variants[locale]
  if (exact) return { ...exact, fallback: false }
  const other = LOCALES.map((x) => l.variants[x]).find(Boolean)!
  return { ...other, fallback: true }
}

export function lessonMeta(l: Lesson, locale: Locale): LessonMeta {
  return localizedLesson(l, locale).meta
}

export function lessonsOf(moduleId: string): Lesson[] {
  return LESSONS.filter((l) => l.moduleId === moduleId)
}

export function findLesson(moduleId: string, slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.moduleId === moduleId && l.slug === slug)
}

export function neighbors(lessonId: string): { prev?: Lesson; next?: Lesson } {
  const i = LESSONS.findIndex((l) => l.id === lessonId)
  return { prev: LESSONS[i - 1], next: i >= 0 ? LESSONS[i + 1] : undefined }
}

export function lessonPath(l: Lesson): string {
  return `/learn/${l.moduleId}/${l.slug}`
}

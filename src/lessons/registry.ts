import type { MDXProps } from 'mdx/types'
import type { ComponentType } from 'react'
import { LOCALES, type Locale } from '../i18n/locale'
import { MODULES } from './modules'

export interface LessonMeta {
  title: string
  description: string
  /** Thời gian học ước tính (phút). */
  minutes: number
}

interface LessonFile {
  default: ComponentType<MDXProps>
  meta: LessonMeta
}

export interface LessonVariant {
  meta: LessonMeta
  Component: ComponentType<MDXProps>
}

export interface Lesson {
  /** "<moduleId>/<slug>" — dùng chung cho mọi ngôn ngữ (tiến độ không phụ thuộc ngôn ngữ). */
  id: string
  moduleId: string
  slug: string
  variants: Partial<Record<Locale, LessonVariant>>
}

// Mỗi bài học là src/lessons/<moduleId>/<NN-slug>.mdx (tiếng Việt) và <NN-slug>.en.mdx (tiếng Anh),
// mỗi file có `export const meta = {...}`.
const files = import.meta.glob<LessonFile>('./*/*.mdx', { eager: true })

const moduleOrder = new Map(MODULES.map((m, i) => [m.id, i]))

function collect(): Lesson[] {
  const byId = new Map<string, Lesson>()
  for (const [path, file] of Object.entries(files)) {
    const [, moduleId, name] = path.match(/^\.\/([^/]+)\/(.+)\.mdx$/)!
    if (!moduleOrder.has(moduleId)) throw new Error(`Bài học ${path} thuộc module không có trong MODULES`)
    if (!file.meta?.title) throw new Error(`Bài học ${path} thiếu export const meta`)
    const locale: Locale = name.endsWith('.en') ? 'en' : 'vi'
    const slug = name.replace(/\.en$/, '')
    const id = `${moduleId}/${slug}`
    const lesson = byId.get(id) ?? { id, moduleId, slug, variants: {} }
    lesson.variants[locale] = { meta: file.meta, Component: file.default }
    byId.set(id, lesson)
  }
  return [...byId.values()].sort((a, b) => moduleOrder.get(a.moduleId)! - moduleOrder.get(b.moduleId)! || a.slug.localeCompare(b.slug))
}

export const LESSONS: Lesson[] = collect()

/** Bản bài học theo ngôn ngữ; chưa có bản dịch thì dùng bản ngôn ngữ còn lại (`fallback: true`). */
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

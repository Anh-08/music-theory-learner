import type { MDXProps } from 'mdx/types'
import type { ComponentType } from 'react'
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

export interface Lesson {
  /** "<moduleId>/<slug>" */
  id: string
  moduleId: string
  slug: string
  meta: LessonMeta
  Component: ComponentType<MDXProps>
}

// Mỗi bài học là một file src/lessons/<moduleId>/<NN-slug>.mdx có `export const meta = {...}`.
const files = import.meta.glob<LessonFile>('./*/*.mdx', { eager: true })

const moduleOrder = new Map(MODULES.map((m, i) => [m.id, i]))

export const LESSONS: Lesson[] = Object.entries(files)
  .map(([path, file]) => {
    const [, moduleId, name] = path.match(/^\.\/([^/]+)\/(.+)\.mdx$/)!
    if (!moduleOrder.has(moduleId)) throw new Error(`Bài học ${path} thuộc module không có trong MODULES`)
    if (!file.meta?.title) throw new Error(`Bài học ${path} thiếu export const meta`)
    return { id: `${moduleId}/${name}`, moduleId, slug: name, meta: file.meta, Component: file.default }
  })
  .sort((a, b) => moduleOrder.get(a.moduleId)! - moduleOrder.get(b.moduleId)! || a.slug.localeCompare(b.slug))

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

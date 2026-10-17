import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from '../App'
import { renderWithProviders } from '../test/renderWithProviders'
import { MODULES } from './modules'
import { LESSONS, lessonMeta, lessonPath, lessonsOf, neighbors } from './registry'

describe('danh sách bài học', () => {
  it('có bài cho Module 0–3, đúng thứ tự', () => {
    for (const id of ['m0-ban-do', 'm1-quang', 'm2-scale-truong', 'm3-hop-am-ba']) {
      expect(lessonsOf(id).length, id).toBeGreaterThan(0)
    }
    const order = MODULES.map((m) => m.id)
    const indices = LESSONS.map((l) => order.indexOf(l.moduleId))
    expect(indices).toEqual([...indices].sort((a, b) => a - b))
  })

  it('mỗi bài có meta đầy đủ và id duy nhất', () => {
    for (const l of LESSONS) {
      expect(lessonMeta(l, 'vi').title, l.id).toBeTruthy()
      expect(lessonMeta(l, 'vi').description, l.id).toBeTruthy()
      expect(lessonMeta(l, 'vi').minutes, l.id).toBeGreaterThan(0)
    }
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length)
  })

  it('bài trước / bài sau nối liền nhau', () => {
    expect(neighbors(LESSONS[0].id).prev).toBeUndefined()
    expect(neighbors(LESSONS[0].id).next).toBe(LESSONS[1])
    expect(neighbors(LESSONS[LESSONS.length - 1].id).next).toBeUndefined()
  })
})

describe('mỗi bài học hiển thị được', () => {
  beforeEach(() => localStorage.clear())

  // Id bài tập dùng làm khóa lưu tiến độ nên không được trùng giữa các bài,
  // và bản tiếng Việt / tiếng Anh của cùng một bài phải có đúng cùng bộ id.
  const exerciseOwner = new Map<string, string>()
  const idsByVariant = new Map<string, string[]>()

  for (const lesson of LESSONS) {
    for (const instrument of ['guitar', 'piano'] as const) {
      for (const locale of ['vi', 'en'] as const) {
        it(`${lesson.id} (${instrument}, ${locale})`, async () => {
          const { container } = renderWithProviders(<AppRoutes />, { route: lessonPath(lesson), instrument, locale })
          // Nội dung bài được tải riêng (lazy): chờ nội dung hiện ra.
          await waitFor(() => expect(container.querySelector('article')?.textContent?.length ?? 0).toBeGreaterThan(100), { timeout: 10_000 })
          expect(screen.getByRole('heading', { level: 1, name: lessonMeta(lesson, locale).title })).toBeInTheDocument()
          expect(screen.queryByRole('note'), 'bài chưa được dịch').not.toBeInTheDocument()
          const ids = [...container.querySelectorAll('[data-exercise-id]')].map((el) => el.getAttribute('data-exercise-id')!)
          expect(new Set(ids).size, 'id trùng trong cùng bài').toBe(ids.length)
          for (const id of ids) {
            const owner = exerciseOwner.get(id) ?? lesson.id
            expect(owner, `id ${id} đã dùng ở bài ${owner}`).toBe(lesson.id)
            exerciseOwner.set(id, lesson.id)
          }
          const key = `${lesson.id}|${instrument}`
          const other = idsByVariant.get(key)
          if (other) expect(ids, 'bản vi và en có bộ bài tập khác nhau').toEqual(other)
          else idsByVariant.set(key, ids)
        })
      }
    }
  }
})

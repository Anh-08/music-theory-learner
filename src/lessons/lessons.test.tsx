import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from '../App'
import { renderWithProviders } from '../test/renderWithProviders'
import { MODULES } from './modules'
import { LESSONS, lessonPath, lessonsOf, neighbors } from './registry'

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
      expect(l.meta.title, l.id).toBeTruthy()
      expect(l.meta.description, l.id).toBeTruthy()
      expect(l.meta.minutes, l.id).toBeGreaterThan(0)
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

  // Id bài tập dùng làm khóa lưu tiến độ nên không được trùng giữa các bài.
  const exerciseOwner = new Map<string, string>()

  for (const lesson of LESSONS) {
    for (const instrument of ['guitar', 'piano'] as const) {
      it(`${lesson.id} (${instrument})`, () => {
        const { container } = renderWithProviders(<AppRoutes />, { route: lessonPath(lesson), instrument })
        expect(screen.getByRole('heading', { level: 1, name: lesson.meta.title })).toBeInTheDocument()
        const ids = [...container.querySelectorAll('[data-exercise-id]')].map((el) => el.getAttribute('data-exercise-id')!)
        expect(new Set(ids).size, 'id trùng trong cùng bài').toBe(ids.length)
        for (const id of ids) {
          const owner = exerciseOwner.get(id) ?? lesson.id
          expect(owner, `id ${id} đã dùng ở bài ${owner}`).toBe(lesson.id)
          exerciseOwner.set(id, lesson.id)
        }
      })
    }
  }
})

import { describe, expect, it } from 'vitest'
import { emptyProgress, parseProgress, recordDrill, recordQuiz, setLessonDone } from '../progress'

describe('progress', () => {
  it('đánh dấu và bỏ đánh dấu bài học', () => {
    let p = setLessonDone(emptyProgress(), 'a/b', true)
    p = setLessonDone(p, 'a/b', true)
    expect(p.completedLessons).toEqual(['a/b'])
    expect(setLessonDone(p, 'a/b', false).completedLessons).toEqual([])
  })

  it('ghi kết quả câu hỏi: đã đúng thì giữ là đúng', () => {
    let p = recordQuiz(emptyProgress(), 'q', false)
    p = recordQuiz(p, 'q', true)
    p = recordQuiz(p, 'q', false)
    expect(p.quizzes.q).toEqual({ correct: true, attempts: 3 })
  })

  it('ghi chuỗi đúng tốt nhất của bài luyện', () => {
    let p = recordDrill(emptyProgress(), 'd', 3, true)
    p = recordDrill(p, 'd', 0, false)
    expect(p.drills.d).toEqual({ best: 3, total: 1 })
  })

  it('đọc lại được dữ liệu đã xuất', () => {
    const p = recordQuiz(setLessonDone(emptyProgress(), 'x', true), 'q', true)
    expect(parseProgress(JSON.stringify(p))).toEqual(p)
  })

  it('từ chối dữ liệu sai định dạng', () => {
    expect(parseProgress('không phải json')).toBeNull()
    expect(parseProgress('{"version":2}')).toBeNull()
    expect(parseProgress('{"version":1,"completedLessons":[1],"quizzes":{},"drills":{}}')).toBeNull()
    expect(parseProgress('{"version":1,"completedLessons":[],"quizzes":{"q":{"correct":"yes"}},"drills":{}}')).toBeNull()
  })
})

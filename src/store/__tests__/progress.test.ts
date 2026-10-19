import { describe, expect, it } from 'vitest'
import { emptyProgress, parseProgress, recordDrill, recordQuiz, setLessonDone } from '../progress'

describe('progress', () => {
  it('marks and unmarks lessons', () => {
    let p = setLessonDone(emptyProgress(), 'a/b', true)
    p = setLessonDone(p, 'a/b', true)
    expect(p.completedLessons).toEqual(['a/b'])
    expect(setLessonDone(p, 'a/b', false).completedLessons).toEqual([])
  })

  it('records question results: once correct, stays correct', () => {
    let p = recordQuiz(emptyProgress(), 'q', false)
    p = recordQuiz(p, 'q', true)
    p = recordQuiz(p, 'q', false)
    expect(p.quizzes.q).toEqual({ correct: true, attempts: 3 })
  })

  it('records the best streak of a drill', () => {
    let p = recordDrill(emptyProgress(), 'd', 3, true)
    p = recordDrill(p, 'd', 0, false)
    expect(p.drills.d).toEqual({ best: 3, total: 1 })
  })

  it('reads back exported data', () => {
    const p = recordQuiz(setLessonDone(emptyProgress(), 'x', true), 'q', true)
    expect(parseProgress(JSON.stringify(p))).toEqual(p)
  })

  it('rejects malformed data', () => {
    expect(parseProgress('not json')).toBeNull()
    expect(parseProgress('{"version":2}')).toBeNull()
    expect(parseProgress('{"version":1,"completedLessons":[1],"quizzes":{},"drills":{}}')).toBeNull()
    expect(parseProgress('{"version":1,"completedLessons":[],"quizzes":{"q":{"correct":"yes"}},"drills":{}}')).toBeNull()
  })
})

describe('spaced repetition review', async () => {
  const { recordCard, SRS_DAYS } = await import('../progress')
  const DAY = 86_400_000

  it('correct moves up a box and spaces out the schedule, wrong goes back to box 0', () => {
    let p = recordCard(emptyProgress(), 'c', true, 0)
    expect(p.srs!.c).toEqual({ box: 1, due: SRS_DAYS[1] * DAY })
    p = recordCard(p, 'c', true, 10)
    expect(p.srs!.c).toEqual({ box: 2, due: 10 + 2 * DAY })
    p = recordCard(p, 'c', false, 20)
    expect(p.srs!.c).toEqual({ box: 0, due: 20 + 600_000 })
  })

  it('old data without srs still loads; malformed srs is rejected', () => {
    expect(parseProgress('{"version":1,"completedLessons":[],"quizzes":{},"drills":{}}')).not.toBeNull()
    expect(parseProgress('{"version":1,"completedLessons":[],"quizzes":{},"drills":{},"srs":{"x":{"box":"1"}}}')).toBeNull()
  })
})

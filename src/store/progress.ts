/** Tiến độ học, lưu trong localStorage và xuất/nhập được dưới dạng JSON. */
export interface Progress {
  version: 1
  completedLessons: string[]
  /** Kết quả câu hỏi theo id: đã từng trả lời đúng chưa, đã thử bao nhiêu lần. */
  quizzes: Record<string, { correct: boolean; attempts: number }>
  /** Bài luyện lặp lại (luyện tai, tìm nốt…): chuỗi đúng liên tiếp tốt nhất và tổng số câu đúng. */
  drills: Record<string, { best: number; total: number }>
}

export function emptyProgress(): Progress {
  return { version: 1, completedLessons: [], quizzes: {}, drills: {} }
}

export function setLessonDone(p: Progress, lessonId: string, done: boolean): Progress {
  const others = p.completedLessons.filter((id) => id !== lessonId)
  return { ...p, completedLessons: done ? [...others, lessonId] : others }
}

export function recordQuiz(p: Progress, quizId: string, correct: boolean): Progress {
  const prev = p.quizzes[quizId] ?? { correct: false, attempts: 0 }
  return { ...p, quizzes: { ...p.quizzes, [quizId]: { correct: prev.correct || correct, attempts: prev.attempts + 1 } } }
}

export function recordDrill(p: Progress, drillId: string, streak: number, correct: boolean): Progress {
  const prev = p.drills[drillId] ?? { best: 0, total: 0 }
  return {
    ...p,
    drills: { ...p.drills, [drillId]: { best: Math.max(prev.best, streak), total: prev.total + (correct ? 1 : 0) } },
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Đọc tiến độ từ JSON; trả về null nếu dữ liệu không đúng định dạng. */
export function parseProgress(json: string): Progress | null {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  if (!isRecord(data) || data.version !== 1) return null
  const { completedLessons, quizzes, drills } = data
  if (!Array.isArray(completedLessons) || !completedLessons.every((x) => typeof x === 'string')) return null
  if (!isRecord(quizzes) || !isRecord(drills)) return null
  const quizOk = Object.values(quizzes).every((q) => isRecord(q) && typeof q.correct === 'boolean' && typeof q.attempts === 'number')
  const drillOk = Object.values(drills).every((d) => isRecord(d) && typeof d.best === 'number' && typeof d.total === 'number')
  if (!quizOk || !drillOk) return null
  return data as unknown as Progress
}

/** Tiến độ học, lưu trong localStorage và xuất/nhập được dưới dạng JSON. */
export interface Progress {
  version: 1
  completedLessons: string[]
  /** Kết quả câu hỏi theo id: đã từng trả lời đúng chưa, đã thử bao nhiêu lần. */
  quizzes: Record<string, { correct: boolean; attempts: number }>
  /** Bài luyện lặp lại (luyện tai, tìm nốt…): chuỗi đúng liên tiếp tốt nhất và tổng số câu đúng. */
  drills: Record<string, { best: number; total: number }>
  /** Thẻ ôn tập lặp lại ngắt quãng: hộp Leitner (0–6) và thời điểm đến hạn (ms). Có thể thiếu ở dữ liệu cũ. */
  srs?: Record<string, { box: number; due: number }>
}

/** Khoảng cách ôn theo hộp Leitner, tính bằng ngày. */
export const SRS_DAYS = [0, 1, 2, 4, 8, 16, 32]
const DAY = 86_400_000

/** Ghi kết quả một thẻ: đúng thì lên hộp và giãn lịch ôn; sai thì về hộp 0, ôn lại sau 10 phút. */
export function recordCard(p: Progress, cardId: string, correct: boolean, now: number): Progress {
  const prev = p.srs?.[cardId] ?? { box: 0, due: now }
  const box = correct ? Math.min(prev.box + 1, SRS_DAYS.length - 1) : 0
  const due = correct ? now + SRS_DAYS[box] * DAY : now + 10 * 60_000
  return { ...p, srs: { ...p.srs, [cardId]: { box, due } } }
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
  if (data.srs !== undefined) {
    if (!isRecord(data.srs)) return null
    if (!Object.values(data.srs).every((c) => isRecord(c) && typeof c.box === 'number' && typeof c.due === 'number')) return null
  }
  return data as unknown as Progress
}

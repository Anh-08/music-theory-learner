/** Learning progress, stored in localStorage and exportable/importable as JSON. */
export interface Progress {
  version: 1
  completedLessons: string[]
  /** Question results by id: whether it was ever answered correctly, and how many attempts. */
  quizzes: Record<string, { correct: boolean; attempts: number }>
  /** Repeating drills (ear training, find the notes…): best streak of consecutive correct answers and total correct. */
  drills: Record<string, { best: number; total: number }>
  /** Spaced-repetition cards: Leitner box (0–6) and due time (ms). May be missing in old data. */
  srs?: Record<string, { box: number; due: number }>
  /** Personal records of timed drills (fretboard note reflex): best correct notes per minute and best average reaction. */
  records?: Record<string, DrillRecord>
}

export interface DrillRecord {
  perMinute: number
  avgMs: number
}

/** Review interval per Leitner box, in days. */
export const SRS_DAYS = [0, 1, 2, 4, 8, 16, 32]
const DAY = 86_400_000

/** Records a card result: correct moves up a box and spaces out reviews; wrong goes back to box 0, due again in 10 minutes. */
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

/** Keeps the best of each figure separately: more notes per minute, a faster average reaction. */
export function recordBest(p: Progress, id: string, run: DrillRecord): Progress {
  const prev = p.records?.[id]
  const best = prev ? { perMinute: Math.max(prev.perMinute, run.perMinute), avgMs: Math.min(prev.avgMs, run.avgMs) } : run
  return { ...p, records: { ...p.records, [id]: best } }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Reads progress from JSON; returns null if the data is malformed. */
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
  if (data.records !== undefined) {
    if (!isRecord(data.records)) return null
    if (!Object.values(data.records).every((r) => isRecord(r) && typeof r.perMinute === 'number' && typeof r.avgMs === 'number')) return null
  }
  return data as unknown as Progress
}

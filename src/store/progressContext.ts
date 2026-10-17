import { createContext, useContext } from 'react'
import { emptyProgress, type Progress } from './progress'

export interface ProgressApi {
  progress: Progress
  setLessonDone: (lessonId: string, done: boolean) => void
  recordQuiz: (quizId: string, correct: boolean) => void
  recordDrill: (drillId: string, streak: number, correct: boolean) => void
  recordCard: (cardId: string, correct: boolean) => void
  replace: (p: Progress) => void
}

const noop = () => {}

export const ProgressContext = createContext<ProgressApi>({
  progress: emptyProgress(),
  setLessonDone: noop,
  recordQuiz: noop,
  recordDrill: noop,
  recordCard: noop,
  replace: noop,
})

export function useProgress(): ProgressApi {
  return useContext(ProgressContext)
}

import { useMemo, type ReactNode } from 'react'
import { emptyProgress, recordDrill, recordQuiz, setLessonDone, type Progress } from './progress'
import { ProgressContext, type ProgressApi } from './progressContext'
import { usePersistentState } from './usePersistentState'

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = usePersistentState<Progress>('progress', emptyProgress())

  const api = useMemo<ProgressApi>(
    () => ({
      progress,
      setLessonDone: (id, done) => setProgress((p) => setLessonDone(p, id, done)),
      recordQuiz: (id, correct) => setProgress((p) => recordQuiz(p, id, correct)),
      recordDrill: (id, streak, correct) => setProgress((p) => recordDrill(p, id, streak, correct)),
      replace: setProgress,
    }),
    [progress, setProgress],
  )

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>
}

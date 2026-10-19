import { useState } from 'react'
import { useProgress } from '../../store/progressContext'

/** Counts a drill's streak of consecutive correct answers and saves the best streak to progress. */
export function useDrill(id: string) {
  const { progress, recordDrill } = useProgress()
  const [streak, setStreak] = useState(0)
  const best = progress.drills[id]?.best ?? 0

  const answer = (correct: boolean) => {
    const next = correct ? streak + 1 : 0
    setStreak(next)
    recordDrill(id, next, correct)
  }

  return { streak, best, answer }
}

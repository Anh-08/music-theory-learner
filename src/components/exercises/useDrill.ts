import { useState } from 'react'
import { useProgress } from '../../store/progressContext'

/** Đếm chuỗi trả lời đúng liên tiếp của một bài luyện và lưu kỷ lục vào tiến độ. */
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

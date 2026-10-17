import { parsePattern } from '../../audio/rhythms'
import { RhythmGrid } from '../RhythmGrid/RhythmGrid'

interface PatternViewProps {
  /** Mẫu điệu, cùng cú pháp với thư viện điệu: "D - D U - U D U". */
  pattern: string
  beats?: 3 | 4
  sub?: 2 | 3 | 4
  caption?: string
}

/** Lưới phách tĩnh để minh họa ký hiệu trong bài học (không phát nhạc). */
export function PatternView({ pattern, beats = 4, sub = 2, caption }: PatternViewProps) {
  return (
    <figure className="not-prose my-4">
      <RhythmGrid steps={parsePattern(pattern)} beatsPerBar={beats} stepsPerBeat={sub} />
      {caption && <figcaption className="mt-1 text-sm text-stone-500">{caption}</figcaption>}
    </figure>
  )
}

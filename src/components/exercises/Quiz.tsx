import { useState } from 'react'
import { chordEvents, sequenceEvents } from '../../audio/events'
import { usePlayer } from '../../audio/usePlayer'
import { useProgress } from '../../store/progressContext'
import { useSettings } from '../../store/settingsContext'
import { midi } from '../../theory'
import { ExerciseCard, Feedback } from './ExerciseCard'
import { buttonClass } from './styles'

interface QuizProps {
  id: string
  question: string
  options: string[]
  /** Chỉ số (từ 0) của đáp án đúng. */
  answer: number
  explain?: string
  /** Nốt có quãng tám để phát kèm câu hỏi (câu hỏi nghe): "C4 E4". */
  play?: string
  playAs?: 'sequence' | 'chord'
}

/** Câu hỏi trắc nghiệm. Chọn sai thì được chọn lại; chọn đúng thì hiện giải thích. */
export function Quiz({ id, question, options, answer, explain, play: playNotes, playAs = 'sequence' }: QuizProps) {
  const { progress, recordQuiz } = useProgress()
  const { instrument } = useSettings()
  const { play } = usePlayer(instrument)
  const [wrong, setWrong] = useState<ReadonlySet<number>>(new Set())
  const [solved, setSolved] = useState(false)

  const choose = (i: number) => {
    if (solved || wrong.has(i)) return
    const correct = i === answer
    recordQuiz(id, correct)
    if (correct) setSolved(true)
    else setWrong(new Set([...wrong, i]))
  }

  const playPrompt = () => {
    if (!playNotes) return
    const midis = playNotes.trim().split(/\s+/).map(midi)
    void play(playAs === 'chord' ? chordEvents(midis, instrument === 'guitar' ? 0.035 : 0) : sequenceEvents(midis, 0.6))
  }

  return (
    <ExerciseCard id={id} kind="Câu hỏi" done={progress.quizzes[id]?.correct}>
      <p className="font-medium">{question}</p>
      {playNotes && (
        <button type="button" onClick={playPrompt} className={`${buttonClass.secondary} mt-2`}>
          ▶ Nghe
        </button>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((o, i) => {
          const state = solved && i === answer ? 'correct' : wrong.has(i) ? 'wrong' : 'idle'
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={solved && i !== answer}
              aria-pressed={state !== 'idle'}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                state === 'correct'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50'
                  : state === 'wrong'
                    ? 'border-amber-400 bg-amber-50 text-stone-500 line-through dark:bg-amber-950/40'
                    : 'border-stone-300 hover:border-violet-400 hover:bg-violet-50 disabled:opacity-50 dark:border-stone-700 dark:hover:bg-violet-950/40'
              }`}
            >
              {o}
            </button>
          )
        })}
      </div>
      {solved && <Feedback correct>Chính xác! {explain}</Feedback>}
      {!solved && wrong.size > 0 && <Feedback correct={false}>Chưa đúng — thử lại nhé.</Feedback>}
    </ExerciseCard>
  )
}

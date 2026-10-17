import { useMemo, useState } from 'react'
import { useSettings } from '../../store/settingsContext'
import { CHROMAS, fretboardPositions, isBlackKey, rootLabel, tuning, type HighlightMap, type StringFret } from '../../theory'
import { useT } from '../../i18n/useT'
import { useLiveInput, useLiveNote } from '../../input/useLiveInput'
import { InstrumentView } from '../lesson/InstrumentView'
import { ExerciseCard, Feedback } from './ExerciseCard'
import { buttonClass } from './styles'
import { pick } from './random'
import { useDrill } from './useDrill'

interface NoteDrillProps {
  id: string
  /** Chỉ hỏi các nốt tự nhiên (không thăng/giáng). */
  naturalsOnly?: boolean
  /** Guitar: phím cao nhất được hỏi. */
  maxFret?: number
  /** Guitar: chỉ hỏi trên các dây này, ví dụ "6 5". */
  strings?: string
}

const NATURALS = [0, 2, 4, 5, 7, 9, 11]
const PIANO_RANGE: [number, number] = [48, 71]

interface Question {
  midi: number
  position?: StringFret
}

/** Luyện đọc tên nốt: một vị trí trên đàn được đánh dấu, người học chọn tên nốt. */
export function NoteDrill({ id, naturalsOnly = false, maxFret = 12, strings }: NoteDrillProps) {
  const { instrument } = useSettings()
  const { streak, best, answer } = useDrill(id)
  const { t } = useT()
  const live = useLiveInput()
  const [question, setQuestion] = useState<Question | null>(null)
  const [picked, setPicked] = useState<number | null>(null)

  const pool = useMemo<Question[]>(() => {
    const allowed = new Set(naturalsOnly ? NATURALS : CHROMAS)
    if (instrument === 'guitar') {
      const stringSet = strings ? new Set(strings.trim().split(/\s+/).map(Number)) : null
      return fretboardPositions(tuning('standard'), maxFret)
        .filter((p) => allowed.has(p.chroma) && (!stringSet || stringSet.has(p.string)))
        .map((p) => ({ midi: p.midi, position: { string: p.string, fret: p.fret } }))
    }
    const keys: Question[] = []
    for (let m = PIANO_RANGE[0]; m <= PIANO_RANGE[1]; m++) if (!naturalsOnly || !isBlackKey(m)) keys.push({ midi: m })
    return keys
  }, [instrument, naturalsOnly, maxFret, strings])

  const next = () => {
    let q = pick(pool)
    // Tránh hỏi lại đúng vị trí vừa hỏi.
    if (question && pool.length > 1) while (q.midi === question.midi && q.position?.string === question.position?.string) q = pick(pool)
    setQuestion(q)
    setPicked(null)
  }

  const choose = (c: number) => {
    if (!question || picked !== null) return
    setPicked(c)
    answer(c === question.midi % 12)
  }

  // Trả lời bằng cách chơi nốt trên đàn thật (MIDI / micro).
  useLiveNote((m) => choose(m % 12), live.status === 'on')

  const highlights: HighlightMap = new Map()
  if (question) {
    const c = question.midi % 12
    highlights.set(c, { label: picked === null ? '?' : rootLabel(c).split(' / ')[0], isRoot: false, color: picked === null ? 'question' : picked === c ? 'correct' : 'wrong' })
  }

  const options = naturalsOnly ? NATURALS : CHROMAS

  return (
    <ExerciseCard id={id} kind={t('ex.drill')} done={best >= 10} doneLabel={t('ex.record', { n: best })}>
      <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
        {t('ex.drillIntro')} {live.status === 'on' && t('live.hint')}
      </p>
      {question ? (
        <InstrumentView
          highlights={highlights}
          only={question.position ? [question.position] : undefined}
          onlyMidis={question.position ? undefined : new Set([question.midi])}
          fretCount={Math.max(12, maxFret)}
          pianoRange={PIANO_RANGE}
        />
      ) : (
        <button type="button" onClick={next} className={buttonClass.primary}>
          {t('ex.startPlain')}
        </button>
      )}
      {question && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => choose(c)}
                disabled={picked !== null}
                className={`min-w-12 rounded-lg border px-3 py-1.5 text-sm ${
                  picked !== null && c === question.midi % 12
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50'
                    : picked === c
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40'
                      : 'border-stone-300 hover:border-violet-400 disabled:opacity-60 dark:border-stone-700'
                }`}
              >
                {rootLabel(c)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            {picked !== null && (
              <button type="button" onClick={next} className={buttonClass.primary}>
                {t('ex.next')}
              </button>
            )}
            <span className="ml-auto text-sm text-stone-500">
              {t('ex.streak')} <strong>{streak}</strong> · {t('ex.best')} {best}
            </span>
          </div>
          {picked !== null && <Feedback correct={picked === question.midi % 12}>{picked === question.midi % 12 ? t('ex.right') : t('ex.wasActually', { answer: rootLabel(question.midi % 12) })}</Feedback>}
        </>
      )}
    </ExerciseCard>
  )
}

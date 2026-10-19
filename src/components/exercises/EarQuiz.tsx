import { useMemo, useState } from 'react'
import { chordEvents, sequenceEvents, type PlayEvent } from '../../audio/events'
import { usePlayer } from '../../audio/usePlayer'
import { useSettings } from '../../store/settingsContext'
import { useT } from '../../i18n/useT'
import { chordFromRoot, chordType, intervalShortName, semitones, stackIntervals } from '../../theory'
import { ExerciseCard, Feedback } from './ExerciseCard'
import { buttonClass } from './styles'
import { pick, randomInt } from './random'
import { useDrill } from './useDrill'

interface EarQuizProps {
  id: string
  kind: 'interval' | 'chord'
  /** Space-separated choices: intervals ("3m 3M 5P") or chord types ("M m dim aug"). */
  options: string
  /** Intervals: play ascending (default), descending, or together. */
  direction?: 'up' | 'down' | 'together'
}

interface Question {
  rootMidi: number
  answer: string
}

/** Ear training: hear a random interval / chord and pick the answer. */
export function EarQuiz({ id, kind, options, direction = 'up' }: EarQuizProps) {
  const { instrument } = useSettings()
  const { play } = usePlayer(instrument)
  const { streak, best, answer } = useDrill(id)
  const { t, locale } = useT()
  const choices = useMemo(() => options.trim().split(/\s+/), [options])
  const [question, setQuestion] = useState<Question | null>(null)
  const [picked, setPicked] = useState<string | null>(null)

  const label = (o: string) =>
    kind === 'interval'
      ? intervalShortName(o, locale)
      : t('ex.chordQuality', { name: locale === 'vi' ? chordType(o).nameVi.toLowerCase() : chordType(o).nameEn })

  const eventsFor = (q: Question): PlayEvent[] => {
    const roll = instrument === 'guitar' ? 0.035 : 0
    if (kind === 'interval') {
      const other = q.rootMidi + semitones(q.answer)
      if (direction === 'together') return chordEvents([q.rootMidi, other], roll)
      return sequenceEvents(direction === 'up' ? [q.rootMidi, other] : [other, q.rootMidi], 0.7, 1)
    }
    // Interval formulas do not depend on the root, so build on C and then stack on a random root.
    const midis = stackIntervals(q.rootMidi, chordFromRoot('C', q.answer).intervals)
    return [...chordEvents(midis, roll, 1.5), ...sequenceEvents(midis, 0.35).map((e) => ({ ...e, at: e.at + 1.7 }))]
  }

  const next = () => {
    const q = { rootMidi: kind === 'interval' ? randomInt(55, 67) : randomInt(48, 59), answer: pick(choices) }
    setQuestion(q)
    setPicked(null)
    void play(eventsFor(q))
  }

  const choose = (o: string) => {
    if (!question || picked) return
    setPicked(o)
    answer(o === question.answer)
  }

  return (
    <ExerciseCard id={id} kind={t('ex.ear')} done={best >= 5} doneLabel={t('ex.record', { n: best })}>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        {t('ex.earIntro', { what: t(kind === 'interval' ? 'ex.earWhatInterval' : 'ex.earWhatChord') })}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!question ? (
          <button type="button" onClick={next} className={buttonClass.primary}>
            {t('ex.start')}
          </button>
        ) : (
          <>
            <button type="button" onClick={() => void play(eventsFor(question))} className={buttonClass.secondary}>
              {t('ex.replay')}
            </button>
            {picked && (
              <button type="button" onClick={next} className={buttonClass.primary}>
                {t('ex.next')}
              </button>
            )}
          </>
        )}
        <span className="ml-auto text-sm text-stone-500">
          {t('ex.streak')} <strong>{streak}</strong> · {t('ex.best')} {best}
        </span>
      </div>
      {question && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {choices.map((o) => {
            const state = !picked ? 'idle' : o === question.answer ? 'correct' : o === picked ? 'wrong' : 'idle'
            return (
              <button
                key={o}
                type="button"
                onClick={() => choose(o)}
                disabled={picked !== null}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  state === 'correct'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50'
                    : state === 'wrong'
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40'
                      : 'border-stone-300 hover:border-violet-400 disabled:opacity-60 dark:border-stone-700'
                }`}
              >
                {label(o)}
              </button>
            )
          })}
        </div>
      )}
      {question && picked && (
        <Feedback correct={picked === question.answer}>
          {picked === question.answer ? t('ex.right') : t('ex.wasActually', { answer: locale === 'vi' ? label(question.answer).toLowerCase() : label(question.answer) })}
        </Feedback>
      )}
    </ExerciseCard>
  )
}

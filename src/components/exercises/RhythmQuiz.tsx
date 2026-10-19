import { useEffect, useId, useMemo, useState } from 'react'
import { groove } from '../../audio/grooves'
import { startJam, stopJam } from '../../audio/jam'
import { useJamState } from '../../audio/jamStore'
import { rhythm as getRhythm } from '../../audio/rhythms'
import { useT } from '../../i18n/useT'
import { parseProgression } from '../../theory'
import { ExerciseCard, Feedback } from './ExerciseCard'
import { pick } from './random'
import { buttonClass } from './styles'
import { useDrill } from './useDrill'

interface RhythmQuizProps {
  id: string
  /** Space-separated rhythm ids to choose from: "ballad valse slowrock". */
  options: string
  progression?: string
}

/** Ear training: hear a guitar comping rhythm (with drums and bass) and guess its name. */
export function RhythmQuiz({ id, options, progression = 'C G Am F' }: RhythmQuizProps) {
  const ownerId = useId()
  const { t, locale } = useT()
  const jam = useJamState()
  const { streak, best, answer } = useDrill(id)
  const choices = useMemo(() => options.trim().split(/\s+/).map(getRhythm), [options])
  const chords = useMemo(() => parseProgression(progression), [progression])
  const [question, setQuestion] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const playing = jam.ownerId === ownerId

  const playRhythm = (rid: string) => {
    const r = getRhythm(rid)
    void startJam({ ownerId, chords, groove: groove(r.groove), tempo: r.defaultTempo, instrument: 'guitar', rhythm: r, mutes: { drums: false, bass: false, chords: false, click: true } })
  }

  const next = () => {
    let q = pick(choices).id
    if (question && choices.length > 1) while (q === question) q = pick(choices).id
    setQuestion(q)
    setPicked(null)
    playRhythm(q)
  }

  const choose = (rid: string) => {
    if (!question || picked) return
    setPicked(rid)
    answer(rid === question)
  }

  useEffect(() => {
    if (!playing) return
    return () => void stopJam(ownerId)
  }, [playing, ownerId])

  const name = (rid: string) => getRhythm(rid).name[locale]

  return (
    <ExerciseCard id={id} kind={t('ex.rhythm')} done={best >= 5} doneLabel={t('ex.record', { n: best })}>
      <p className="text-sm text-stone-600 dark:text-stone-400">{t('ex.rhythmIntro')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!question ? (
          <button type="button" onClick={next} className={buttonClass.primary}>
            {t('ex.start')}
          </button>
        ) : (
          <>
            <button type="button" onClick={() => (playing ? void stopJam(ownerId) : playRhythm(question))} className={buttonClass.secondary}>
              {playing ? t('common.stop') : t('ex.replay')}
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
          {choices.map((r) => {
            const state = !picked ? 'idle' : r.id === question ? 'correct' : r.id === picked ? 'wrong' : 'idle'
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => choose(r.id)}
                disabled={picked !== null}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  state === 'correct' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' : state === 'wrong' ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40' : 'border-stone-300 hover:border-violet-400 disabled:opacity-60 dark:border-stone-700'
                }`}
              >
                {r.name[locale]}
              </button>
            )
          })}
        </div>
      )}
      {question && picked && <Feedback correct={picked === question}>{picked === question ? t('ex.right') : t('ex.wasActually', { answer: name(question) })}</Feedback>}
    </ExerciseCard>
  )
}

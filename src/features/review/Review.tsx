import { useMemo, useState } from 'react'
import { usePlayer } from '../../audio/usePlayer'
import { Feedback } from '../../components/exercises/ExerciseCard'
import { buttonClass } from '../../components/exercises/styles'
import { useT } from '../../i18n/useT'
import { useProgress } from '../../store/progressContext'
import { useSettings } from '../../store/settingsContext'
import { usePersistentState } from '../../store/usePersistentState'
import { DECKS, buildQuestion, deckStats, pickSession, type DeckId, type Question } from './cards'

interface Session {
  queue: string[]
  index: number
  correct: number
  answered: number
  /** Cards answered wrong in this session — asked again once at the end. */
  retried: string[]
}

export function Review() {
  const { t, locale } = useT()
  const { instrument } = useSettings()
  const { play } = usePlayer(instrument)
  const { progress, recordCard } = useProgress()
  const srs = useMemo(() => progress.srs ?? {}, [progress.srs])
  const [decks, setDecks] = usePersistentState<DeckId[]>('review.decks', ['interval-name', 'chord-spell', 'key-sig', 'diatonic'])
  const [session, setSession] = useState<Session | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const upcoming = useMemo(() => pickSession(srs, decks, now), [srs, decks, now])
  const cardId = session ? session.queue[session.index] : null

  const show = (id: string) => {
    const q = buildQuestion(id, locale)
    setQuestion(q)
    setPicked(null)
    if (q.events) void play(q.events)
  }

  const start = () => {
    setNow(Date.now())
    setSession({ queue: upcoming, index: 0, correct: 0, answered: 0, retried: [] })
    show(upcoming[0])
  }

  const choose = (i: number) => {
    if (!question || !session || !cardId || picked !== null) return
    setPicked(i)
    const ok = i === question.answer
    recordCard(cardId, ok)
    const retry = !ok && !session.retried.includes(cardId)
    setSession({
      ...session,
      correct: session.correct + (ok ? 1 : 0),
      answered: session.answered + 1,
      queue: retry ? [...session.queue, cardId] : session.queue,
      retried: retry ? [...session.retried, cardId] : session.retried,
    })
  }

  const next = () => {
    if (!session) return
    if (session.index + 1 >= session.queue.length) {
      setSession({ ...session, index: session.queue.length })
      setNow(Date.now())
    } else {
      setSession({ ...session, index: session.index + 1 })
      show(session.queue[session.index + 1])
    }
  }

  const toggleDeck = (d: DeckId) => setDecks(decks.includes(d) ? decks.filter((x) => x !== d) : [...decks, d])

  const finished = session && session.index >= session.queue.length

  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t('review.title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">{t('review.intro')}</p>
      </header>

      {!session && (
        <section className="space-y-4">
          <fieldset className="space-y-2 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <legend className="px-1 text-sm font-semibold">{t('review.decks')}</legend>
            {DECKS.map((d) => {
              const s = deckStats(srs, d.id, now)
              return (
                <label key={d.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <input type="checkbox" checked={decks.includes(d.id)} onChange={() => toggleDeck(d.id)} className="accent-rose-500" />
                  <span className="font-medium">
                    {d.ear && '🎧 '}
                    {t(`review.deck.${d.id}`)}
                  </span>
                  <span className="text-xs text-stone-500">{t('review.stats', s)}</span>
                </label>
              )
            })}
          </fieldset>
          {upcoming.length ? (
            <button type="button" onClick={start} className={buttonClass.primary}>
              {t('review.start', { n: upcoming.length })}
            </button>
          ) : (
            <p className="text-stone-600 dark:text-stone-400">{t('review.nothing')}</p>
          )}
        </section>
      )}

      {session && !finished && question && (
        <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs text-stone-500">{t('review.progress', { i: session.index + 1, n: session.queue.length })}</p>
          <p className="text-lg font-medium">{t(question.prompt, question.params)}</p>
          {question.events && (
            <button type="button" onClick={() => void play(question.events!)} className={buttonClass.secondary}>
              {t('ex.replay')}
            </button>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options.map((o, i) => {
              const state = picked === null ? 'idle' : i === question.answer ? 'correct' : i === picked ? 'wrong' : 'idle'
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => choose(i)}
                  disabled={picked !== null}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${
                    state === 'correct' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' : state === 'wrong' ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40' : 'border-stone-300 hover:border-violet-400 disabled:opacity-60 dark:border-stone-700'
                  }`}
                >
                  {o}
                </button>
              )
            })}
          </div>
          {picked !== null && (
            <>
              <Feedback correct={picked === question.answer}>{picked === question.answer ? t('ex.right') : t('ex.wasActually', { answer: question.options[question.answer] })}</Feedback>
              <button type="button" onClick={next} className={buttonClass.primary}>
                {t('ex.next')}
              </button>
            </>
          )}
        </section>
      )}

      {finished && (
        <section className="space-y-3">
          <p role="status" className="text-lg font-medium">
            {t('review.done', { correct: session.correct, total: session.answered })}
          </p>
          <button type="button" onClick={() => setSession(null)} className={buttonClass.secondary}>
            {t('review.back')}
          </button>
        </section>
      )}
    </div>
  )
}

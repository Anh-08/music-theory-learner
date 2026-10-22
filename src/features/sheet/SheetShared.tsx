import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { playScore, scorePlayerStore, stopScore, useScorePlayer } from '../../audio/scorePlayer'
import { ScoreView } from '../../components/Score/ScoreView'
import { useT } from '../../i18n/useT'
import { useSettings } from '../../store/settingsContext'
import type { Score } from '../../theory/score'
import { decodeScore } from './share'
import { newSheetId, saveSheet } from './sheetStore'
import { btn, btnPrimary, card } from './ui'

/** `#/sheet/shared?d=…` — a read-only score from a share link, with a button to keep a copy. */
export function SheetShared() {
  const { t } = useT()
  const { instrument } = useSettings()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const code = params.get('d') ?? ''
  const [result, setResult] = useState<{ code: string; score: Score | null } | null>(null)
  const player = useScorePlayer()

  useEffect(() => {
    let alive = true
    void decodeScore(code, 'shared').then((score) => alive && setResult({ code, score }))
    return () => {
      alive = false
    }
  }, [code])
  useEffect(() => () => void (scorePlayerStore.get().playing && stopScore()), [])

  const score = result?.code === code ? result.score : undefined
  if (score === undefined) return <p className="py-10 text-center text-stone-500">{t('sheet.loading')}</p>
  if (score === null) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p>{t('sheet.sharedBad')}</p>
        <Link to="/sheet" className="text-rose-600 underline">
          {t('sheet.back')}
        </Link>
      </div>
    )
  }

  const save = () => {
    const id = newSheetId()
    saveSheet({ ...score, id })
    navigate(`/sheet/${id}`)
  }

  return (
    <div className="space-y-4">
      <Link to="/sheet" className="text-sm text-stone-500 hover:text-rose-600 print:hidden">
        {t('sheet.back')}
      </Link>
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{t('sheet.shared')}</p>
        <h1 className="text-2xl font-bold">{score.title || t('sheet.untitled')}</h1>
        <p className="text-sm text-stone-500 print:hidden">{t('sheet.sharedReadOnly')}</p>
      </header>
      <div className="flex flex-wrap gap-2 print:hidden">
        <button type="button" className={btnPrimary} onClick={save}>
          {t('sheet.sharedSave')}
        </button>
        {player.playing ? (
          <button type="button" className={btn} onClick={() => void stopScore()}>
            {t('sheet.stop')}
          </button>
        ) : (
          <button type="button" className={btn} onClick={() => void playScore(score, { instrument, countIn: true })}>
            {t('sheet.play')}
          </button>
        )}
      </div>
      <section className={`${card} !p-2 print:border-0 print:!p-0`}>
        <ScoreView score={score} view={instrument === 'piano' ? 'staff' : 'both'} playing={player.playing ? player.current : null} />
      </section>
    </div>
  )
}

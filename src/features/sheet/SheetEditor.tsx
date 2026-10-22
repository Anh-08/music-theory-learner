import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router'
import { playScore, scorePlayerStore, stopScore, useScorePlayer } from '../../audio/scorePlayer'
import { Fretboard } from '../../components/Fretboard/Fretboard'
import { Piano } from '../../components/Piano/Piano'
import { ScoreView } from '../../components/Score/ScoreView'
import { useT } from '../../i18n/useT'
import { useLiveInput, useLiveNote } from '../../input/useLiveInput'
import { useSettings } from '../../store/settingsContext'
import { usePersistentState } from '../../store/usePersistentState'
import { displayNote } from '../../theory/notes'
import { Note } from 'tonal'
import { fretOf, midiAt, scoreKey, scoreTuning, spellMidi, type Score } from '../../theory/score'
import { analyzeScore } from '../../theory/scoreAnalysis'
import { getEvent, refsInRange } from '../../theory/scoreEdit'
import type { ScoreViewMode } from '../../theory/scoreLayout'
import { AnalysisBar } from './AnalysisBar'
import { MetaBar, Toolbar } from './EditorPanels'
import { ExportMenu } from './ExportMenu'
import { PlaybackBar } from './PlaybackBar'
import { editorReducer, initEditor, keyToAction, liveJoinsChord } from './editorState'
import { lastSaveFailed, loadSheet, saveSheet, storageUsage, subscribeSheets } from './sheetStore'
import { DEFAULT_ANALYSIS, DEFAULT_PLAYBACK, ROLE_CLASS, card, type AnalysisSettings, type PlaybackSettings } from './ui'

/** `#/sheet/:id` — the editor for one saved score. */
export function SheetEditor() {
  const { id } = useParams()
  const { t } = useT()
  const initial = useMemo(() => (id ? loadSheet(id) : null), [id])
  if (!initial) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p>{t('sheet.notFound')}</p>
        <Link to="/sheet" className="text-rose-600 underline">
          {t('sheet.back')}
        </Link>
      </div>
    )
  }
  return <Editor key={initial.id} initial={initial} />
}

const FRETS = 17

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable)
}

function Editor({ initial }: { initial: Score }) {
  const { t } = useT()
  const { instrument } = useSettings()
  const [state, dispatch] = useReducer(editorReducer, initial, initEditor)
  const score = state.history.present
  const [view, setView] = usePersistentState<ScoreViewMode>('sheet:view', instrument === 'piano' ? 'staff' : 'both')
  const [chordMode, setChordMode] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const shift = useRef(false)
  const player = useScorePlayer()
  const [playback, setPlayback] = usePersistentState<PlaybackSettings>('sheet:playback', DEFAULT_PLAYBACK)
  const [analysis, setAnalysis] = usePersistentState<AnalysisSettings>('sheet:analysis', DEFAULT_ANALYSIS)
  const info = useMemo(() => analyzeScore(score, analysis.mode, analysis.scale), [score, analysis.mode, analysis.scale])
  const labels = useMemo(
    () =>
      analysis.mode === 'off' && !analysis.colors
        ? undefined
        : info.map((x) => ({ measure: x.ref.measure, event: x.ref.event, text: x.label || '●', className: analysis.colors ? ROLE_CLASS[x.role] : undefined })),
    [info, analysis.mode, analysis.colors],
  )

  const play = (fromCursor: boolean) => {
    const a = state.anchor
    const bars: [number, number] | undefined = playback.loop && a ? [Math.min(a.measure, state.cursor.measure), Math.max(a.measure, state.cursor.measure)] : undefined
    void playScore(score, {
      instrument,
      speed: playback.speed / 100,
      from: fromCursor && !bars ? state.cursor : undefined,
      bars,
      loop: playback.loop,
      countIn: playback.countIn,
      metronome: playback.metronome,
      owner: 'editor',
    })
  }

  // Notes played on a connected MIDI keyboard or picked up by the mic are entered at the cursor
  // (not while the score plays, so the mic does not hear the speakers).
  const live = useLiveInput()
  const [liveEntry, setLiveEntry] = usePersistentState('sheet:liveEntry', true)
  const lastLive = useRef(0)
  useLiveNote(
    (m) => {
      const now = performance.now()
      const chord = liveJoinsChord(live.source, now - lastLive.current, chordMode)
      lastLive.current = now
      dispatch({ type: 'insertMidi', midi: m, chord })
    },
    live.status === 'on' && liveEntry && !player.playing,
  )

  // Leaving the editor stops the music.
  useEffect(() => () => void (scorePlayerStore.get().playing && stopScore()), [])

  // Autosave every change (scores are small); an untouched score keeps its "last edited" date.
  useEffect(() => {
    if (score !== initial) saveSheet(score)
  }, [score, initial])
  const saveFailed = useSyncExternalStore(subscribeSheets, lastSaveFailed)
  const [usage] = useState(storageUsage)

  // Remember whether Shift was held for clicks on the instrument (its callbacks only get the note).
  useEffect(() => {
    const track = (e: PointerEvent) => (shift.current = e.shiftKey)
    window.addEventListener('pointerdown', track, true)
    return () => window.removeEventListener('pointerdown', track, true)
  }, [])

  useEffect(() => box.current?.focus({ preventScroll: true }), [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isTyping(e.target)) return
    if (e.key === ' ') {
      e.preventDefault()
      if (player.playing) void stopScore()
      else play(true)
      return
    }
    const action = keyToAction(e, performance.now())
    if (!action) return
    e.preventDefault()
    dispatch(action)
  }

  const tuning = scoreTuning(score)
  const key = scoreKey(score)
  const event = getEvent(score, state.cursor)
  // While playing, the instrument shows the notes being played; otherwise the notes under the cursor.
  const shown = player.playing && player.current ? getEvent(score, player.current) : event
  const marks = (shown?.notes ?? []).flatMap((n) => {
    const fret = fretOf(score, n)
    if (!Number.isFinite(fret)) return []
    return [{ string: n.string, fret: fret + score.capo, highlight: { label: displayNote(Note.pitchClass(spellMidi(n.midi, key))), isRoot: false } }]
  })
  const selection = state.anchor ? refsInRange(score, state.anchor, state.cursor) : undefined
  const addToChord = () => shift.current || chordMode

  return (
    <div className="space-y-4 outline-none" ref={box} tabIndex={-1} onKeyDown={onKeyDown}>
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link to="/sheet" className="text-sm text-stone-500 hover:text-rose-600">
          {t('sheet.back')}
        </Link>
        <ExportMenu score={score} />
      </div>

      <MetaBar score={score} view={view} onView={setView} dispatch={dispatch} />

      {saveFailed && <p className="rounded-lg print:hidden bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{t('sheet.saveFailed')}</p>}
      {!saveFailed && usage > 0.8 && <p className="text-sm text-amber-700 print:hidden dark:text-amber-400">{t('sheet.storageHigh', { pct: Math.round(usage * 100) })}</p>}

      <div className={`${card} z-10 space-y-3 !p-3 shadow-sm print:hidden md:sticky md:top-0`}>
        <PlaybackBar playing={player.playing} countingIn={player.countIn} settings={playback} onSettings={setPlayback} onPlay={play} onStop={() => void stopScore()} />
        <hr className="border-stone-200 dark:border-stone-800" />
        <Toolbar state={state} dispatch={dispatch} chordMode={chordMode} onChordMode={setChordMode} />
      </div>

      <section className={`${card} !p-3 print:hidden`} aria-label={t('sheet.analysis')}>
        <AnalysisBar score={score} info={info} settings={analysis} onSettings={setAnalysis} />
      </section>

      <section className={`${card} !p-2 print:border-0 print:!p-0`} aria-label={t('sheet.scoreAria')}>
        <ScoreView
          score={score}
          view={view}
          cursor={state.cursor}
          selection={selection}
          playing={player.playing ? player.current : null}
          labels={labels}
          onPick={(hit, e) => {
            dispatch({ type: 'pick', hit, extend: e.shiftKey })
            box.current?.focus({ preventScroll: true })
          }}
        />
      </section>

      <section className={`${card} space-y-2 !p-3 print:hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-stone-500">{instrument === 'piano' ? t('sheet.instrumentHintPiano') : t('sheet.instrumentHint')}</p>
          {live.status === 'on' ? (
            <label className="flex items-center gap-1.5 text-sm" title={t('sheet.liveHint')}>
              <input type="checkbox" checked={liveEntry} onChange={(e) => setLiveEntry(e.target.checked)} />
              {t(live.source === 'midi' ? 'sheet.liveMidi' : 'sheet.liveMic')}
            </label>
          ) : (
            <Link to="/connect" className="text-sm text-rose-600 hover:underline">
              {t('sheet.liveConnect')}
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          {instrument === 'piano' ? (
            <Piano startMidi={40} endMidi={84} highlights={new Map()} activeMidis={new Set(shown?.notes.map((n) => n.midi))} onKeyClick={(m) => dispatch({ type: 'insertMidi', midi: m, chord: addToChord() })} />
          ) : (
            <Fretboard
              tuning={tuning}
              fretCount={FRETS}
              highlights={new Map()}
              marks={marks}
              activePositions={player.playing ? marks : undefined}
              onNoteClick={(p) => {
                // Frets are counted from the nut on the drawn neck; below the capo nothing sounds, open = capo.
                const fret = p.fret === 0 ? score.capo : p.fret
                if (fret < score.capo) return
                const note = { midi: midiAt(score, p.string, fret - score.capo), string: p.string }
                dispatch(addToChord() ? { type: 'addToChord', note } : { type: 'insert', notes: [note] })
                box.current?.focus({ preventScroll: true })
              }}
            />
          )}
        </div>
        <p className="text-xs text-stone-500 sm:hidden">{t('sheet.phoneHint')}</p>
      </section>

      <details className={`${card} !p-3 text-sm print:hidden`}>
        <summary className="cursor-pointer font-medium">{t('sheet.shortcuts')}</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-stone-600 dark:text-stone-400">
          {(['play', 'move', 'string', 'fret', 'duration', 'tech', 'edit'] as const).map((k) => (
            <li key={k}>{t(`sheet.sc.${k}`)}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}

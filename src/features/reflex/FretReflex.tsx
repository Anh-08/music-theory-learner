import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { startNoteMetronome, stopNoteMetronome, useNoteMetronome } from '../../audio/noteReflex'
import { playNote } from '../../audio/player'
import { FretHeatMap } from '../../components/Fretboard/FretHeatMap'
import { Fretboard } from '../../components/Fretboard/Fretboard'
import { MiniFretboard } from '../../components/Fretboard/MiniFretboard'
import { Segmented } from '../../components/ui/Segmented'
import { Select } from '../../components/ui/Select'
import type { MessageKey } from '../../i18n/messages'
import { useT } from '../../i18n/useT'
import { useLiveInput, useLiveNote } from '../../input/useLiveInput'
import { useProgress } from '../../store/progressContext'
import { usePersistentState } from '../../store/usePersistentState'
import {
  FIND_ALL_FRETS,
  NECK_FRETS,
  TUNINGS,
  checkPitch,
  checkPosition,
  chromaOfMidi,
  displayNote,
  isComplete,
  octaveLabel,
  pickTarget,
  positionKey,
  positionMidi,
  rootLabel,
  samePosition,
  tuning as getTuning,
  weaknessWeight,
  type FretMode,
  type FretPosition,
  type FretTarget,
  type FretZone,
  type Highlight,
  type StringFret,
} from '../../theory'
import {
  DEFAULT_FRET_REFLEX,
  SECONDS_OPTIONS,
  blindSpots,
  emptyStats,
  fitStrings,
  heat,
  recordAttempt,
  recordId,
  roundLimitMs,
  slowMs,
  stringNumbers,
  summarize,
  targetOptions,
  type FretReflexSettings,
  type SessionStats,
  type SessionSummary,
} from './fretReflexModel'

export interface FretReflexProps {
  /** Reflex page: settings are saved. In lessons: separate settings, tucked away under "Options". */
  page?: boolean
  /** Lesson exercise id: the best streak is saved to progress. */
  id?: string
  mode?: FretMode
  level?: 1 | 2
  zone?: FretZone
  /** Strings, e.g. "6 5"; in one-string mode the first one is practised. */
  strings?: string
  advanced?: boolean
  naturalsOnly?: boolean
  rounds?: 10 | 20 | 40
  seconds?: number
}

interface Round {
  target: FretTarget
  index: number
  found: FretPosition[]
  misses: StringFret[]
  startedAt: number
  lastAt: number
  result: 'right' | 'wrong' | 'timeout' | null
}

interface Game {
  settings: FretReflexSettings
  round: Round | null
  stats: SessionStats
  /** Metronome pace: beats since the round started, and how many it lasts. */
  beat: number
  beats: number
  streak: number
}

/** Wall-clock time; only called from event handlers and timers. */
const clock = () => Date.now()

const RIGHT_PAUSE = 700
const WRONG_PAUSE = 1600

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-rose-500" />
      {children}
    </label>
  )
}

function propsSettings(p: FretReflexProps): Partial<FretReflexSettings> {
  const strings = p.strings?.trim().split(/\s+/).map(Number).filter(Number.isInteger)
  return {
    ...(p.mode ? { mode: p.mode } : {}),
    ...(p.level ? { level: p.level } : {}),
    ...(p.zone !== undefined ? { zone: p.zone } : {}),
    ...(strings?.length ? { strings, string: strings[0] } : {}),
    ...(p.advanced !== undefined ? { advanced: p.advanced } : {}),
    ...(p.naturalsOnly !== undefined ? { naturalsOnly: p.naturalsOnly } : {}),
    ...(p.rounds ? { rounds: p.rounds } : {}),
    ...(p.seconds ? { seconds: p.seconds } : {}),
  }
}

export function FretReflex(props: FretReflexProps) {
  const { page = false, id: exerciseId } = props
  const ownerId = useId()
  const { t, locale } = useT()
  const { progress, recordCard, recordBest, recordDrill } = useProgress()
  const live = useLiveInput()
  const metronome = useNoteMetronome()

  const initial: FretReflexSettings = { ...DEFAULT_FRET_REFLEX, ...propsSettings(props) }
  const [saved, setSaved] = usePersistentState<FretReflexSettings>('reflex.notes', initial)
  const [local, setLocal] = useState<FretReflexSettings>(initial)
  // Older saved settings may lack new keys: merge with the defaults.
  const settings: FretReflexSettings = useMemo(() => (page ? { ...DEFAULT_FRET_REFLEX, ...saved } : local), [page, saved, local])
  const setSettings = page ? setSaved : setLocal
  const tuning = getTuning(TUNINGS.some((x) => x.id === settings.tuning) ? settings.tuning : 'standard')
  const { strings: enabledStrings, string: oneString } = fitStrings(settings, tuning)

  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [summary, setSummary] = useState<{ stats: SessionStats; result: SessionSummary; prev?: { perMinute: number; avgMs: number } } | null>(null)
  // What is on screen: a copy of the game's current round (the game itself lives in a ref, driven by timers).
  const [round, setRound] = useState<Round | null>(null)
  const game = useRef<Game | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Callbacks run from timers and the metronome: always read the latest progress.
  const progressRef = useRef(progress)
  useEffect(() => {
    progressRef.current = progress
  })

  const sync = () => {
    const r = game.current?.round
    setRound(r ? { ...r } : null)
  }

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const sound = (midi: number) => {
    if (game.current?.settings.sound) void playNote('guitar', midi, 0.8)
  }

  const finish = () => {
    const g = game.current
    clearTimer()
    void stopNoteMetronome(ownerId)
    if (!g) return
    game.current = null
    setRound(null)
    const result = summarize(g.stats, clock())
    const rid = recordId(g.settings)
    const prev = progressRef.current.records?.[rid]
    if (result.correct > 0) recordBest(rid, { perMinute: result.perMinute, avgMs: result.avgMs })
    setSummary({ stats: g.stats, result, prev })
    setPhase(g.stats.answered > 0 ? 'done' : 'idle')
  }

  const newRound = (index: number) => {
    const g = game.current
    if (!g) return
    clearTimer()
    if (index >= g.settings.rounds) return finish()
    const now = clock()
    const srs = progressRef.current.srs ?? {}
    const target = pickTarget(targetOptions(g.settings, tuning, index), {
      weight: (p) => weaknessWeight(srs[positionKey(p)], now),
      avoid: g.round?.target,
    })
    g.round = { target, index, found: [], misses: [], startedAt: now, lastAt: now, result: null }
    g.beat = 0
    g.beats = g.settings.beatsPerNote * target.answers.length
    if (g.settings.pace === 'timer') timer.current = setTimeout(timeUp, roundLimitMs(g.settings, target.answers.length))
    sync()
  }

  /** Ends the round; in timer pace the next note comes after a short pause, in metronome pace on the next beat group. */
  const resolve = (result: 'right' | 'wrong' | 'timeout') => {
    const g = game.current
    if (!g?.round) return
    clearTimer()
    g.round.result = result
    if (g.settings.pace === 'timer') {
      const next = g.round.index + 1
      timer.current = setTimeout(() => newRound(next), result === 'right' ? RIGHT_PAUSE : WRONG_PAUSE)
    }
    sync()
  }

  const score = (p: StringFret, correct: boolean, ms: number) => {
    const g = game.current
    if (!g) return
    g.stats = recordAttempt(g.stats, p, correct, ms)
    recordCard(positionKey(p), correct && ms <= slowMs(g.settings))
    g.streak = correct ? g.streak + 1 : 0
    if (exerciseId) recordDrill(exerciseId, g.streak, correct)
  }

  function timeUp() {
    const g = game.current
    if (!g?.round || g.round.result) return
    const limit = roundLimitMs(g.settings, 1)
    for (const a of g.round.target.answers) if (!g.round.found.some((f) => samePosition(f, a))) score(a, false, limit)
    sound(g.round.target.answers[0].midi)
    resolve('timeout')
  }

  /** Positions found (by click or by ear); `missed` is the wrong position clicked, if any. */
  const answer = (hits: FretPosition[], missed: StringFret | null) => {
    const g = game.current
    const r = g?.round
    if (!g || !r || r.result) return
    const now = clock()
    if (hits.length) {
      for (const h of hits) score(h, true, now - r.lastAt)
      r.found = [...r.found, ...hits]
      r.lastAt = now
      sound(hits[0].midi)
      if (isComplete(r.target, r.found)) return resolve('right')
      return sync()
    }
    if (!missed) return
    r.misses = [...r.misses, missed]
    if (r.target.answers.length === 1) {
      score(r.target.answers[0], false, now - r.startedAt)
      sound(r.target.answers[0].midi)
      return resolve('wrong')
    }
    sync()
  }

  const onClick = (p: FretPosition) => {
    const r = game.current?.round
    if (!r || r.result) return
    const res = checkPosition(r.target, r.found, p)
    if (res === 'hit') answer([p], null)
    else if (res === 'miss') answer([], p)
  }

  // A real instrument: the pitch is known but not the string.
  useLiveNote(
    (midi) => {
      const r = game.current?.round
      if (!r || r.result) return
      const { result, positions } = checkPitch(r.target, r.found, midi)
      if (result === 'hit') answer(positions, null)
      else if (result === 'miss') answer([], { string: r.target.string ?? 0, fret: -1 })
    },
    live.status === 'on' && phase === 'running',
  )

  const onBeat = (b: number) => {
    const g = game.current
    if (!g || b < 0) return
    if (!g.round) return newRound(0)
    g.beat++
    if (g.beat < g.beats) return
    if (!g.round.result) {
      timeUp()
      // Show the answer for one more beat group before the next note.
      g.beats += g.settings.beatsPerNote
      return
    }
    newRound(g.round.index + 1)
  }
  const onBeatRef = useRef(onBeat)
  useEffect(() => {
    onBeatRef.current = onBeat
  })

  const start = () => {
    clearTimer()
    game.current = { settings, round: null, stats: emptyStats(clock()), beat: 0, beats: 0, streak: 0 }
    setSummary(null)
    setPhase('running')
    if (settings.pace === 'metronome') void startNoteMetronome({ ownerId, tempo: settings.tempo, beatsPerBar: 4, onBeat: (b) => onBeatRef.current(b) })
    else newRound(0)
  }

  const stop = () => finish()

  // Leaving the page (or the lesson) ends the session.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
      void stopNoteMetronome(ownerId)
    },
    [ownerId],
  )
  // Another player took the Transport (metronome pace): end the session.
  useEffect(() => {
    if (phase === 'running' && settings.pace === 'metronome' && game.current?.round && metronome.ownerId !== ownerId) finish()
  })

  const update = (patch: Partial<FretReflexSettings>) => {
    if (phase === 'running') finish()
    const next = { ...settings, ...patch }
    if (patch.advanced === false && next.mode === 'pitch') next.mode = 'noteString'
    setSettings(next)
  }

  const target = round?.target
  const multi = !!target && target.answers.length > 1
  const fretCount = settings.mode === 'findAll' || (settings.mode === 'box' && settings.boxStart + 4 <= FIND_ALL_FRETS) ? FIND_ALL_FRETS : NECK_FRETS

  const marks = (() => {
    if (!round) return []
    const name = displayNote(round.target.name)
    const list: { string: number; fret: number; highlight: Highlight }[] = round.found.map((p) => ({ string: p.string, fret: p.fret, highlight: { label: name, isRoot: false, color: 'correct' } }))
    // Wrong clicks show the note actually played (a wrong pitch heard by the mic has no position).
    for (const m of round.misses.filter((x) => x.fret >= 0)) list.push({ string: m.string, fret: m.fret, highlight: { label: rootLabel(chromaOfMidi(positionMidi(tuning, m))).split(' / ')[0], isRoot: false, color: 'wrong' } })
    if (round.result && round.result !== 'right') {
      for (const a of round.target.answers) if (!round.found.some((f) => samePosition(f, a))) list.push({ string: a.string, fret: a.fret, highlight: { label: name, isRoot: false, color: 'question' } })
    }
    return list
  })()

  const promptName = target ? (target.midi !== null ? octaveLabel(target.midi, target.name, locale) : displayNote(target.name)) : ''
  const where = (() => {
    if (!target) return ''
    const [from, to] = target.frets
    if (target.mode === 'findAll') return t('noteReflex.promptFindAll', { from, to })
    if (target.mode === 'pitch') return t('noteReflex.promptPitch')
    if (target.mode === 'box') return t('noteReflex.promptBox', { from, to })
    return settings.advanced ? t('noteReflex.promptString', { n: target.string ?? 0 }) : t('noteReflex.promptStringZone', { n: target.string ?? 0, from, to })
  })()
  const counting = phase === 'running' && settings.pace === 'metronome' && !round && metronome.countIn > 0

  const modeOptions: { value: FretMode; label: string }[] = [
    { value: 'string', label: t('noteReflex.modeString') },
    { value: 'noteString', label: t('noteReflex.modeNoteString') },
    { value: 'findAll', label: t('noteReflex.modeFindAll') },
    { value: 'box', label: t('noteReflex.modeBox') },
    ...(settings.advanced ? [{ value: 'pitch' as const, label: t('noteReflex.modePitch') }] : []),
  ]
  const single = settings.mode === 'string' || settings.mode === 'noteString'
  const lastFret = NECK_FRETS

  const controls = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <Segmented label={t('noteReflex.mode')} value={settings.mode} onChange={(v) => update({ mode: v })} options={modeOptions} />
        {single && !settings.advanced && (
          <Segmented
            label={t('noteReflex.level')}
            value={String(settings.level) as '1' | '2'}
            onChange={(v) => update({ level: Number(v) as 1 | 2 })}
            options={[
              { value: '1', label: t('noteReflex.level1') },
              { value: '2', label: t('noteReflex.level2') },
            ]}
          />
        )}
        {single && !settings.advanced && settings.level === 1 && (
          <Segmented
            label={t('noteReflex.zone')}
            value={String(settings.zone) as '0' | '1'}
            onChange={(v) => update({ zone: Number(v) as FretZone })}
            options={[
              { value: '0', label: t('noteReflex.zoneN', { from: 0, to: 11 }) },
              { value: '1', label: t('noteReflex.zoneN', { from: 12, to: lastFret }) },
            ]}
          />
        )}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        {settings.mode === 'string' ? (
          <>
            <div className="w-32">
              <Select label={t('noteReflex.string')} value={String(oneString)} onChange={(v) => update({ string: Number(v) })} options={stringNumbers(tuning).map((n) => ({ value: String(n), label: t('noteReflex.stringN', { n }) }))} />
            </div>
            <div className="w-48">
              <Select
                label={t('noteReflex.rotate')}
                value={String(settings.rotateEvery)}
                onChange={(v) => update({ rotateEvery: Number(v) as 0 | 4 | 8 })}
                options={[
                  { value: '0', label: t('noteReflex.rotateNever') },
                  { value: '4', label: t('noteReflex.rotateN', { n: 4 }) },
                  { value: '8', label: t('noteReflex.rotateN', { n: 8 }) },
                ]}
              />
            </div>
          </>
        ) : null}
        {(settings.mode !== 'string' || settings.rotateEvery > 0) && (
          <fieldset>
            <legend className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">{t('noteReflex.strings')}</legend>
            <div className="flex gap-2">
              {stringNumbers(tuning).map((n) => (
                <label key={n} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    className="accent-rose-500"
                    aria-label={t('noteReflex.stringN', { n })}
                    checked={enabledStrings.includes(n)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...enabledStrings, n] : enabledStrings.filter((x) => x !== n)
                      if (next.length) update({ strings: next.sort((a, b) => a - b) })
                    }}
                  />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {settings.mode === 'box' && (
          <div className="w-36">
            <Select
              label={t('noteReflex.box')}
              value={String(settings.boxStart)}
              onChange={(v) => update({ boxStart: Number(v) })}
              options={Array.from({ length: 13 }, (_, i) => ({ value: String(i), label: t('noteReflex.zoneN', { from: i, to: i + 4 }) }))}
            />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('noteReflex.pace')}
          value={settings.pace}
          onChange={(v) => update({ pace: v })}
          options={[
            { value: 'timer', label: t('noteReflex.paceTimer') },
            { value: 'metronome', label: t('noteReflex.paceMetronome') },
          ]}
        />
        {settings.pace === 'timer' ? (
          <Segmented
            label={t('noteReflex.seconds')}
            value={String(settings.seconds)}
            onChange={(v) => update({ seconds: Number(v) })}
            options={SECONDS_OPTIONS.map((s) => ({ value: String(s), label: t('noteReflex.secondsN', { n: s.toLocaleString(locale) }) }))}
          />
        ) : (
          <>
            <Segmented
              label={t('noteReflex.beatsPerNote')}
              value={String(settings.beatsPerNote) as '1' | '2' | '4'}
              onChange={(v) => update({ beatsPerNote: Number(v) as 1 | 2 | 4 })}
              options={(['4', '2', '1'] as const).map((n) => ({ value: n, label: n }))}
            />
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">{t('jam.tempo', { bpm: settings.tempo })}</span>
              <input type="range" min={30} max={160} value={settings.tempo} onChange={(e) => update({ tempo: Number(e.target.value) })} aria-label={t('jam.tempoAria')} className="w-40 accent-rose-500" />
            </label>
          </>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Check checked={settings.advanced} onChange={(v) => update({ advanced: v })}>
          {t('noteReflex.advanced')}
        </Check>
        <Check checked={settings.naturalsOnly} onChange={(v) => update({ naturalsOnly: v })}>
          {t('noteReflex.naturalsOnly')}
        </Check>
        <Check checked={settings.sound} onChange={(v) => update({ sound: v })}>
          {t('noteReflex.sound')}
        </Check>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('noteReflex.rounds')}
          value={String(settings.rounds) as '10' | '20' | '40'}
          onChange={(v) => update({ rounds: Number(v) as 10 | 20 | 40 })}
          options={(['10', '20', '40'] as const).map((n) => ({ value: n, label: n }))}
        />
        <div className="w-64">
          <Select label={t('explorer.tuning')} value={tuning.id} onChange={(v) => update({ tuning: v })} options={TUNINGS.map((x) => ({ value: x.id, label: x.name[locale] }))} />
        </div>
      </div>
    </div>
  )

  const feedback = (() => {
    if (!round?.result) return null
    const answers = round.target.answers
    const at = (p: StringFret) => t('noteReflex.at', { string: p.string, fret: p.fret })
    if (round.result === 'right') return <p className="font-medium text-emerald-700 dark:text-emerald-300">{t('ex.right')}</p>
    const msg = round.result === 'timeout' ? 'noteReflex.timeout' : 'noteReflex.wrong'
    return (
      <p className="font-medium text-amber-700 dark:text-amber-300">
        {t(msg as MessageKey)} {answers.length === 1 ? t('noteReflex.wasAt', { where: at(answers[0]) }) : t('noteReflex.shownOnNeck')}
      </p>
    )
  })()

  const sessionId = exerciseId ? { 'data-exercise-id': exerciseId } : {}
  const best = exerciseId ? (progress.drills[exerciseId]?.best ?? 0) : 0

  return (
    <div {...sessionId} className="not-prose my-6 space-y-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={phase === 'running' ? stop : start} className="rounded-lg bg-rose-500 px-5 py-2 text-sm font-medium text-white hover:bg-rose-600">
          {phase === 'running' ? t('common.stop') : t('reflex.start')}
        </button>
        {round && (
          <span className="text-sm text-stone-500">
            {t('noteReflex.progress', { i: round.index + 1, n: settings.rounds })}
            {multi && ` · ${t('noteReflex.foundN', { found: round.found.length, total: round.target.answers.length })}`}
          </span>
        )}
        {exerciseId && best > 0 && <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{t('ex.record', { n: best })}</span>}
        {live.status === 'on' ? (
          <span className="text-xs text-stone-500">{t(live.source === 'mic' ? 'noteReflex.liveMic' : 'noteReflex.liveMidi')}</span>
        ) : (
          <Link to="/connect" className="text-xs text-rose-600 hover:underline">
            {t('noteReflex.connect')}
          </Link>
        )}
      </div>

      {phase === 'idle' && <p className="text-sm text-stone-600 dark:text-stone-400">{t('noteReflex.hint')}</p>}

      {(round || counting) && (
        <div className="relative flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:justify-center sm:gap-8 dark:border-rose-900 dark:bg-rose-950/30">
          {counting && (
            <div aria-live="polite" className="flex h-24 items-center">
              <span className="text-6xl font-bold text-rose-500">{metronome.countIn}</span>
              <span className="sr-only">{t('reflex.countIn')}</span>
            </div>
          )}
          {target && (
            <>
              <div className="text-center">
                <div aria-label={t('noteReflex.targetAria')} className="text-5xl font-bold tracking-tight sm:text-6xl">
                  {promptName}
                </div>
                <div className="mt-1 text-sm text-stone-600 dark:text-stone-300">{where}</div>
              </div>
              {!settings.advanced && <MiniFretboard stringCount={tuning.strings.length} strings={target.strings} frets={target.frets} fretCount={NECK_FRETS} />}
            </>
          )}
          {target && settings.pace === 'timer' && !round?.result && (
            <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-xl">
              <div
                key={`${round?.index}`}
                className="h-full origin-left bg-rose-500"
                style={{ animation: `fret-timer ${roundLimitMs(settings, target.answers.length)}ms linear forwards` }}
              />
            </div>
          )}
        </div>
      )}
      <div aria-live="polite" className="min-h-6 text-center text-sm">
        {feedback}
      </div>

      {phase !== 'done' && (
        <div className="overflow-x-auto">
          <Fretboard tuning={tuning} fretCount={fretCount} highlights={new Map()} marks={marks} onNoteClick={onClick} />
        </div>
      )}

      {phase === 'done' && summary && <SessionReport summary={summary} tuningStrings={tuning.strings.length} limitMs={roundLimitMs(settings, 1)} fretCount={fretCount} />}

      {page ? (
        <section className="rounded-lg bg-stone-50 p-3 dark:bg-stone-800/50">
          <h2 className="mb-3 text-sm font-medium">{t('noteReflex.settings')}</h2>
          {controls}
        </section>
      ) : (
        <details className="rounded-lg bg-stone-50 p-3 dark:bg-stone-800/50">
          <summary className="cursor-pointer text-sm font-medium">{t('noteReflex.settings')}</summary>
          <div className="mt-3">{controls}</div>
        </details>
      )}

      {!page && (
        <Link to="/reflex/notes" className="inline-block text-sm text-rose-600 hover:underline">
          {t('noteReflex.open')}
        </Link>
      )}
    </div>
  )
}

function SessionReport({
  summary,
  tuningStrings,
  limitMs,
  fretCount,
}: {
  summary: { stats: SessionStats; result: SessionSummary; prev?: { perMinute: number; avgMs: number } }
  tuningStrings: number
  limitMs: number
  fretCount: number
}) {
  const { t, locale } = useT()
  const { stats, result, prev } = summary
  const seconds = (ms: number) => (ms / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })
  const newSpeed = result.correct > 0 && (!prev || result.perMinute > prev.perMinute)
  const newReaction = result.correct > 0 && (!prev || result.avgMs < prev.avgMs)
  const spots = blindSpots(stats, limitMs)
  const maxFret = Math.max(fretCount, ...Object.values(stats.cells).map((c) => c.fret))
  return (
    <section aria-label={t('noteReflex.report')} className="space-y-3 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
      <h3 className="font-semibold">{t('noteReflex.report')}</h3>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-stone-500">{t('noteReflex.statCorrect')}</dt>
          <dd className="text-2xl font-bold">
            {result.correct}/{result.answered}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">{t('noteReflex.statPerMinute')}</dt>
          <dd className="text-2xl font-bold">
            {result.perMinute.toLocaleString(locale)} {newSpeed && <span className="align-middle text-xs font-medium text-emerald-600">{t('noteReflex.newRecord')}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">{t('noteReflex.statReaction')}</dt>
          <dd className="text-2xl font-bold">
            {result.avgMs ? t('noteReflex.secondsN', { n: seconds(result.avgMs) }) : '—'}{' '}
            {newReaction && <span className="align-middle text-xs font-medium text-emerald-600">{t('noteReflex.newRecord')}</span>}
          </dd>
        </div>
      </dl>
      {prev && (
        <p className="text-xs text-stone-500">
          {t('noteReflex.previousBest', { perMinute: prev.perMinute.toLocaleString(locale), reaction: seconds(prev.avgMs) })}
        </p>
      )}
      <div>
        <h4 className="mb-1 text-sm font-medium">{t('noteReflex.heatTitle')}</h4>
        <div className="overflow-x-auto">
          <FretHeatMap stringCount={tuningStrings} fretCount={maxFret} cells={Object.values(stats.cells).map((c) => ({ string: c.string, fret: c.fret, value: heat(c, limitMs) }))} />
        </div>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          {spots.length ? t('noteReflex.blindSpots', { list: spots.map((c) => t('noteReflex.at', { string: c.string, fret: c.fret })).join('; ') }) : t('noteReflex.noBlindSpots')}
        </p>
      </div>
    </section>
  )
}

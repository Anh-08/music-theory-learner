import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { groove as getGroove } from '../../audio/grooves'
import { onRhythmHit, startJam, stopJam, updateJam } from '../../audio/jam'
import { scoreTiming, type TimingStats } from '../../audio/timing'
import { connectMic, onLiveOnset } from '../../input/liveInput'
import { useLiveInput } from '../../input/useLiveInput'
import type { JamTrack } from '../../audio/jamEvents'
import { useJamState } from '../../audio/jamStore'
import { RHYTHMS, formatStep, parsePattern, type Rhythm, type Step } from '../../audio/rhythms'
import { RhythmGrid } from '../../components/RhythmGrid/RhythmGrid'
import { InstrumentView } from '../../components/lesson/InstrumentView'
import { Select } from '../../components/ui/Select'
import { errorMessage } from '../../i18n/errors'
import type { MessageKey } from '../../i18n/messages'
import { useT } from '../../i18n/useT'
import { useSettings } from '../../store/settingsContext'
import { usePersistentState } from '../../store/usePersistentState'
import { chordShapes, intervalLabel, makeHighlights, parseProgression, type ChordShape, type ProgressionChord, type StringFret } from '../../theory'
import { ChordDiagram } from '../../components/ChordDiagram/ChordDiagram'
import { shapeCaption, shapeIntervalLabels } from '../../components/ChordDiagram/shapeLabels'
import { chordIndexAtBar, chordLabel } from '../jam/jamModel'
import { nextCustomId, timeSignature, toRhythm, type CustomRhythm } from './customRhythms'

export interface RhythmTrainerProps {
  rhythm?: string
  progression?: string
  tempo?: number
  /** Trang tập đệm: cho đổi điệu, sửa tiến trình và tự tạo điệu. Trong bài học: điệu cố định. */
  editable?: boolean
}

const TRACKS: { id: JamTrack; label: MessageKey }[] = [
  { id: 'chords', label: 'rhythm.guitar' },
  { id: 'drums', label: 'jam.drums' },
  { id: 'bass', label: 'jam.bass' },
  { id: 'click', label: 'jam.click' },
]

function tryParse(text: string): { chords: ProgressionChord[] | null; error: unknown } {
  try {
    return { chords: parseProgression(text), error: null }
  } catch (e) {
    return { chords: null, error: e }
  }
}

export function RhythmTrainer({ rhythm: initialRhythm = 'ballad', progression = 'C Am F G', tempo: initialTempo, editable = false }: RhythmTrainerProps) {
  const id = useId()
  const { t, locale } = useT()
  const { instrument } = useSettings()
  const jam = useJamState()
  const playing = jam.ownerId === id

  const [custom, setCustom] = usePersistentState<CustomRhythm[]>('rhythms.custom', [])
  const all = useMemo(() => [...RHYTHMS, ...custom.map(toRhythm)], [custom])
  const [rhythmId, setRhythmId] = useState(initialRhythm)
  const selected = all.find((r) => r.id === rhythmId) ?? RHYTHMS[0]
  const [draft, setDraft] = useState<{ steps: Step[]; name: string } | null>(null)
  const current: Rhythm = draft ? { ...selected, id: 'draft', pattern: draft.steps.map(formatStep).join(' ') } : selected
  const steps = useMemo(() => parsePattern(current.pattern), [current.pattern])

  const [text, setText] = useState(progression)
  const [tempo, setTempo] = useState(initialTempo ?? selected.defaultTempo)
  const [mutes, setMutes] = useState<Record<JamTrack, boolean>>({ drums: false, bass: false, chords: false, click: true })
  const [ramp, setRamp] = useState(false)
  const [selectedChord, setSelectedChord] = useState(0)
  const [timing, setTiming] = useState(false)
  const [stats, setStats] = useState<TimingStats | null>(null)
  const live = useLiveInput()

  const parsed = useMemo(() => tryParse(text), [text])
  const [lastChords, setLastChords] = useState<ProgressionChord[] | null>(parsed.chords)
  if (parsed.chords && parsed.chords !== lastChords) setLastChords(parsed.chords)
  const chords = parsed.chords ?? lastChords ?? []

  // Thế bấm đã chọn cho từng hợp âm (theo ký hiệu); mặc định là thế đầu tiên (thế quen thuộc).
  const [shapeIdx, setShapeIdx] = useState<Record<string, number>>({})
  const shapeFor = (c: ProgressionChord, idx = shapeIdx): ChordShape | undefined => {
    const list = chordShapes(c)
    return list[Math.min(idx[c.symbol] ?? 0, list.length - 1)]
  }
  const shapesMap = (cs: ProgressionChord[], idx = shapeIdx) =>
    Object.fromEntries(cs.flatMap((c) => {
      const sh = shapeFor(c, idx)
      return sh ? [[c.symbol, sh.frets]] : []
    }))

  const rampTarget = Math.min(200, tempo + 40)
  const play = (r: Rhythm, cs: ProgressionChord[], bpm = tempo, idx = shapeIdx) => {
    if (!cs.length) return
    void startJam({ ownerId: id, chords: cs, groove: getGroove(r.groove), tempo: bpm, instrument: 'guitar', mutes, rhythm: r, rampTo: ramp ? rampTarget : undefined, shapes: shapesMap(cs, idx) })
  }

  useEffect(() => {
    if (playing) void updateJam({ tempo, mutes })
  }, [tempo, mutes, playing])

  useEffect(() => {
    if (!playing) return
    return () => void stopJam(id)
  }, [playing, id])

  // Chấm nhịp: gom thời điểm các nhịp của điệu và các tiếng gảy nghe qua micro, chấm trên ~40 cú gần nhất.
  useEffect(() => {
    if (!timing || !playing || live.source !== 'mic' || live.status !== 'on') return
    const hits: number[] = []
    const onsets: number[] = []
    const recompute = () => setStats(scoreTiming(hits.slice(-48), onsets.slice(-40)))
    const offHit = onRhythmHit((tm) => hits.push(tm))
    const offOnset = onLiveOnset((tm) => {
      onsets.push(tm)
      recompute()
    })
    return () => {
      offHit()
      offOnset()
    }
  }, [timing, playing, live.source, live.status])

  const toggleTiming = (on: boolean) => {
    setTiming(on)
    setStats(null)
    if (!on) return
    setMutes((m) => ({ ...m, chords: true }))
    if (live.source !== 'mic' || live.status !== 'on') void connectMic()
  }

  const chooseRhythm = (rid: string) => {
    const r = all.find((x) => x.id === rid) ?? RHYTHMS[0]
    setRhythmId(rid)
    setDraft(null)
    setTempo(r.defaultTempo)
    if (playing) play(r, chords, r.defaultTempo)
  }

  const changeText = (next: string) => {
    setText(next)
    const p = tryParse(next)
    if (playing && p.chords) play(current, p.chords)
  }

  const editSteps = (next: Step[]) => {
    setDraft((d) => (d ? { ...d, steps: next } : d))
    if (playing) play({ ...current, pattern: next.map(formatStep).join(' ') }, chords)
  }

  const startEditing = () => setDraft({ steps, name: t('rhythm.customDefault', { n: custom.length + 1 }) })

  const save = () => {
    if (!draft) return
    const isCustom = custom.some((c) => c.id === selected.id)
    const entry: CustomRhythm = {
      id: isCustom ? selected.id : nextCustomId(custom),
      name: draft.name.trim() || t('rhythm.customDefault', { n: custom.length + 1 }),
      beatsPerBar: selected.beatsPerBar,
      stepsPerBeat: selected.stepsPerBeat,
      pattern: draft.steps.map(formatStep).join(' '),
      groove: selected.groove,
      defaultTempo: tempo,
    }
    setCustom(isCustom ? custom.map((c) => (c.id === entry.id ? entry : c)) : [...custom, entry])
    setRhythmId(entry.id)
    setDraft(null)
  }

  const remove = () => {
    setCustom(custom.filter((c) => c.id !== selected.id))
    chooseRhythm(RHYTHMS[0].id)
  }

  const currentIndex = playing ? chordIndexAtBar(chords, jam.bar) : Math.min(selectedChord, chords.length - 1)
  const currentChord = chords[currentIndex]
  const currentShapes = useMemo(() => (currentChord ? chordShapes(currentChord) : []), [currentChord])
  const currentShapeIndex = currentChord ? Math.min(shapeIdx[currentChord.symbol] ?? 0, Math.max(0, currentShapes.length - 1)) : 0
  const currentShape = currentShapes[currentShapeIndex]
  const shapePositions: StringFret[] = currentShape ? currentShape.frets.flatMap((f, i) => (f === null ? [] : [{ string: 6 - i, fret: f }])) : []

  const changeShape = (delta: number) => {
    if (!currentChord || currentShapes.length < 2) return
    const next = { ...shapeIdx, [currentChord.symbol]: (currentShapeIndex + delta + currentShapes.length) % currentShapes.length }
    setShapeIdx(next)
    if (playing) play(current, chords, tempo, next)
  }
  const highlights = useMemo(
    () => (currentChord ? makeHighlights(currentChord.notes, currentChord.intervals.map(intervalLabel), 'interval', locale) : new Map()),
    [currentChord, locale],
  )

  const label = (r: Rhythm) => `${r.name[locale]} (${timeSignature(r)})`
  const options = [
    ...RHYTHMS.filter((r) => r.kind === 'strum').map((r) => ({ value: r.id, label: label(r), group: t('rhythm.groupStrum') })),
    ...RHYTHMS.filter((r) => r.kind === 'pick').map((r) => ({ value: r.id, label: label(r), group: t('rhythm.groupPick') })),
    ...custom.map(toRhythm).map((r) => ({ value: r.id, label: label(r), group: t('rhythm.groupCustom') })),
  ]
  const isCustom = custom.some((c) => c.id === selected.id)
  const link = `/rhythm?${new URLSearchParams({ r: selected.id, p: text })}`

  return (
    <div className="not-prose my-6 space-y-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      {instrument === 'piano' && <p className="text-xs text-stone-500 italic">{t('rhythm.pianoNote')}</p>}

      {editable ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={t('rhythm.choose')} value={selected.id} onChange={chooseRhythm} options={options} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">{t('rhythm.progression')}</span>
            <input
              value={text}
              onChange={(e) => changeText(e.target.value)}
              spellCheck={false}
              aria-label={t('rhythm.progression')}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-mono text-sm dark:border-stone-700 dark:bg-stone-950"
            />
          </label>
        </div>
      ) : (
        <p className="font-semibold">
          {selected.name[locale]} <span className="text-sm font-normal text-stone-500">· {t('rhythm.timeSig', { sig: timeSignature(selected) })}</span>
        </p>
      )}
      {selected.description[locale] && <p className="text-sm text-stone-600 dark:text-stone-400">{selected.description[locale]}</p>}

      {parsed.error !== null && (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          {errorMessage(parsed.error, t)}
        </p>
      )}

      <RhythmGrid steps={steps} beatsPerBar={current.beatsPerBar} stepsPerBeat={current.stepsPerBeat} current={playing ? jam.step : -1} onChange={draft ? editSteps : undefined} />
      <p className="text-xs text-stone-500">{draft ? t('rhythm.editHint') : t('rhythm.legend')}</p>

      {editable && (
        <div className="flex flex-wrap items-end gap-2">
          {draft ? (
            <>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-stone-500">{t('rhythm.nameLabel')}</span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-950"
                />
              </label>
              <button type="button" onClick={save} className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700">
                {t('rhythm.save')}
              </button>
              <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700">
                {t('rhythm.cancel')}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={startEditing} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800">
                {t('rhythm.edit')}
              </button>
              {isCustom && (
                <button type="button" onClick={remove} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-rose-600 dark:border-stone-700">
                  {t('rhythm.delete')}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <ol aria-label={t('jam.chordsList')} className="flex flex-wrap gap-2">
        {chords.map((c, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setSelectedChord(i)}
              aria-current={i === currentIndex ? 'true' : undefined}
              className={`min-w-14 rounded-lg border px-3 py-1.5 font-semibold ${i === currentIndex ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60' : 'border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'}`}
            >
              {chordLabel(c)}
              {c.bars > 1 && <span className="ml-1 text-xs font-normal text-stone-400">×{c.bars}</span>}
            </button>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-end gap-4">
        <button type="button" onClick={() => (playing ? void stopJam(id) : play(current, chords))} className="rounded-lg bg-rose-500 px-5 py-2 text-sm font-medium text-white hover:bg-rose-600">
          {playing ? t('common.stop') : t('rhythm.play')}
        </button>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">{t('jam.tempo', { bpm: tempo })}</span>
          <input type="range" min={40} max={200} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} aria-label={t('jam.tempoAria')} className="w-40 accent-rose-500" />
        </label>
        <div role="group" aria-label={t('jam.tracks')} className="flex flex-wrap gap-1">
          {TRACKS.map((track) => (
            <button
              key={track.id}
              type="button"
              aria-pressed={!mutes[track.id]}
              onClick={() => setMutes((m) => ({ ...m, [track.id]: !m[track.id] }))}
              className={`rounded-md border px-2.5 py-1 text-xs ${mutes[track.id] ? 'border-stone-300 text-stone-400 line-through dark:border-stone-700' : 'border-stone-400 bg-stone-100 dark:border-stone-600 dark:bg-stone-800'}`}
            >
              {t(track.label)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ramp} onChange={(e) => setRamp(e.target.checked)} disabled={playing} className="accent-rose-500" />
          {t('rhythm.ramp', { bpm: rampTarget })}
        </label>
      </div>
      {playing && ramp && <p className="text-sm text-stone-500">{t('rhythm.currentTempo', { bpm: jam.tempo })}</p>}

      <div className="space-y-1 rounded-lg bg-stone-50 p-3 text-sm dark:bg-stone-800/50">
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" checked={timing} onChange={(e) => toggleTiming(e.target.checked)} className="accent-rose-500" />
          {t('rhythm.timing')}
        </label>
        {timing && (
          <>
            <p className="text-xs text-stone-500">{t('rhythm.timingHint')}</p>
            {live.source === 'mic' && (live.status === 'error' || live.status === 'unsupported') && (
              <p role="alert" className="text-amber-700 dark:text-amber-300">
                {t(live.status === 'unsupported' ? 'connect.unsupported' : `connect.${live.error ?? 'other'}`)}
              </p>
            )}
            {playing && (
              <p aria-live="polite" className="font-medium">
                {stats && stats.matched
                  ? t('rhythm.timingStats', {
                      matched: stats.matched,
                      mean: stats.meanMs > 0 ? `+${stats.meanMs}` : stats.meanMs,
                      dir: t(Math.abs(stats.meanMs) <= 15 ? 'rhythm.onTime' : stats.meanMs > 0 ? 'rhythm.late' : 'rhythm.early'),
                      pct: stats.onTimePct,
                    })
                  : t('rhythm.timingWaiting')}
              </p>
            )}
          </>
        )}
      </div>

      {currentChord && currentShape && (
        <div className="flex flex-wrap items-center gap-4">
          <ChordDiagram
            shape={currentShape}
            name={chordLabel(currentChord)}
            rootStrings={shapeIntervalLabels(currentShape, currentChord.bass ?? currentChord.root, currentChord.intervals).roots}
          />
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => changeShape(-1)} disabled={currentShapes.length < 2} aria-label={t('shapes.prev')} className="rounded-md border border-stone-300 px-2 py-1 disabled:opacity-40 dark:border-stone-700">
                ◀
              </button>
              <span className="font-medium">{t('shapes.which', { i: currentShapeIndex + 1, n: currentShapes.length })}</span>
              <button type="button" onClick={() => changeShape(1)} disabled={currentShapes.length < 2} aria-label={t('shapes.next')} className="rounded-md border border-stone-300 px-2 py-1 disabled:opacity-40 dark:border-stone-700">
                ▶
              </button>
            </div>
            <p className="text-stone-500">{shapeCaption(currentShape, t)}</p>
            <p className="max-w-xs text-xs text-stone-500">{t('shapes.useInfo')}</p>
          </div>
        </div>
      )}
      {currentChord && (
        <InstrumentView instrument="guitar" highlights={highlights} only={shapePositions.length ? shapePositions : undefined} fretCount={15} />
      )}

      {!editable && (
        <Link to={link} className="inline-block text-sm text-rose-600 hover:underline">
          {t('rhythm.open')}
        </Link>
      )}
    </div>
  )
}

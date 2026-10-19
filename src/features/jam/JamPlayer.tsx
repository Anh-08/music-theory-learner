import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { GROOVES, groove as getGroove } from '../../audio/grooves'
import { RHYTHMS } from '../../audio/rhythms'
import { startJam, stopJam, updateJam } from '../../audio/jam'
import type { JamTrack } from '../../audio/jamEvents'
import { useJamState } from '../../audio/jamStore'
import { usePlayer } from '../../audio/usePlayer'
import { InstrumentView } from '../../components/lesson/InstrumentView'
import { Segmented } from '../../components/ui/Segmented'
import { Select } from '../../components/ui/Select'
import type { Locale } from '../../i18n/locale'
import type { MessageKey } from '../../i18n/messages'
import { useT, type Translate } from '../../i18n/useT'
import { useSettings } from '../../store/settingsContext'
import { CHROMAS, chroma, keyLabel, parseKey, relatedKeys, spellingsOf, type KeyRef, type ScaleSuggestion } from '../../theory'
import { errorMessage } from '../../i18n/errors'
import { analyze, chordIndexAtBar, chordLabel, jamHighlights, scaleLabel, transposeProgression, type Analysis } from './jamModel'
import { JAM_PRESETS, type JamPreset } from './presets'

export interface JamPlayerProps {
  progression: string
  /** Key ("C", "Am"); empty means auto-detect. */
  songKey?: string
  groove?: string
  tempo?: number
  /** Lesson-specific scale suggestion (id in SCALE_TYPES); the root comes from `scaleRoot` or the key. */
  scale?: string
  scaleRoot?: string
  /** Jam Room page: progression, key and groove are editable. In lessons: only play and adjust the tempo. */
  editable?: boolean
}

// Major keys are spelled with flats (D♭, E♭…), minor keys with their usual spelling (C♯m, F♯m…).
function keyOptions(t: Translate, locale: Locale) {
  return [
    { value: 'auto', label: t('jam.auto'), group: t('jam.autoGroup') },
    ...CHROMAS.map((c) => spellingsOf(c).at(-1)!).map((k) => ({ value: k, label: keyLabel({ tonic: k, mode: 'major' }, locale), group: t('jam.majorKeys') })),
    ...MINOR_TONICS.map((k) => ({ value: `${k}m`, label: keyLabel({ tonic: k, mode: 'minor' }, locale), group: t('jam.minorKeys') })),
  ]
}

const MINOR_TONICS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']

/** Value in the key list matching any key (A#m → "Bbm", C# → "Db"). */
function keyValue(key: KeyRef): string {
  const c = chroma(key.tonic)
  return key.mode === 'major' ? spellingsOf(c).at(-1)! : `${MINOR_TONICS.find((t) => chroma(t) === c)}m`
}

const TRACKS: { id: JamTrack; label: MessageKey }[] = [
  { id: 'drums', label: 'jam.drums' },
  { id: 'bass', label: 'jam.bass' },
  { id: 'chords', label: 'jam.chords' },
  { id: 'click', label: 'jam.click' },
]

/** Scale choice: an automatic suggestion, or the lesson's own scale. */
type ScaleOption = Omit<ScaleSuggestion, 'reason'> & { reason: ScaleSuggestion['reason'] | 'custom' }



function tryAnalyze(text: string, keyChoice: string): { analysis: Analysis | null; error: unknown } {
  try {
    return { analysis: analyze(text, keyChoice === 'auto' ? null : keyChoice), error: null }
  } catch (e) {
    return { analysis: null, error: e }
  }
}

export function JamPlayer({ progression, songKey, groove = 'pop', tempo: initialTempo, scale, scaleRoot, editable = false }: JamPlayerProps) {
  const id = useId()
  const { instrument } = useSettings()
  const { t, locale } = useT()
  const jam = useJamState()
  const playing = jam.ownerId === id
  const { playNote, activeMidis } = usePlayer(instrument)

  const [text, setText] = useState(progression)
  const [keyChoice, setKeyChoice] = useState(songKey ?? 'auto')
  const [grooveId, setGrooveId] = useState(groove)
  // Comping style: 'default' = the groove's comping, or the id of a guitar rhythm with the same beat count.
  const [compId, setCompId] = useState('default')
  const [tempo, setTempo] = useState(initialTempo ?? getGroove(groove).defaultTempo)
  const [mutes, setMutes] = useState<Record<JamTrack, boolean>>({ drums: false, bass: false, chords: false, click: true })
  const [scaleIndex, setScaleIndex] = useState(0)
  const [showScale, setShowScale] = useState(true)
  const [labels, setLabels] = useState<'note' | 'interval'>('interval')
  const [selected, setSelected] = useState(0)

  const parsed = useMemo(() => tryAnalyze(text, keyChoice), [text, keyChoice])
  // Keep the last valid analysis so it still shows while the user is mid-typing.
  const [lastGood, setLastGood] = useState<Analysis | null>(parsed.analysis)
  if (parsed.analysis && parsed.analysis !== lastGood) setLastGood(parsed.analysis)
  const analysis = parsed.analysis ?? lastGood
  const error = parsed.error

  const scaleOptions = useMemo((): ScaleOption[] => {
    if (!analysis) return []
    const base = analysis.suggestions
    if (!scale) return base
    const custom: ScaleOption = { root: scaleRoot ?? analysis.key.tonic, typeId: scale, reason: 'custom' }
    return [custom, ...base.filter((s) => !(s.root === custom.root && s.typeId === custom.typeId))]
  }, [analysis, scale, scaleRoot])
  const currentScale = scaleOptions[Math.min(scaleIndex, scaleOptions.length - 1)] ?? null

  const chords = analysis?.chords ?? []
  const currentIndex = playing ? chordIndexAtBar(chords, jam.bar) : Math.min(selected, chords.length - 1)
  const currentChord = chords[currentIndex]
  const highlights = useMemo(
    () => (currentChord ? jamHighlights(currentChord, showScale ? currentScale : null, labels) : new Map()),
    [currentChord, currentScale, showScale, labels],
  )

  const play = (chordsToPlay: Analysis['chords'], grooveToPlay: string, comp = compId) => {
    const g = getGroove(grooveToPlay)
    const rhythm = RHYTHMS.find((r) => r.id === comp && r.beatsPerBar === g.beatsPerBar)
    void startJam({ ownerId: id, chords: chordsToPlay, groove: g, tempo, instrument, mutes, rhythm })
  }

  const start = () => {
    if (analysis) play(analysis.chords, grooveId)
  }

  // Changing the progression / groove while playing: restart right away with the new settings.
  const changeText = (next: string, key = keyChoice) => {
    setText(next)
    const result = tryAnalyze(next, key)
    if (playing && result.analysis) play(result.analysis.chords, grooveId)
  }

  useEffect(() => {
    if (playing) void updateJam({ tempo, mutes })
  }, [tempo, mutes, playing])

  // Leaving the page / unmounting the player while playing stops the music.
  useEffect(() => {
    if (!playing) return
    return () => void stopJam(id)
  }, [playing, id])

  // Changing the key also transposes the chords in the progression (Roman numerals follow the key on their own).
  const chooseKey = (v: string) => {
    const from = keyChoice === 'auto' ? parsed.analysis?.key : parseKey(keyChoice)
    const next = v !== 'auto' && from && parsed.analysis ? transposeProgression(text, from, parseKey(v)) : text
    setKeyChoice(v)
    setScaleIndex(0)
    setText(next)
    const result = tryAnalyze(next, v)
    if (playing && result.analysis) play(result.analysis.chords, grooveId)
  }

  const chooseGroove = (v: string) => {
    const g = getGroove(v)
    const keepComp = RHYTHMS.some((r) => r.id === compId && r.beatsPerBar === g.beatsPerBar)
    setGrooveId(v)
    setTempo(g.defaultTempo)
    if (!keepComp) setCompId('default')
    if (playing && analysis) play(analysis.chords, v, keepComp ? compId : 'default')
  }

  const chooseComp = (v: string) => {
    setCompId(v)
    if (playing && analysis) play(analysis.chords, grooveId, v)
  }

  const compOptions = [
    { value: 'default', label: t('jam.compDefault') },
    ...RHYTHMS.filter((r) => r.beatsPerBar === getGroove(grooveId).beatsPerBar).map((r) => ({
      value: r.id,
      label: r.name[locale],
      group: t(r.kind === 'strum' ? 'rhythm.groupStrum' : 'rhythm.groupPick'),
    })),
  ].map((o) => ({ group: t('jam.compStyle'), ...o }))

  // With a key selected, presets are transposed to it (minor presets use the relative minor).
  const choosePreset = (p: JamPreset) => {
    let progression = p.progression
    let key = p.songKey ?? 'auto'
    if (keyChoice !== 'auto' && p.songKey) {
      const presetKey = parseKey(p.songKey)
      const current = parseKey(keyChoice)
      const target = current.mode === presetKey.mode ? current : relatedKeys(current).relative
      key = keyValue(target)
      progression = transposeProgression(progression, presetKey, parseKey(key))
    }
    setKeyChoice(key)
    changeText(progression, key)
    setGrooveId(p.groove)
    setCompId('default')
    setTempo(p.tempo ?? getGroove(p.groove).defaultTempo)
    setSelected(0)
    setScaleIndex(0)
  }

  const jamLink = `/jam?${new URLSearchParams({ p: text, ...(keyChoice !== 'auto' && { key: keyChoice }), groove: grooveId, tempo: String(tempo) })}`

  return (
    <div className="not-prose my-6 space-y-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      {editable && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">{t('jam.inputLabel')}</span>
            <input
              value={text}
              onChange={(e) => changeText(e.target.value)}
              spellCheck={false}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm dark:border-stone-700 dark:bg-stone-950"
              aria-label={t('jam.inputAria')}
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {JAM_PRESETS.map((p) => (
              <button
                key={p.name.en}
                type="button"
                onClick={() => choosePreset(p)}
                className="rounded-full border border-stone-300 px-2.5 py-1 text-xs hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                {p.name[locale]}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label={t('jam.key')} value={keyChoice} onChange={chooseKey} options={keyOptions(t, locale)} />
            <Select label={t('jam.groove')} value={grooveId} onChange={chooseGroove} options={GROOVES.map((g) => ({ value: g.id, label: `${g.name} — ${t(`groove.${g.id}`)}` }))} />
            <Select label={t('jam.compStyle')} value={compId} onChange={chooseComp} options={compOptions} />
          </div>
        </div>
      )}

      {error !== null && (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          {errorMessage(error, t)}
        </p>
      )}

      {analysis && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500">
            <span>
              {t('jam.keyLine')} <strong className="text-stone-800 dark:text-stone-200">{keyLabel(analysis.key, locale)}</strong>
              {keyChoice === 'auto' && t('jam.autoDetected')}
            </span>
            {!editable && <span>{t('jam.grooveLine', { name: getGroove(grooveId).name })}</span>}
          </div>

          <ol aria-label={t('jam.chordsList')} className="flex flex-wrap gap-2">
            {chords.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-current={i === currentIndex ? 'true' : undefined}
                  className={`min-w-16 rounded-lg border px-3 py-1.5 text-center transition-colors ${
                    i === currentIndex
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60'
                      : 'border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className="block font-semibold">
                    {chordLabel(c)}
                    {c.bars > 1 && <span className="ml-1 text-xs font-normal text-stone-400">×{c.bars}</span>}
                  </span>
                  <span className="block font-mono text-xs text-stone-500">{analysis.romans[i]}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-end gap-4">
            <button
              type="button"
              onClick={() => (playing ? void stopJam(id) : start())}
              className="rounded-lg bg-rose-500 px-5 py-2 text-sm font-medium text-white hover:bg-rose-600"
            >
              {playing ? t('common.stop') : t('jam.play')}
            </button>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Tempo: {tempo} bpm</span>
              <input type="range" min={40} max={200} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} aria-label="Tempo" className="w-40 accent-rose-500" />
            </label>
            <div role="group" aria-label={t('jam.tracks')} className="flex gap-1">
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
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
            <Select
              label={t('jam.scale')}
              value={String(Math.min(scaleIndex, scaleOptions.length - 1))}
              onChange={(v) => setScaleIndex(Number(v))}
              options={scaleOptions.map((s, i) => ({ value: String(i), label: `${scaleLabel(s, locale)} — ${s.reason === 'custom' ? t('jam.customScale') : t(`suggest.${s.reason}`, s.params)}` }))}
            />
            <Segmented
              label={t('jam.labels')}
              value={labels}
              onChange={setLabels}
              options={[
                { value: 'interval', label: t('labels.interval') },
                { value: 'note', label: t('labels.note') },
              ]}
            />
            <label className="flex items-center gap-2 pb-1.5 text-sm">
              <input type="checkbox" checked={showScale} onChange={(e) => setShowScale(e.target.checked)} className="accent-rose-500" />
              {t('jam.showScale')}
            </label>
          </div>

          <InstrumentView highlights={highlights} activeMidis={activeMidis} fretCount={15} pianoRange={[48, 83]} onPick={(m) => playNote(m)} />

          <p className="text-xs text-stone-500">
            <span className="text-rose-500">●</span> {t('jam.legendRoot')} · <span className="text-sky-600">●</span> {t('jam.legendTones')} · <span className="text-stone-400">●</span> {t('jam.legendScale')}{' '}
            {labels === 'interval' && currentChord && t('jam.legendRelative', { chord: chordLabel(currentChord).replace(/\/.*/, '') })}
          </p>

          {!editable && (
            <Link to={jamLink} className="inline-block text-sm text-rose-600 hover:underline">
              {t('jam.openInRoom')}
            </Link>
          )}
        </>
      )}
    </div>
  )
}

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { startReflex, stopReflex, updateReflex, useReflexState, type ReflexSlot } from '../../audio/reflex'
import { RHYTHMS, parsePattern } from '../../audio/rhythms'
import { ChordDiagram } from '../../components/ChordDiagram/ChordDiagram'
import { shapeIntervalLabels } from '../../components/ChordDiagram/shapeLabels'
import { RhythmGrid } from '../../components/RhythmGrid/RhythmGrid'
import { Segmented } from '../../components/ui/Segmented'
import { Select } from '../../components/ui/Select'
import { errorMessage } from '../../i18n/errors'
import type { MessageKey } from '../../i18n/messages'
import { useT } from '../../i18n/useT'
import { usePersistentState } from '../../store/usePersistentState'
import { keyLabel, parseKey } from '../../theory'
import { chordLabel } from '../jam/jamModel'
import { rhythmLabel } from '../rhythm/customRhythms'
import { DEFAULT_REFLEX, LEVELS, REFLEX_KEYS, levelOf, newSeed, parseCustomLoops, reflexSource, type ReflexLevel, type ReflexSettings } from './reflexModel'

export interface ChordReflexProps {
  /** Reflex page: settings are saved, every option available. In lessons: separate, more compact settings. */
  page?: boolean
  source?: ReflexSettings['source']
  songKey?: string
  level?: ReflexLevel
  seed?: number
}

const PREVIEW = 2

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-rose-500" />
      {children}
    </label>
  )
}

function SlotCard({ slot, current, hideShape, beat }: { slot: ReflexSlot; current: boolean; hideShape: boolean; beat?: number }) {
  const { t } = useT()
  const name = chordLabel(slot.chord)
  return (
    <li
      aria-current={current ? 'true' : undefined}
      className={`flex min-w-0 flex-col items-center gap-2 rounded-xl border p-2 sm:p-3 ${current ? 'border-rose-400 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40' : 'border-stone-200 opacity-60 dark:border-stone-800'}`}
    >
      <span className={`font-bold tracking-tight ${current ? 'text-5xl sm:text-6xl' : 'text-2xl'}`}>{name}</span>
      {!hideShape && slot.shape && (
        <div className="flex w-full justify-center [&>svg]:h-auto [&>svg]:max-w-full">
          <ChordDiagram shape={slot.shape} name={name} hideName rootStrings={shapeIntervalLabels(slot.shape, slot.chord.bass ?? slot.chord.root, slot.chord.intervals).roots} size={current ? 170 : 96} />
        </div>
      )}
      {current && (
        <div role="img" aria-label={t('reflex.beatsAria', { i: (beat ?? -1) + 1, n: slot.beats })} className="flex gap-1.5">
          {Array.from({ length: slot.beats }, (_, i) => (
            <span key={i} className={`h-3 w-3 rounded-full ${beat !== undefined && i <= beat ? 'bg-rose-500' : 'bg-stone-300 dark:bg-stone-700'}`} />
          ))}
        </div>
      )}
    </li>
  )
}

export function ChordReflex({ page = false, source, songKey, level, seed: initialSeed }: ChordReflexProps) {
  const id = useId()
  const { t, locale } = useT()
  const reflex = useReflexState()
  const playing = reflex.ownerId === id

  const initial: ReflexSettings = { ...DEFAULT_REFLEX, ...(level ? LEVELS[level] : {}), ...(source ? { source } : {}), ...(songKey ? { key: songKey } : {}) }
  const [saved, setSaved] = usePersistentState<ReflexSettings>('reflex.chords', initial)
  const [local, setLocal] = useState<ReflexSettings>(initial)
  // Older saved settings may lack new keys: merge with the defaults.
  const settings: ReflexSettings = useMemo(() => (page ? { ...DEFAULT_REFLEX, ...saved } : local), [page, saved, local])
  const setSettings = page ? setSaved : setLocal
  const [seed, setSeed] = useState(() => initialSeed ?? newSeed())

  const rhythm = RHYTHMS.find((r) => r.id === settings.rhythm) ?? RHYTHMS[0]
  const beatsPerBar = settings.mode === 'rhythm' ? rhythm.beatsPerBar : 4
  const custom = useMemo(() => parseCustomLoops(settings.custom, settings.key), [settings.custom, settings.key])
  const rampTarget = Math.min(200, settings.tempo + 40)

  const play = (s: ReflexSettings, sd = seed) => {
    const r = RHYTHMS.find((x) => x.id === s.rhythm) ?? RHYTHMS[0]
    const bpb = s.mode === 'rhythm' ? r.beatsPerBar : 4
    const loops = parseCustomLoops(s.custom, s.key).loops
    void startReflex({
      ownerId: id,
      tempo: s.tempo,
      next: reflexSource(s, sd, bpb, loops),
      beatsPerBar: bpb,
      rhythm: s.mode === 'rhythm' ? r : undefined,
      sound: s.sound,
      rampTo: s.ramp ? Math.min(200, s.tempo + 40) : undefined,
      preview: PREVIEW,
    })
  }

  /** Change a setting; if playing and the change affects the chord stream, restart from the beginning. */
  const update = (patch: Partial<ReflexSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    if (!playing) return
    const live = Object.keys(patch).every((k) => k === 'tempo' || k === 'sound' || k === 'hideShapes')
    if (live) void updateReflex({ tempo: patch.tempo, sound: patch.sound })
    else play(next)
  }

  const reshuffle = () => {
    const sd = newSeed()
    setSeed(sd)
    if (playing) play(settings, sd)
  }

  useEffect(() => {
    if (!playing) return
    return () => void stopReflex(id)
  }, [playing, id])

  // Before playing: preview the first chords of the stream (exactly the stream that will play).
  const preview = useMemo(() => {
    const next = reflexSource(settings, seed, beatsPerBar, custom.loops)
    return Array.from({ length: PREVIEW + 1 }, next)
  }, [settings, seed, beatsPerBar, custom.loops])
  const queue = playing && reflex.queue.length ? reflex.queue : preview
  const counting = playing && reflex.countIn > 0
  const steps = useMemo(() => parsePattern(rhythm.pattern), [rhythm.pattern])

  const chaos = settings.source === 'chaos'
  const lvl = levelOf(settings)
  const levelOptions = (['easy', 'medium', 'hard'] as const).map((l) => ({ value: l, label: t(`reflex.${l}` as MessageKey) }))

  return (
    <div className="not-prose my-6 space-y-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => (playing ? void stopReflex(id) : play(settings))} className="rounded-lg bg-rose-500 px-5 py-2 text-sm font-medium text-white hover:bg-rose-600">
          {playing ? t('common.stop') : t('reflex.start')}
        </button>
        <button type="button" onClick={reshuffle} className="rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800">
          {t('reflex.newChain')}
        </button>
        {playing && settings.ramp && <span className="text-sm text-stone-500">{t('rhythm.currentTempo', { bpm: reflex.tempo })}</span>}
        <span className="text-xs text-stone-500">{t(settings.mode === 'beats' ? 'reflex.hintBeats' : 'reflex.hintRhythm')}</span>
      </div>

      <div className="relative">
        {counting && (
          <div aria-live="polite" className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-stone-900/80">
            <span className="text-7xl font-bold text-rose-500">{reflex.countIn}</span>
            <span className="sr-only">{t('reflex.countIn')}</span>
          </div>
        )}
        <ol aria-label={t('reflex.stripAria')} className="grid items-start gap-2 sm:gap-3" style={{ gridTemplateColumns: `minmax(0, 2fr) repeat(${PREVIEW}, minmax(0, 1fr))` }}>
          {queue.slice(0, PREVIEW + 1).map((slot, i) => (
            <SlotCard key={i} slot={slot} current={i === 0} hideShape={settings.hideShapes} beat={i === 0 && playing && !counting ? reflex.beat : undefined} />
          ))}
        </ol>
      </div>

      {settings.mode === 'rhythm' && (
        <RhythmGrid steps={steps} beatsPerBar={rhythm.beatsPerBar} stepsPerBeat={rhythm.stepsPerBeat} current={playing && !counting ? reflex.step : -1} />
      )}

      <div className="flex flex-wrap items-end gap-4">
        <Segmented label={t('reflex.level')} value={lvl ?? ('custom' as ReflexLevel)} onChange={(l: ReflexLevel) => update(LEVELS[l])} options={levelOptions} />
        <Segmented
          label={t('reflex.source')}
          value={settings.source}
          onChange={(v) => update({ source: v })}
          options={[
            { value: 'loops', label: t('reflex.loops') },
            { value: 'generate', label: t('reflex.generate') },
            { value: 'custom', label: t('reflex.custom') },
            { value: 'chaos', label: t('reflex.chaos') },
          ]}
        />
        {!chaos && (
          <div className="w-40">
            <Select label={t('reflex.key')} value={settings.key} onChange={(v) => update({ key: v })} options={REFLEX_KEYS.map((k) => ({ value: k, label: keyLabel(parseKey(k), locale) }))} />
          </div>
        )}
      </div>
      {chaos && <p className="text-xs text-stone-500">{t('reflex.chaosHint')}</p>}

      {settings.source === 'custom' && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">{t('reflex.customLabel')}</span>
          <textarea
            value={settings.custom}
            onChange={(e) => update({ custom: e.target.value })}
            rows={3}
            spellCheck={false}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-mono text-sm dark:border-stone-700 dark:bg-stone-950"
          />
          <span className="text-xs text-stone-500">{t('reflex.customHint')}</span>
        </label>
      )}
      {settings.source === 'custom' && custom.error !== null && (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          {errorMessage(custom.error, t)}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('reflex.mode')}
          value={settings.mode}
          onChange={(v) => update({ mode: v })}
          options={[
            { value: 'beats', label: t('reflex.modeBeats') },
            { value: 'rhythm', label: t('reflex.modeRhythm') },
          ]}
        />
        {settings.mode === 'beats' ? (
          <Segmented
            label={t('reflex.beatsPerChord')}
            value={String(settings.beatsPerChord) as '1' | '2' | '4'}
            onChange={(v) => update({ beatsPerChord: Number(v) as 1 | 2 | 4 })}
            options={(['4', '2', '1'] as const).map((n) => ({ value: n, label: n }))}
          />
        ) : (
          <div className="w-56">
            <Select
              label={t('reflex.rhythm')}
              value={rhythm.id}
              onChange={(v) => update({ rhythm: v })}
              options={RHYTHMS.map((r) => ({ value: r.id, label: rhythmLabel(r, locale), group: t(r.kind === 'strum' ? 'rhythm.groupStrum' : 'rhythm.groupPick') }))}
            />
          </div>
        )}
        {(settings.source === 'generate' || chaos) && (
          <Segmented
            label={t('reflex.phrase')}
            value={String(settings.phraseLength) as '4' | '8'}
            onChange={(v) => update({ phraseLength: Number(v) as 4 | 8 })}
            options={(['4', '8'] as const).map((n) => ({ value: n, label: t('reflex.phraseN', { n }) }))}
          />
        )}
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">{t('jam.tempo', { bpm: settings.tempo })}</span>
          <input type="range" min={40} max={200} value={settings.tempo} onChange={(e) => update({ tempo: Number(e.target.value) })} aria-label={t('jam.tempoAria')} className="w-40 accent-rose-500" />
        </label>
      </div>

      <details className="rounded-lg bg-stone-50 p-3 dark:bg-stone-800/50">
        <summary className="cursor-pointer text-sm font-medium">{t('reflex.more')}</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Check checked={settings.sevenths} onChange={(v) => update({ sevenths: v })}>
            {t('reflex.sevenths')}
          </Check>
          <Check checked={settings.colors} onChange={(v) => update({ colors: v })}>
            {t('reflex.colors')}
          </Check>
          {!chaos && (
            <Check checked={settings.modulate} onChange={(v) => update({ modulate: v })}>
              {t('reflex.modulate')}
            </Check>
          )}
          <Check checked={settings.hideShapes} onChange={(v) => update({ hideShapes: v })}>
            {t('reflex.hideShapes')}
          </Check>
          <Check checked={settings.nearShapes} onChange={(v) => update({ nearShapes: v })}>
            {t('reflex.nearShapes')}
          </Check>
          <Check checked={settings.sound} onChange={(v) => update({ sound: v })}>
            {t('reflex.sound')}
          </Check>
          <Check checked={settings.ramp} onChange={(v) => update({ ramp: v })}>
            {t('reflex.ramp', { bpm: rampTarget })}
          </Check>
        </div>
      </details>


      {!page && (
        <Link to="/reflex/chords" className="inline-block text-sm text-rose-600 hover:underline">
          {t('reflex.open')}
        </Link>
      )}
    </div>
  )
}

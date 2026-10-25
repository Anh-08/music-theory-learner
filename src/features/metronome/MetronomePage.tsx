import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { nudgeClickVolume } from '../../audio/click'
import { setMetronomeTempo, startMetronome, stopMetronome, useMetronome, type BarPlan } from '../../audio/metronome'
import { ClickSettings, ClickVolume } from '../../components/ui/ClickSettings'
import { Segmented } from '../../components/ui/Segmented'
import { Select } from '../../components/ui/Select'
import type { MessageKey } from '../../i18n/messages'
import { useT } from '../../i18n/useT'
import { usePersistentState } from '../../store/usePersistentState'
import {
  CUSTOM_UNITS,
  DEFAULT_METRONOME,
  GROUPINGS_7,
  MAX_BPM,
  MAX_CUSTOM_BEATS,
  METERS,
  MIN_BPM,
  addTap,
  allowedSubdivisions,
  barEvents,
  beatLevels,
  clampBpm,
  isMutedBar,
  meterLayout,
  nextLevel,
  normalizeSettings,
  parseGrouping,
  tapTempo,
  tempoName,
  trainerTempo,
  type BeatLevel,
  type CustomUnit,
  type MetronomeSettings,
  type Subdivision,
} from './metronomeModel'

const card = 'space-y-4 rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900'
const btn2 = 'rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800'
const fieldLabel = 'mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400'

/** The plan of one bar from the current settings (called by the scheduler at every bar start). */
function planBar(s: MetronomeSettings, bar: number, elapsed: number): BarPlan {
  const gap = isMutedBar(s.gap, bar)
  return {
    pulses: meterLayout(s).pulses,
    clicks: barEvents(s),
    silent: gap || s.visualOnly,
    gap,
    tempo: s.trainer.on ? trainerTempo(s.trainer, bar, elapsed) : s.tempo,
    subVolume: s.subVolume,
  }
}

const formatTime = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

/** A number box that only commits on blur / Enter, so typing "120" never gets clamped at "1". */
function NumberField({ label, value, min, max, onChange, disabled }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState(String(value))
  const [shown, setShown] = useState(value)
  if (shown !== value) {
    setShown(value)
    setDraft(String(value))
  }
  const commit = () => {
    const n = Math.round(Number(draft))
    if (Number.isFinite(n) && draft.trim() !== '') onChange(Math.min(max, Math.max(min, n)))
    else setDraft(String(value))
  }
  return (
    <label className="block text-sm">
      <span className={fieldLabel}>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="w-24 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40 dark:border-stone-700 dark:bg-stone-900"
      />
    </label>
  )
}

/** Subdivision names: note values for a quarter-note beat, "split in N" when the beat is another note (3/2, 7/8…). */
function subLabel(sub: Subdivision, generic: boolean): MessageKey {
  if (generic && sub !== 'none' && sub !== 'swing') return `metronome.split.${sub}` as MessageKey
  return `metronome.sub.${sub}` as MessageKey
}

/** Text box for a grouping like "3+2+2"; commits on blur / Enter and says when the numbers do not add up. */
function GroupingField({ beats, value, onChange }: { beats: number; value: string; onChange: (v: string) => void }) {
  const { t } = useT()
  const [draft, setDraft] = useState(value)
  const [shown, setShown] = useState(value)
  if (shown !== value) {
    setShown(value)
    setDraft(value)
  }
  const invalid = value.trim() !== '' && parseGrouping(value, beats) === null
  const example = beats > 3 ? `${Array<number>(Math.floor(beats / 2) - 1).fill(2).join('+')}+${beats - 2 * (Math.floor(beats / 2) - 1)}` : String(beats)
  return (
    <label className="block text-sm">
      <span className={fieldLabel}>{t('metronome.customGrouping')}</span>
      <input
        type="text"
        inputMode="text"
        value={draft}
        placeholder={t('metronome.groupingPlaceholder', { example })}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onChange(draft.replace(/\s/g, ''))}
        onKeyDown={(e) => e.key === 'Enter' && onChange(draft.replace(/\s/g, ''))}
        aria-invalid={invalid}
        className="w-44 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
      />
      {invalid && <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400">{t('metronome.groupingInvalid', { n: beats, example })}</span>}
    </label>
  )
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-rose-500" />
      {children}
    </label>
  )
}

const DOT_SIZE: Record<BeatLevel, string> = { strong: 'h-12 w-12', medium: 'h-10 w-10', normal: 'h-8 w-8', silent: 'h-8 w-8' }
const DOT_IDLE: Record<BeatLevel, string> = {
  strong: 'bg-stone-700 dark:bg-stone-200',
  medium: 'bg-stone-500 dark:bg-stone-400',
  normal: 'bg-stone-300 dark:bg-stone-600',
  silent: 'border-2 border-dashed border-stone-300 dark:border-stone-600',
}

/** Keeps the screen on while `active` (Screen Wake Lock API; silently skipped where unsupported). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock
        .request('screen')
        .then((l) => (cancelled ? void l.release() : (lock = l)))
        .catch(() => {})
    }
    acquire()
    // The browser drops the lock when the tab is hidden; take it again on return.
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release().catch(() => {})
    }
  }, [active])
}

export function MetronomePage() {
  const { t } = useT()
  const [stored, setStored] = usePersistentState<MetronomeSettings>('metronome:settings', DEFAULT_METRONOME)
  const settings = useMemo(() => normalizeSettings(stored), [stored])
  const update = (patch: Partial<MetronomeSettings>) => setStored((s) => ({ ...normalizeSettings(s), ...patch }))
  const m = useMetronome()
  const running = m.running

  // The scheduler reads the latest settings at each bar start.
  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const layout = meterLayout(settings)
  const levels = beatLevels(settings)
  const subs = allowedSubdivisions(layout.kind)
  const subdivision = subs.includes(settings.subdivision) ? settings.subdivision : 'none'
  const trainerOn = settings.trainer.on
  const shownTempo = running ? m.tempo : trainerOn ? clampBpm(settings.trainer.start) : settings.tempo
  const name = tempoName(shownTempo)

  const start = () => void startMetronome({ tempo: trainerOn ? clampBpm(settings.trainer.start) : settings.tempo, plan: (bar, elapsed) => planBar(settingsRef.current, bar, elapsed) })
  const toggle = () => (running ? void stopMetronome() : start())

  // The latest tempo, so quick repeated ±1/±5 presses each count before React re-renders.
  const tempoRef = useRef(settings.tempo)
  useEffect(() => {
    tempoRef.current = settings.tempo
  }, [settings.tempo])
  const setTempo = (bpm: number) => {
    const next = clampBpm(bpm)
    tempoRef.current = next
    update({ tempo: next })
    if (running && !trainerOn) void setMetronomeTempo(next)
  }
  const nudge = (delta: number) => setTempo(tempoRef.current + delta)

  const taps = useRef<number[]>([])
  const tap = () => {
    taps.current = addTap(taps.current, performance.now())
    const bpm = tapTempo(taps.current)
    if (bpm !== null) setTempo(bpm)
  }

  // Stop when leaving the page.
  useEffect(() => () => void stopMetronome(), [])
  useWakeLock(running)

  // Elapsed time for the status line and the session timer.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running])
  const elapsed = running ? Math.max(0, now - m.startedAt) : 0
  const timerMs = settings.timer.minutes * 60_000
  useEffect(() => {
    if (running && settings.timer.on && elapsed >= timerMs) void stopMetronome()
  }, [running, settings.timer.on, elapsed, timerMs])

  // Keyboard shortcuts (not while typing in a field, and leave Space to a focused button).
  const keyActions = useRef({ toggle, tap, nudge, trainerOn })
  useEffect(() => {
    keyActions.current = { toggle, tap, nudge, trainerOn }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : null
      if (e.ctrlKey || e.metaKey || e.altKey || el?.closest('input, select, textarea, [contenteditable="true"]')) return
      const a = keyActions.current
      if (e.key === ' ' && !el?.closest('button, summary')) {
        e.preventDefault()
        a.toggle()
      } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !a.trainerOn) {
        e.preventDefault()
        a.nudge((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : 1))
      } else if ((e.key === 't' || e.key === 'T') && !a.trainerOn) a.tap()
      else if (e.key === '-' || e.key === '_') nudgeClickVolume(-0.1)
      else if (e.key === '+' || e.key === '=') nudgeClickVolume(0.1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const setLevel = (i: number) => update({ accents: levels.map((l, j) => (j === i ? nextLevel(l) : l)) })
  const groupStarts = new Set(layout.groups.slice(0, -1).map((_, i) => layout.groups.slice(0, i + 1).reduce((a, b) => a + b, 0)))
  const compound = settings.meter === '6/8' || settings.meter === '9/8' || settings.meter === '12/8'
  const flashStrong = levels[m.pulse] === 'strong'

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t('metronome.title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">{t('metronome.intro')}</p>
      </header>

      <section className={`${card} relative overflow-hidden text-center`}>
        {running && settings.visualOnly && m.pulse >= 0 && !m.gap && (
          <div
            key={`${m.bar}-${m.pulse}`}
            aria-hidden
            className={`pointer-events-none absolute inset-0 ${flashStrong ? 'bg-rose-500/40' : 'bg-rose-500/15'}`}
            style={{ animation: 'metronome-flash 250ms ease-out forwards' }}
          />
        )}
        <div className="relative space-y-4">
          <div>
            <div className="text-7xl font-bold tabular-nums" aria-live="off">
              {shownTempo}
            </div>
            <div className="text-sm text-stone-500 dark:text-stone-400">
              <span className="font-medium capitalize" title={t(`metronome.name.${name}` as MessageKey)}>
                {name}
              </span>{' '}
              · bpm · <span>{t(`metronome.name.${name}` as MessageKey)}</span>
            </div>
          </div>

          <div role="group" aria-label={t('metronome.beats')} className="flex min-h-12 flex-wrap items-center justify-center gap-2">
            {levels.map((level, i) => {
              const active = running && m.pulse === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLevel(i)}
                  aria-label={t('metronome.beatAria', { n: i + 1, level: t(`metronome.level.${level}` as MessageKey) })}
                  className={`${DOT_SIZE[level]} ${groupStarts.has(i) ? 'ml-4' : ''} shrink-0 rounded-full transition-transform ${
                    active ? `scale-110 ${m.gap ? 'bg-amber-400' : 'bg-rose-500'} ${level === 'silent' ? 'opacity-50' : ''}` : DOT_IDLE[level]
                  }`}
                />
              )
            })}
          </div>

          <div className="min-h-5 text-sm text-stone-500 dark:text-stone-400" aria-live="polite">
            {running && (
              <>
                {t('metronome.status', { bar: m.bar + 1, time: formatTime(elapsed) })}
                {settings.timer.on && <> · {t('metronome.remaining', { time: formatTime(timerMs - elapsed) })}</>}
                {trainerOn && <> · {t('metronome.trainerNow', { bpm: m.tempo, target: clampBpm(settings.trainer.target) })}</>}
                {m.gap && <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">{t('metronome.gapNow')}</span>}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={toggle} className="min-w-36 rounded-xl bg-rose-500 px-6 py-3 text-lg font-semibold text-white hover:bg-rose-600">
              {running ? t('common.stop') : t('metronome.start')}
            </button>
            <button type="button" onClick={tap} disabled={trainerOn} aria-label={t('metronome.tapAria')} className={`${btn2} px-5 py-3`}>
              {t('metronome.tap')}
            </button>
          </div>

          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={settings.tempo}
            disabled={trainerOn}
            onChange={(e) => setTempo(Number(e.target.value))}
            aria-label={t('jam.tempoAria')}
            className="w-full max-w-md accent-rose-500 disabled:opacity-40"
          />
          <div className="flex flex-wrap items-end justify-center gap-2">
            {[-5, -1, 1, 5].map((d) => (
              <button key={d} type="button" disabled={trainerOn} onClick={() => nudge(d)} aria-label={t('metronome.change', { delta: d > 0 ? `+${d}` : d })} className={btn2}>
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
            <NumberField label={t('metronome.tempoInput')} value={settings.tempo} min={MIN_BPM} max={MAX_BPM} onChange={setTempo} disabled={trainerOn} />
          </div>
          <div className="mx-auto w-full max-w-xs pt-1 text-left">
            <ClickVolume />
          </div>
          {trainerOn && <p className="text-xs text-stone-500 dark:text-stone-400">{t('metronome.trainerHint')}</p>}
        </div>
      </section>

      <section className={`${card} grid gap-4 sm:grid-cols-2`}>
        <div className="min-w-0 space-y-3">
          <Select
            label={t('metronome.meter')}
            value={settings.meter}
            onChange={(v) => update({ meter: v as MetronomeSettings['meter'], accents: null })}
            options={METERS.map((x) => ({ value: x, label: x === 'custom' ? t('metronome.customNamed', { sig: `${settings.customBeats}/${settings.customUnit}` }) : x }))}
          />
          {settings.meter === 'custom' && (
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <NumberField label={t('metronome.customBeats')} value={settings.customBeats} min={1} max={MAX_CUSTOM_BEATS} onChange={(n) => update({ customBeats: n, accents: null })} />
                <span className="pb-1.5 text-2xl leading-none text-stone-400" aria-hidden>
                  /
                </span>
                <div className="w-44">
                  <Select
                    label={t('metronome.customUnit')}
                    value={String(settings.customUnit)}
                    onChange={(v) => update({ customUnit: Number(v) as CustomUnit, accents: null })}
                    options={CUSTOM_UNITS.map((u) => ({ value: String(u), label: `${u} · ${t(`metronome.note.${u}` as MessageKey)}` }))}
                  />
                </div>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">{t('metronome.customHint', { note: t(`metronome.note.${settings.customUnit}` as MessageKey) })}</p>
              <GroupingField beats={settings.customBeats} value={settings.customGrouping} onChange={(g) => update({ customGrouping: g, accents: null })} />
            </div>
          )}
          {compound && (
            <Segmented
              label={t('metronome.countBy')}
              value={settings.compoundUnit}
              onChange={(v) => update({ compoundUnit: v, accents: null })}
              options={[
                { value: 'dotted', label: t('metronome.dotted') },
                { value: 'eighth', label: t('metronome.eighth') },
              ]}
            />
          )}
          {settings.meter === '7/8' && (
            <Segmented label={t('metronome.grouping')} value={settings.grouping7} onChange={(v) => update({ grouping7: v, accents: null })} options={GROUPINGS_7.map((g) => ({ value: g, label: g }))} />
          )}
          {settings.accents && (
            <button type="button" onClick={() => update({ accents: null })} className="text-sm text-rose-600 underline dark:text-rose-400">
              {t('metronome.resetAccents')}
            </button>
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <Segmented
            label={t('metronome.subdivision')}
            value={subdivision}
            onChange={(v) => update({ subdivision: v })}
            options={subs.map((x) => ({ value: x, label: t(subLabel(x, settings.meter === 'custom' && settings.customUnit !== 4)) }))}
          />
          {subdivision === 'swing' && (
            <label className="block text-sm">
              <span className={fieldLabel}>{t('metronome.swing', { pct: Math.round(settings.swing * 100) })}</span>
              <input type="range" min={50} max={75} value={Math.round(settings.swing * 100)} onChange={(e) => update({ swing: Number(e.target.value) / 100 })} className="w-full accent-rose-500" />
            </label>
          )}
          {subdivision !== 'none' && (
            <label className="block text-sm">
              <span className={fieldLabel}>{t('metronome.subVolume', { pct: Math.round(settings.subVolume * 100) })}</span>
              <input type="range" min={0} max={100} step={5} value={Math.round(settings.subVolume * 100)} onChange={(e) => update({ subVolume: Number(e.target.value) / 100 })} className="w-full accent-rose-500" />
            </label>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <ClickSettings />
            <Check checked={settings.visualOnly} onChange={(v) => update({ visualOnly: v })}>
              {t('metronome.visualOnly')}
            </Check>
          </div>
        </div>
      </section>

      <details className={card}>
        <summary className="cursor-pointer font-medium">{t('metronome.practice')}</summary>
        <div className="space-y-5 pt-2">
          <fieldset className="space-y-2">
            <Check checked={trainerOn} onChange={(on) => update({ trainer: { ...settings.trainer, on } })}>
              <span className="font-medium">{t('metronome.trainer')}</span>
            </Check>
            <div className="flex flex-wrap items-end gap-3">
              <NumberField label={t('metronome.trainerFrom')} value={settings.trainer.start} min={MIN_BPM} max={MAX_BPM} onChange={(start) => update({ trainer: { ...settings.trainer, start } })} />
              <NumberField label={t('metronome.trainerTo')} value={settings.trainer.target} min={MIN_BPM} max={MAX_BPM} onChange={(target) => update({ trainer: { ...settings.trainer, target } })} />
              <NumberField label={t('metronome.trainerStep')} value={settings.trainer.step} min={1} max={50} onChange={(step) => update({ trainer: { ...settings.trainer, step } })} />
              <NumberField label={t('metronome.trainerEvery')} value={settings.trainer.every} min={1} max={600} onChange={(every) => update({ trainer: { ...settings.trainer, every } })} />
              <Segmented
                label={t('metronome.unit')}
                value={settings.trainer.unit}
                onChange={(unit) => update({ trainer: { ...settings.trainer, unit } })}
                options={[
                  { value: 'bars', label: t('metronome.unit.bars') },
                  { value: 'seconds', label: t('metronome.unit.seconds') },
                ]}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <Check checked={settings.gap.on} onChange={(on) => update({ gap: { ...settings.gap, on } })}>
              <span className="font-medium">{t('metronome.gap')}</span>
            </Check>
            <p className="text-xs text-stone-500 dark:text-stone-400">{t('metronome.gapHint')}</p>
            <div className="flex flex-wrap items-end gap-3">
              <NumberField label={t('metronome.gapPlay')} value={settings.gap.play} min={1} max={16} onChange={(play) => update({ gap: { ...settings.gap, play } })} />
              <NumberField label={t('metronome.gapMute')} value={settings.gap.mute} min={1} max={16} onChange={(mute) => update({ gap: { ...settings.gap, mute } })} />
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <Check checked={settings.timer.on} onChange={(on) => update({ timer: { ...settings.timer, on } })}>
              <span className="font-medium">{t('metronome.timer')}</span>
            </Check>
            <NumberField label={t('metronome.timerMinutes')} value={settings.timer.minutes} min={1} max={180} onChange={(minutes) => update({ timer: { ...settings.timer, minutes } })} />
          </fieldset>
        </div>
      </details>

      <p className="hidden text-xs text-stone-500 sm:block dark:text-stone-400">{t('metronome.shortcuts')}</p>
    </div>
  )
}

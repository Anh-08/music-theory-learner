import { useSyncExternalStore } from 'react'
import { getClick } from './click'
import { getTone } from './instruments'
import { claimTransport, ownsTransport, releaseTransport } from './transportOwner'

/**
 * Scheduler of the standalone metronome page. One Transport beat = one counted pulse; the page decides what each
 * bar contains through `plan`, called at every bar start, so meter / accent / trainer changes apply from the next bar.
 */

export interface MetronomeClick {
  /** Position from the start of the bar, in pulses. */
  at: number
  pulse: number
  level: 'strong' | 'medium' | 'normal' | 'silent' | 'sub'
}

export interface BarPlan {
  pulses: number
  clicks: MetronomeClick[]
  /** No sound this bar (gap trainer or visual-only mode); the beat still moves on screen. */
  silent: boolean
  /** Muted by the gap trainer (shown on screen). */
  gap: boolean
  /** Tempo for this bar (speed trainer); omitted = keep the current tempo. */
  tempo?: number
  /** Volume of subdivision clicks (0–1). */
  subVolume: number
}

export interface MetronomeOptions {
  tempo: number
  /** `bar` counts from 0; `elapsed` is seconds since the start. */
  plan: (bar: number, elapsed: number) => BarPlan
}

export interface MetronomeState {
  running: boolean
  bar: number
  /** Current pulse in the bar (-1 before the first). */
  pulse: number
  tempo: number
  gap: boolean
  /** `Date.now()` at start, for the session timer. */
  startedAt: number
}

let state: MetronomeState = { running: false, bar: 0, pulse: -1, tempo: 0, gap: false, startedAt: 0 }
const listeners = new Set<() => void>()

export const metronomeStore = {
  get: () => state,
  set(next: Partial<MetronomeState>) {
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export function useMetronome(): MetronomeState {
  return useSyncExternalStore(metronomeStore.subscribe, metronomeStore.get)
}

let repeatId: number | null = null
let bpm = 0

function release() {
  if (repeatId !== null) void getTone().then((T) => repeatId !== null && T.getTransport().clear(repeatId))
  repeatId = null
  metronomeStore.set({ running: false, pulse: -1, gap: false })
}

export async function startMetronome(opts: MetronomeOptions): Promise<void> {
  const T = await getTone()
  const click = await getClick()
  claimTransport(release)
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  transport.position = 0
  bpm = opts.tempo
  transport.bpm.value = bpm

  let bar = 0
  let pulse = 0
  let plan: BarPlan | null = null
  let startTime: number | null = null

  const id = transport.scheduleRepeat((time) => {
    if (repeatId !== id) return
    startTime ??= time
    if (pulse === 0 || !plan) {
      plan = opts.plan(bar, time - startTime)
      if (plan.tempo !== undefined && plan.tempo !== bpm) {
        bpm = plan.tempo
        transport.bpm.setValueAtTime(bpm, time)
      }
    }
    const p = plan
    const spb = 60 / bpm
    if (!p.silent) {
      for (const c of p.clicks) {
        if (c.pulse !== pulse) continue
        const t = time + (c.at - pulse) * spb
        if (c.level === 'strong') click.tick(t, true, 1)
        else if (c.level === 'medium') click.tick(t, true, 0.55)
        else if (c.level === 'normal') click.tick(t, false, 1)
        else if (c.level === 'sub' && p.subVolume > 0) click.tick(t, false, 0.7 * p.subVolume)
      }
    }
    const shown = { bar, pulse, tempo: bpm, gap: p.gap }
    // A timer instead of Draw: Draw stops while the tab is hidden.
    setTimeout(() => repeatId === id && metronomeStore.set(shown), Math.max(0, (time - T.now()) * 1000))
    if (++pulse >= p.pulses) {
      pulse = 0
      bar++
    }
  }, '4n', 0)
  repeatId = id
  metronomeStore.set({ running: true, bar: 0, pulse: -1, tempo: bpm, gap: false, startedAt: Date.now() })
  transport.start('+0.05')
}

/** Changes the tempo without stopping. */
export async function setMetronomeTempo(next: number): Promise<void> {
  if (repeatId === null) return
  const T = await getTone()
  bpm = next
  T.getTransport().bpm.rampTo(next, 0.05)
  metronomeStore.set({ tempo: next })
}

export async function stopMetronome(): Promise<void> {
  if (!ownsTransport(release)) return
  const T = await getTone()
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  releaseTransport(release)
  release()
}

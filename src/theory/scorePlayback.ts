import { TICKS_PER_QUARTER, eventStarts, eventTicks, measureCapacity, type Score } from './score'
import type { EventRef } from './scoreEdit'

/**
 * Turns a score into timed sound events (Phase 10.4): repeats and endings unrolled, ties merged,
 * techniques approximated with the plain voices the app has (no pitch bending).
 */

/** Order in which bars are played, following repeat signs and 1st / 2nd endings. */
export function playOrder(score: Pick<Score, 'measures'>): number[] {
  const ms = score.measures
  const order: number[] = []
  const finished = new Set<number>()
  let i = 0
  let start = 0
  let pass = 1
  let afterSection = false
  while (i < ms.length && order.length < 4096) {
    const m = ms[i]
    // The first bar after a finished repeat (and its endings) starts a new section.
    if (!m.ending && afterSection) {
      afterSection = false
      start = i
      pass = 1
    }
    if (m.repeatStart && i !== start) {
      start = i
      pass = 1
    }
    if (m.ending && !m.ending.includes(pass)) {
      if (m.repeatEnd) {
        finished.add(i)
        afterSection = true
      }
      i++
      continue
    }
    order.push(i)
    if (m.repeatEnd && !finished.has(i)) {
      if (pass < m.repeatEnd.times) {
        pass++
        i = start
        continue
      }
      finished.add(i)
      afterSection = true
    }
    i++
  }
  return order
}

/**
 * Ticks of one counted beat: the written unit for simple meters, a dotted quarter for compound meters
 * (6/8, 9/8, 12/8 are felt in 2, 3 and 4) — the same convention as the metronome page.
 */
export function beatTicks(timeSig: [number, number]): number {
  const [beats, unit] = timeSig
  if (unit === 8 && beats % 3 === 0 && beats > 3) return TICKS_PER_QUARTER * 1.5
  return (TICKS_PER_QUARTER * 4) / unit
}

export function beatsPerBar(timeSig: [number, number]): number {
  return measureCapacity(timeSig) / beatTicks(timeSig)
}

export interface SoundNote {
  midi: number
  /** Seconds from the start of playback. */
  at: number
  duration: number
  velocity: number
}

export interface TimedEvent {
  ref: EventRef
  /** Seconds from the start of playback. */
  at: number
  duration: number
  /** Notes to strike (tied continuations are not struck again). */
  sounds: SoundNote[]
}

export interface Beat {
  at: number
  downbeat: boolean
}

export interface PlaybackPlan {
  events: TimedEvent[]
  beats: Beat[]
  /** Length in seconds. */
  total: number
  /** Length of one beat in seconds (for the count-in). */
  beat: number
}

export interface PlaybackOptions {
  /** Tempo factor (1 = as written). */
  speed?: number
  /** Start from this event (its first time in the play order); events before it are skipped. */
  from?: EventRef
  /** Only these bars (inclusive), straight through, ignoring repeats — for looping a selection. */
  bars?: [number, number]
}

export function scoreToEvents(score: Score, opts: PlaybackOptions = {}): PlaybackPlan {
  const speed = Math.max(0.25, Math.min(2, opts.speed ?? 1))
  const beat = 60 / (score.tempo * speed)
  const secPerTick = beat / beatTicks(score.timeSig)
  const cap = measureCapacity(score.timeSig)
  const order = opts.bars ? range(opts.bars[0], opts.bars[1]).filter((i) => i < score.measures.length) : playOrder(score)

  const events: TimedEvent[] = []
  const beats: Beat[] = []
  const barTimes: number[] = [] // start time of each entry of `order`
  let barStart = 0
  // Notes held by a tie, by pitch: the next event's same pitch extends them instead of striking again.
  let held = new Map<number, SoundNote>()
  let prevHammer = new Set<number>() // strings whose next note is a hammer-on / pull-off / slide

  for (const mi of order) {
    const m = score.measures[mi]
    barTimes.push(barStart)
    const starts = eventStarts(m)
    const barTicks = Math.max(cap, starts.length ? starts[starts.length - 1] + eventTicks(m.events[m.events.length - 1]) : 0)
    for (let b = 0; b * beatTicks(score.timeSig) < cap - 1e-9; b++) beats.push({ at: barStart + b * beatTicks(score.timeSig) * secPerTick, downbeat: b === 0 })

    m.events.forEach((e, ei) => {
      const at = barStart + starts[ei] * secPerTick
      const duration = eventTicks(e) * secPerTick
      const sounds: SoundNote[] = []
      const nextHeld = new Map<number, SoundNote>()
      const nextHammer = new Set<number>()
      for (const n of e.rest ? [] : e.notes) {
        const tech = n.tech ?? []
        const tied = held.get(n.midi)
        if (tied) {
          tied.duration += duration
          if (e.tieToNext) nextHeld.set(n.midi, tied)
          continue
        }
        const legato = prevHammer.has(n.string)
        let velocity = legato ? 0.55 : 0.8
        let length = duration
        if (tech.includes('dead')) {
          velocity = 0.35
          length = Math.min(duration, 0.06)
        } else if (tech.includes('palmMute')) {
          velocity *= 0.85
          length = Math.min(duration, 0.18)
        } else if (tech.includes('letRing')) {
          length = Math.max(duration, barStart + barTicks * secPerTick - at)
        }
        if (tech.includes('harmonic')) velocity *= 0.7
        const bend = tech.includes('bendFull') ? 2 : tech.includes('bendHalf') ? 1 : 0
        if (bend) {
          // No pitch bending in the voices: a short grace note, then the bent pitch.
          const grace = Math.min(length / 3, 0.12)
          sounds.push({ midi: n.midi, at, duration: grace, velocity })
          sounds.push({ midi: n.midi + bend, at: at + grace, duration: length - grace, velocity: velocity * 0.75 })
        } else {
          const s = { midi: n.midi, at, duration: length, velocity }
          sounds.push(s)
          if (e.tieToNext) nextHeld.set(n.midi, s)
        }
        if (tech.some((t) => t === 'hammer' || t === 'pull' || t === 'slide')) nextHammer.add(n.string)
      }
      held = nextHeld
      prevHammer = nextHammer
      events.push({ ref: { measure: mi, event: ei }, at, duration, sounds })
    })
    if (m.events.length === 0) {
      held = new Map()
      prevHammer = new Set()
    }
    barStart += barTicks * secPerTick
  }

  const plan: PlaybackPlan = { events, beats, total: barStart, beat }
  if (!opts.from || opts.bars) return plan
  // Start from the first time the cursor's bar is played, at the cursor's event (or the append slot).
  const k = order.indexOf(opts.from.measure)
  if (k < 0) return { ...plan, events: [], beats: [], total: 0 }
  const m = score.measures[opts.from.measure]
  const before = m.events.slice(0, opts.from.event).reduce((sum, e) => sum + eventTicks(e), 0)
  const t0 = barTimes[k] + before * secPerTick
  const shift = <T extends { at: number }>(x: T): T => ({ ...x, at: x.at - t0 })
  return {
    ...plan,
    events: plan.events.filter((e) => e.at >= t0 - 1e-9).map((e) => ({ ...shift(e), sounds: e.sounds.map(shift) })),
    beats: plan.beats.filter((b) => b.at >= t0 - 1e-9).map(shift),
    total: Math.max(0, plan.total - t0),
  }
}

function range(a: number, b: number): number[] {
  const [lo, hi] = a <= b ? [a, b] : [b, a]
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
}

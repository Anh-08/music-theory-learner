import type { Groove } from '../../audio/grooves'
import { parsePattern, type Rhythm } from '../../audio/rhythms'
import type { Locale } from '../../i18n/locale'

/** User-created rhythms, stored in the browser. */
export interface CustomRhythm {
  id: string
  name: string
  beatsPerBar: 2 | 3 | 4
  stepsPerBeat: 2 | 3 | 4
  pattern: string
  /** Beats shown in sixteenths (see `Rhythm.splitBeats`). */
  splitBeats?: number[]
  groove: Groove['id']
  defaultTempo: number
}

export function toRhythm(c: CustomRhythm): Rhythm {
  const steps = parsePattern(c.pattern)
  const strums = steps.some((s) => s.kind === 'strum' || s.kind === 'mute')
  return {
    id: c.id,
    name: { vi: c.name, en: c.name },
    kind: strums ? 'strum' : 'pick',
    beatsPerBar: c.beatsPerBar,
    stepsPerBeat: c.stepsPerBeat,
    pattern: c.pattern,
    ...(c.splitBeats ? { splitBeats: c.splitBeats } : {}),
    defaultTempo: c.defaultTempo,
    groove: c.groove,
    description: { vi: '', en: '' },
  }
}

/** Time signature: beats split in three are compound time (6/8, 9/8, 12/8). */
export function timeSignature(r: Pick<Rhythm, 'beatsPerBar' | 'stepsPerBeat'>): string {
  return r.stepsPerBeat === 3 ? `${r.beatsPerBar * 3}/8` : `${r.beatsPerBar}/4`
}

/** Rhythm name with its time signature, unless the name already shows it: "Ballad / Pop (4/4)", "Slow Rock 6/8". */
export function rhythmLabel(r: Pick<Rhythm, 'beatsPerBar' | 'stepsPerBeat' | 'name'>, locale: Locale): string {
  const sig = timeSignature(r)
  const name = r.name[locale]
  return name.includes(sig) ? name : `${name} (${sig})`
}

/** A new unique id: "custom-1", "custom-2"… */
export function nextCustomId(existing: CustomRhythm[]): string {
  let n = existing.length + 1
  while (existing.some((c) => c.id === `custom-${n}`)) n++
  return `custom-${n}`
}

import type { Groove } from '../../audio/grooves'
import { parsePattern, type Rhythm } from '../../audio/rhythms'

/** User-created rhythms, stored in the browser. */
export interface CustomRhythm {
  id: string
  name: string
  beatsPerBar: 3 | 4
  stepsPerBeat: 2 | 3 | 4
  pattern: string
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
    defaultTempo: c.defaultTempo,
    groove: c.groove,
    description: { vi: '', en: '' },
  }
}

export function timeSignature(r: Pick<Rhythm, 'beatsPerBar' | 'stepsPerBeat'>): string {
  if (r.beatsPerBar === 3) return '3/4'
  return r.stepsPerBeat === 3 ? '12/8' : '4/4'
}

/** A new unique id: "custom-1", "custom-2"… */
export function nextCustomId(existing: CustomRhythm[]): string {
  let n = existing.length + 1
  while (existing.some((c) => c.id === `custom-${n}`)) n++
  return `custom-${n}`
}

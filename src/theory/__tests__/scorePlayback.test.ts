import { describe, expect, it } from 'vitest'
import { newScore, type Measure, type ScoreEvent, type Technique } from '../score'
import { beatTicks, beatsPerBar, playOrder, scoreToEvents } from '../scorePlayback'

const bar = (extra: Partial<Measure> = {}): Measure => ({ events: [], ...extra })
const note = (duration: ScoreEvent['duration'], midi = 64, extra: Partial<ScoreEvent> = {}, tech?: Technique[]): ScoreEvent => ({
  duration,
  dots: 0,
  notes: [{ midi, string: 1, ...(tech ? { tech } : {}) }],
  ...extra,
})
const rest = (duration: ScoreEvent['duration']): ScoreEvent => ({ duration, dots: 0, notes: [], rest: true })
const order = (measures: Measure[]) => playOrder({ measures })

describe('play order', () => {
  it('plays straight through without repeats', () => {
    expect(order([bar(), bar(), bar()])).toEqual([0, 1, 2])
  })

  it('repeats back to the start or the last repeat sign', () => {
    expect(order([bar(), bar({ repeatEnd: { times: 2 } }), bar()])).toEqual([0, 1, 0, 1, 2])
    expect(order([bar(), bar({ repeatStart: true }), bar({ repeatEnd: { times: 3 } }), bar()])).toEqual([0, 1, 2, 1, 2, 1, 2, 3])
  })

  it('follows 1st and 2nd endings', () => {
    const ms = [bar({ repeatStart: true }), bar(), bar({ ending: [1], repeatEnd: { times: 2 } }), bar({ ending: [2] }), bar()]
    expect(order(ms)).toEqual([0, 1, 2, 0, 1, 3, 4])
  })

  it('handles two repeated sections in a row', () => {
    const ms = [bar({ repeatEnd: { times: 2 } }), bar(), bar({ repeatEnd: { times: 2 } })]
    expect(order(ms)).toEqual([0, 0, 1, 2, 1, 2])
  })

  it('handles a section after endings', () => {
    const ms = [bar({ ending: [1], repeatEnd: { times: 2 } }), bar({ ending: [2] }), bar(), bar({ repeatEnd: { times: 2 } })]
    expect(order(ms)).toEqual([0, 1, 2, 3, 2, 3])
  })
})

describe('beats', () => {
  it('counts dotted quarters in compound meters', () => {
    expect(beatTicks([4, 4])).toBe(480)
    expect(beatTicks([6, 8])).toBe(720)
    expect(beatTicks([3, 8])).toBe(240)
    expect(beatTicks([7, 8])).toBe(240)
    expect(beatsPerBar([12, 8])).toBe(4)
    expect(beatsPerBar([3, 4])).toBe(3)
  })
})

describe('score to events', () => {
  const at60 = (measures: Measure[], extra = {}) => newScore('a', { tempo: 60, measures, ...extra })

  it('times notes from the tempo (quarter = 1 s at 60)', () => {
    const plan = scoreToEvents(at60([bar({ events: [note('q'), note('8'), note('8'), note('h')] })]))
    expect(plan.events.map((e) => e.at)).toEqual([0, 1, 1.5, 2])
    expect(plan.total).toBe(4)
    expect(plan.beats.map((b) => b.at)).toEqual([0, 1, 2, 3])
    expect(plan.beats[0].downbeat).toBe(true)
    expect(plan.beat).toBe(1)
  })

  it('applies the speed factor', () => {
    const plan = scoreToEvents(at60([bar({ events: [note('q'), note('q')] })]), { speed: 0.5 })
    expect(plan.events[1].at).toBe(2)
  })

  it('makes empty and short bars last a full bar', () => {
    const plan = scoreToEvents(at60([bar(), bar({ events: [note('q')] }), bar({ events: [note('q')] })]))
    expect(plan.events.map((e) => e.at)).toEqual([4, 8])
    expect(plan.total).toBe(12)
  })

  it('counts compound meters in dotted quarters', () => {
    const plan = scoreToEvents(at60([bar({ events: [note('q', 64, { dots: 1 }), note('q', 64, { dots: 1 })] })], { timeSig: [6, 8] }))
    expect(plan.events[1].at).toBe(1)
    expect(plan.total).toBe(2)
  })

  it('merges tied notes into one sound, across bars', () => {
    const plan = scoreToEvents(at60([bar({ events: [note('h'), note('h', 64, { tieToNext: true })] }), bar({ events: [note('q'), note('q', 65)] })]))
    const sounds = plan.events.flatMap((e) => e.sounds)
    expect(sounds.map((s) => [s.midi, s.at, s.duration])).toEqual([
      [64, 0, 2],
      [64, 2, 3],
      [65, 5, 1],
    ])
    expect(plan.events).toHaveLength(4) // the continuation still moves the cursor
  })

  it('does not sound rests', () => {
    const plan = scoreToEvents(at60([bar({ events: [rest('h'), note('h')] })]))
    expect(plan.events[0].sounds).toEqual([])
    expect(plan.events[1].sounds).toHaveLength(1)
  })

  it('approximates techniques', () => {
    const plan = scoreToEvents(
      at60([bar({ events: [note('q', 64, {}, ['hammer']), note('q', 66), note('q', 67, {}, ['bendFull']), note('q', 64, {}, ['palmMute'])] })]),
    )
    const [a, b, c, d] = plan.events
    expect(b.sounds[0].velocity).toBeLessThan(a.sounds[0].velocity)
    expect(c.sounds.map((s) => s.midi)).toEqual([67, 69])
    expect(c.sounds[1].at).toBeGreaterThan(c.sounds[0].at)
    expect(d.sounds[0].duration).toBeLessThan(0.5)
  })

  it('lets let-ring notes sustain to the end of the bar', () => {
    const plan = scoreToEvents(at60([bar({ events: [note('8', 64, {}, ['letRing']), rest('8'), rest('h', ), rest('q')] })]))
    expect(plan.events[0].sounds[0].duration).toBe(4)
  })

  it('unrolls repeats', () => {
    const plan = scoreToEvents(at60([bar({ events: [note('w', 60)], repeatEnd: { times: 2 } }), bar({ events: [note('w', 62)] })]))
    expect(plan.events.map((e) => [e.ref.measure, e.at])).toEqual([
      [0, 0],
      [0, 4],
      [1, 8],
    ])
  })

  it('starts from the cursor', () => {
    const s = at60([bar({ events: [note('h'), note('h', 65)] }), bar(), bar({ events: [note('w', 67)] })])
    const plan = scoreToEvents(s, { from: { measure: 0, event: 1 } })
    expect(plan.events.map((e) => [e.ref.measure, e.at])).toEqual([
      [0, 0],
      [2, 6],
    ])
    expect(plan.total).toBe(10)
    expect(plan.beats[0].at).toBe(0)
    const fromEmpty = scoreToEvents(s, { from: { measure: 1, event: 0 } })
    expect(fromEmpty.events[0].at).toBe(4)
    const fromAppend = scoreToEvents(s, { from: { measure: 2, event: 1 } })
    expect(fromAppend.events).toEqual([])
  })

  it('plays only the selected bars for looping', () => {
    const s = at60([bar({ events: [note('w', 60)], repeatEnd: { times: 2 } }), bar({ events: [note('w', 62)] }), bar({ events: [note('w', 64)] })])
    const plan = scoreToEvents(s, { bars: [2, 1] })
    expect(plan.events.map((e) => e.ref.measure)).toEqual([1, 2])
    expect(plan.total).toBe(8)
  })
})

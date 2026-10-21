import { midiAt, newScore, type Duration, type Measure, type Score, type ScoreEvent, type Technique } from '../../theory/score'

/**
 * Starter scores, written for this app (common practice patterns — no songs).
 * Notes are given as "string:fret" so they read like tab.
 */

export type TemplateId = 'empty' | 'blues' | 'pentatonic'
export const TEMPLATE_IDS: TemplateId[] = ['empty', 'blues', 'pentatonic']

const BASE = newScore('tmp')

function ev(duration: Duration, positions: string, tech: Partial<Record<string, Technique[]>> = {}): ScoreEvent {
  const notes = positions
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => {
      const [s, f] = p.split(':').map(Number)
      const n: ScoreEvent['notes'][number] = { midi: midiAt(BASE, s, f), string: s }
      if (tech[p]) n.tech = tech[p]
      return n
    })
  return notes.length ? { duration, dots: 0, notes } : { duration, dots: 0, notes: [], rest: true }
}

/** One bar of the classic boogie shuffle on two strings (root string open, 5th ↔ 6th above). */
function boogie(low: number, chord: string): Measure {
  const hi = low - 1
  const pair = (f: number) => ev('8', `${low}:0 ${hi}:${f}`)
  return { events: [pair(2), pair(2), pair(4), pair(4), pair(2), pair(2), pair(4), pair(4)], chords: [{ tick: 0, symbol: chord }] }
}

export function buildTemplate(id: TemplateId, scoreId: string, title: string): Score {
  if (id === 'blues') {
    const A = () => boogie(5, 'A7')
    const D = () => boogie(4, 'D7')
    const E = () => boogie(6, 'E7')
    const measures = [A(), A(), A(), A(), D(), D(), A(), A(), E(), D(), A(), E()]
    measures[0].repeatStart = true
    measures[11].repeatEnd = { times: 2 }
    return newScore(scoreId, { title, tempo: 110, keySig: 'A', measures })
  }
  if (id === 'pentatonic') {
    const up = '6:5 6:8 5:5 5:7 4:5 4:7 3:5 3:7 2:5 2:8 1:5 1:8'.split(' ')
    const notes = [...up, ...[...up].reverse()].map((p) => ev('8', p))
    const bars: Measure[] = [0, 1, 2].map((i) => ({ events: notes.slice(i * 8, i * 8 + 8) }))
    bars[0].chords = [{ tick: 0, symbol: 'Am' }]
    // A short lick: bend the 4th up a whole step, pull-off, land on the root with vibrato.
    bars.push({
      events: [ev('q', '3:7', { '3:7': ['bendFull'] }), ev('8', '2:8', { '2:8': ['pull'] }), ev('8', '2:5'), ev('h', '4:7', { '4:7': ['vibrato'] })],
      chords: [{ tick: 0, symbol: 'Am' }],
    })
    return newScore(scoreId, { title, tempo: 80, keySig: 'Am', measures: bars })
  }
  return newScore(scoreId, { title, measures: Array.from({ length: 8 }, () => ({ events: [] })) })
}

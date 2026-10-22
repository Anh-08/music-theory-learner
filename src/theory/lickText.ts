import { eventStarts, midiAt, newScore, type Duration, type Score, type ScoreEvent, type ScoreNote, type Technique } from './score'
import { makeEvent, padMeasure, placeEvent, setChord, type Cursor } from './scoreEdit'

/**
 * A short text notation for licks written inside lessons, e.g.
 *
 *   `[Am] 8 5:5h 5:7 4:5 4:7p | q 3:7b 2:5~ h 4:7+3:5 | r`
 *
 * - `w h q 8 16 32` set the duration of the following notes; add `.` for dotted (`q.`) or `t` for triplets (`8t`).
 * - `S:F` is string S, fret F (string 1 = highest). Join notes played together with `+`.
 * - Suffixes after the fret: `h` hammer-on, `p` pull-off, `s` slide, `b` whole-step bend, `½` half-step bend,
 *   `~` vibrato, `x` dead note, `m` palm mute, `t` tie to the next note.
 * - `r` is a rest, `[Am7]` writes a chord symbol over the next note, `|` is only for reading (bars fill themselves).
 */

export class LickSyntaxError extends Error {
  readonly token: string
  constructor(token: string) {
    super(`Cannot read "${token}" in the lick`)
    this.token = token
  }
}

const SUFFIX: Record<string, Technique> = { h: 'hammer', p: 'pull', s: 'slide', b: 'bendFull', '½': 'bendHalf', '~': 'vibrato', x: 'dead', m: 'palmMute' }

export interface LickOptions {
  keySig?: string
  tempo?: number
  timeSig?: [number, number]
  tuning?: string
  title?: string
}

export function parseLick(text: string, opts: LickOptions = {}): Score {
  let score = newScore('lick', { title: opts.title ?? '', keySig: opts.keySig ?? 'C', tempo: opts.tempo ?? 90, timeSig: opts.timeSig ?? [4, 4], tuning: opts.tuning ?? 'standard', measures: [{ events: [] }] })
  let cursor: Cursor = { measure: 0, event: 0, string: 1 }
  let value: Pick<ScoreEvent, 'duration' | 'dots' | 'tuplet'> = { duration: '8', dots: 0 }
  let chord: string | null = null

  const place = (e: ScoreEvent) => {
    const r = placeEvent(score, cursor, e)
    score = r.score
    cursor = r.cursor
    if (chord) {
      score = setChord(score, r.at.measure, eventStarts(score.measures[r.at.measure])[r.at.event], chord)
      chord = null
    }
  }

  for (const token of text.trim().split(/\s+/).filter(Boolean)) {
    if (token === '|') continue
    const dur = token.match(/^(w|h|q|8|16|32)(\.?)(t?)$/)
    if (dur) {
      value = { duration: dur[1] as Duration, dots: dur[2] ? 1 : 0, ...(dur[3] ? { tuplet: 3 as const } : {}) }
      continue
    }
    const sym = token.match(/^\[(.+)\]$/)
    if (sym) {
      chord = sym[1]
      continue
    }
    if (token === 'r') {
      place(makeEvent(value))
      continue
    }
    let tie = false
    const notes: ScoreNote[] = token.split('+').map((part) => {
      const m = part.match(/^(\d{1,2}):(\d{1,2})([hpsb½~xmt]*)$/)
      if (!m) throw new LickSyntaxError(token)
      const string = Number(m[1])
      const fret = Number(m[2])
      const note: ScoreNote = { midi: midiAt(score, string, fret), string }
      const tech = [...m[3]].filter((c) => c !== 't').map((c) => SUFFIX[c])
      if (m[3].includes('t')) tie = true
      if (tech.length) note.tech = [...new Set(tech)]
      return note
    })
    const e = makeEvent(value, notes)
    if (tie) e.tieToNext = true
    place(e)
  }
  // Never leave the last bar half empty: rests fill it, as in printed music.
  return padMeasure(score, score.measures.length - 1)
}

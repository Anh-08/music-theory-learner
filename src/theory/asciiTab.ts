import { Note } from 'tonal'
import { TUNINGS } from './fretboard'
import { eventStarts, eventTicks, fretOf, midiAt, newScore, scoreTuning, type Duration, type Score, type ScoreEvent, type ScoreNote, type Technique } from './score'
import { makeEvent, placeEvent, type Cursor } from './scoreEdit'

/**
 * Plain-text ("ASCII") tab, as found on forums: one line per string, frets as numbers.
 * Export keeps a little rhythm through spacing; import is best effort — the rhythm is not in the text,
 * so every column becomes the same default value and the user fixes it afterwards.
 */

const BARS_PER_LINE = 4

/** Extra dashes after an event, by written value (longer values get more room). */
const PAD: Record<Duration, number> = { w: 7, h: 4, q: 2, '8': 1, '16': 1, '32': 1 }

function stringNames(score: Score): string[] {
  const t = scoreTuning(score)
  // Index 0 = string 1 (top line).
  const names = [...t.strings].reverse().map((n) => Note.pitchClass(n))
  // Guitarists write the top E in lower case so the two E strings can be told apart.
  if (names.length > 1 && names[0] === names[names.length - 1]) names[0] = names[0].toLowerCase()
  const w = Math.max(...names.map((n) => n.length))
  return names.map((n) => n.padEnd(w, ' '))
}

function noteText(score: Score, n: ScoreNote, next?: ScoreEvent): string {
  const fret = fretOf(score, n)
  const tech = n.tech ?? []
  if (!Number.isFinite(fret)) return '?'
  if (tech.includes('dead')) return 'x'
  let s = tech.includes('harmonic') ? `<${fret}>` : String(fret)
  if (tech.includes('bendFull')) s += `b${fret + 2}`
  else if (tech.includes('bendHalf')) s += `b${fret + 1}`
  const target = next?.notes.find((x) => x.string === n.string)
  if (tech.includes('hammer')) s += 'h'
  else if (tech.includes('pull')) s += 'p'
  else if (tech.includes('slide')) s += target && target.midi < n.midi ? '\\' : '/'
  if (tech.includes('vibrato')) s += '~'
  return s
}

/** The score as plain-text tab with a short header. */
export function scoreToAsciiTab(score: Score): string {
  const names = stringNames(score)
  const lines: string[] = []
  if (score.title) lines.push(score.title)
  const tuningName = TUNINGS.find((t) => t.id === score.tuning)?.name.en ?? score.tuning
  lines.push(`Tuning: ${tuningName}${score.capo ? ` · Capo ${score.capo}` : ''} · ${score.timeSig.join('/')} · ${score.tempo} BPM`)
  lines.push('')

  const flat = score.measures.flatMap((m) => m.events)
  let k = 0 // index into `flat`, for looking at the next event
  for (let first = 0; first < score.measures.length; first += BARS_PER_LINE) {
    const rows = names.map((n) => `${n}|`)
    let top = ' '.repeat(names[0].length + 1) // chord symbols / palm mutes
    for (const m of score.measures.slice(first, first + BARS_PER_LINE)) {
      const starts = eventStarts(m)
      const chordAt = new Map((m.chords ?? []).map((c) => [starts.findIndex((s, i) => c.tick >= s && c.tick < s + eventTicks(m.events[i])), c.symbol]))
      const cells = m.events.length ? m.events : [null]
      cells.forEach((e, i) => {
        const texts = rows.map((_, si) => {
          const n = e?.notes.find((x) => x.string === si + 1)
          return n && !e?.rest ? noteText(score, n, flat[k + 1]) : ''
        })
        const width = Math.max(1, ...texts.map((x) => x.length)) + (e ? PAD[e.duration] : 8)
        rows.forEach((_, si) => (rows[si] += '-' + texts[si].padEnd(width, '-')))
        let label = chordAt.get(i) ?? ''
        if (e?.notes.some((n) => n.tech?.includes('palmMute'))) label = label ? `${label} PM` : 'PM'
        top += ' ' + label.slice(0, width).padEnd(width, ' ')
        if (e) k++
      })
      rows.forEach((_, si) => (rows[si] += '-|'))
      top += '  '
    }
    if (top.trim()) lines.push(top.trimEnd())
    lines.push(...rows, '')
  }
  return lines.join('\n').trimEnd() + '\n'
}

// ---------------------------------------------------------------------------------------------
// Import

export interface AsciiImport {
  score: Score
  /** Characters that were not understood (ignored). */
  skipped: number
}

const TAB_LINE = /^\s*([A-Ga-g][#b]?)?\s*[|:]?([-0-9|xXhpbr/\\~<>().sS ]*-[-0-9|xXhpbr/\\~<>().sS ]*)$/

interface Hit {
  col: number
  fret: number
  dead: boolean
  harmonic: boolean
  tech: Technique[]
}

function readLine(line: string): { hits: Hit[]; skipped: number } {
  const hits: Hit[] = []
  let skipped = 0
  let i = 0
  while (i < line.length) {
    const c = line[i]
    if (/\d/.test(c)) {
      const col = i
      let num = ''
      while (i < line.length && /\d/.test(line[i]) && num.length < 2) num += line[i++]
      const hit: Hit = { col, fret: Number(num), dead: false, harmonic: false, tech: [] }
      if (line[col - 1] === '<' && line[i] === '>') {
        hit.harmonic = true
        i++
      }
      // Technique letters right after the fret.
      while (i < line.length && /[hpb/\\~]/.test(line[i])) {
        const t = line[i++]
        if (t === 'h') hit.tech.push('hammer')
        else if (t === 'p') hit.tech.push('pull')
        else if (t === '/' || t === '\\') hit.tech.push('slide')
        else if (t === '~') hit.tech.push('vibrato')
        else if (t === 'b') {
          let target = ''
          while (i < line.length && /\d/.test(line[i]) && target.length < 2) target += line[i++]
          hit.tech.push(target && Number(target) - hit.fret === 1 ? 'bendHalf' : 'bendFull')
        }
      }
      hits.push(hit)
      continue
    }
    if (c === 'x' || c === 'X') hits.push({ col: i, fret: 0, dead: true, harmonic: false, tech: [] })
    else if (!/[-|:<>()\s.rsS]/.test(c)) skipped++
    i++
  }
  return { hits, skipped }
}

/** Groups consecutive tab lines into blocks (one block = one line of music, all strings). */
function blocks(text: string): string[][] {
  const out: string[][] = []
  let cur: string[] = []
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    if (TAB_LINE.test(raw) && raw.includes('-')) cur.push(raw)
    else {
      if (cur.length >= 4) out.push(cur)
      cur = []
    }
  }
  if (cur.length >= 4) out.push(cur)
  return out
}

/** Tuning guessed from the number of strings. */
function tuningFor(strings: number): string {
  if (strings === 4) return 'bass4'
  if (strings === 5) return 'bass5'
  return 'standard'
}

/**
 * Reads plain-text tab into a score. Every column with notes becomes one event of `duration`; notes starting in the
 * same column are a chord. Bar lines in the text are ignored — bars are refilled from the time signature.
 * Returns null when no tab is found.
 */
export function parseAsciiTab(text: string, id: string, duration: Duration = '8'): AsciiImport | null {
  const found = blocks(text)
  if (found.length === 0) return null
  const strings = Math.min(6, found[0].length)
  let score = newScore(id, { tuning: tuningFor(strings), measures: [{ events: [] }] })
  let cursor: Cursor = { measure: 0, event: 0, string: 1 }
  let skipped = 0
  for (const block of found) {
    const columns = new Map<number, ScoreNote[]>()
    block.slice(0, strings).forEach((line, si) => {
      // Strip the string name so its letters are not read as notes.
      const body = line.replace(/^\s*[A-Ga-g][#b]?\s*(?=[|:-])/, (m) => ' '.repeat(m.length))
      const r = readLine(body)
      skipped += r.skipped
      for (const h of r.hits) {
        const string = si + 1
        // Two-digit frets on one string may start a column earlier than single digits on another: snap to a nearby column.
        const col = [...columns.keys()].find((c) => Math.abs(c - h.col) <= 1 && !columns.get(c)!.some((n) => n.string === string)) ?? h.col
        const tech: Technique[] = [...h.tech, ...(h.dead ? (['dead'] as const) : []), ...(h.harmonic ? (['harmonic'] as const) : [])]
        const note: ScoreNote = { midi: midiAt(score, string, h.fret), string }
        if (tech.length) note.tech = tech
        columns.set(col, [...(columns.get(col) ?? []), note])
      }
    })
    for (const col of [...columns.keys()].sort((a, b) => a - b)) {
      const r = placeEvent(score, cursor, makeEvent({ duration, dots: 0 }, columns.get(col)!))
      score = r.score
      cursor = r.cursor
    }
  }
  return { score, skipped }
}

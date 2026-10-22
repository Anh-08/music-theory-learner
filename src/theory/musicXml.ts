import { Note } from 'tonal'
import { keySignature } from './keys'
import { parseProgression } from './progression'
import { TICKS_PER_QUARTER, eventStarts, eventTicks, fretOf, measureCapacity, scoreKey, scoreTuning, spellMidi, type Duration, type Score, type ScoreEvent, type ScoreNote } from './score'
import { beatTicks } from './scorePlayback'

/**
 * MusicXML 4.0 export (single part, one voice) so a score opens in MuseScore, Guitar Pro, Sibelius…
 * Notes carry their string and fret, so programs that show tab can rebuild it.
 * Guitar and bass are written with an octave-down clef ("treble 8"), pitches are sounding pitches.
 */

const TYPE: Record<Duration, string> = { w: 'whole', h: 'half', q: 'quarter', '8': 'eighth', '16': '16th', '32': '32nd' }

const KIND: Record<string, string> = {
  '': 'major',
  m: 'minor',
  '7': 'dominant',
  maj7: 'major-seventh',
  m7: 'minor-seventh',
  dim: 'diminished',
  dim7: 'diminished-seventh',
  aug: 'augmented',
  m7b5: 'half-diminished',
  sus2: 'suspended-second',
  sus4: 'suspended-fourth',
  '6': 'major-sixth',
  m6: 'minor-sixth',
  '9': 'dominant-ninth',
  maj9: 'major-ninth',
  m9: 'minor-ninth',
  mMaj7: 'major-minor',
  '5': 'power',
}

const OCTAVE_DOWN = new Set(['standard', 'half-down', 'drop-d', 'dadgad', 'open-g', 'bass4', 'bass5'])
const BASS = new Set(['bass4', 'bass5'])

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function pitchXml(name: string): string {
  const n = Note.get(name)
  const alter = n.alt ? `<alter>${n.alt}</alter>` : ''
  return `<pitch><step>${n.letter}</step>${alter}<octave>${n.oct}</octave></pitch>`
}

function stepAlter(name: string, prefix: 'root' | 'bass'): string {
  const n = Note.get(name)
  return `<${prefix}-step>${n.letter}</${prefix}-step>${n.alt ? `<${prefix}-alter>${n.alt}</${prefix}-alter>` : ''}`
}

function harmonyXml(symbol: string): string {
  try {
    const c = parseProgression(symbol)[0]
    const suffix = c.suffix.replace(/^M$/, '')
    const kind = KIND[suffix]
    const kindXml = kind ? `<kind text="${esc(suffix)}">${kind}</kind>` : `<kind text="${esc(suffix)}">other</kind>`
    const bass = c.bass ? `<bass>${stepAlter(c.bass, 'bass')}</bass>` : ''
    return `<harmony><root>${stepAlter(c.root, 'root')}</root>${kindXml}${bass}</harmony>`
  } catch {
    return ''
  }
}

interface Flat {
  e: ScoreEvent
  measure: number
}

export function scoreToMusicXml(score: Score): string {
  const key = scoreKey(score)
  const sig = keySignature(key)
  const fifths = sig.sharps.length - sig.flats.length
  const tuning = scoreTuning(score)
  const cap = measureCapacity(score.timeSig)
  const flat: Flat[] = score.measures.flatMap((m, measure) => m.events.map((e) => ({ e, measure })))
  let k = 0

  const clef = BASS.has(score.tuning)
    ? `<clef><sign>F</sign><line>4</line>${OCTAVE_DOWN.has(score.tuning) ? '<clef-octave-change>-1</clef-octave-change>' : ''}</clef>`
    : `<clef><sign>G</sign><line>2</line>${OCTAVE_DOWN.has(score.tuning) ? '<clef-octave-change>-1</clef-octave-change>' : ''}</clef>`
  const tuningXml = [...tuning.strings]
    .map((s, i) => {
      const n = Note.get(s)
      return `<staff-tuning line="${i + 1}"><tuning-step>${n.letter}</tuning-step>${n.alt ? `<tuning-alter>${n.alt}</tuning-alter>` : ''}<tuning-octave>${n.oct}</tuning-octave></staff-tuning>`
    })
    .join('')
  const compound = beatTicks(score.timeSig) === TICKS_PER_QUARTER * 1.5
  const quarterTempo = Math.round(score.tempo * (beatTicks(score.timeSig) / TICKS_PER_QUARTER))

  const measures = score.measures.map((m, mi) => {
    const parts: string[] = []
    if (mi === 0) {
      parts.push(
        `<attributes><divisions>${TICKS_PER_QUARTER}</divisions><key><fifths>${fifths}</fifths><mode>${key.mode}</mode></key>` +
          `<time><beats>${score.timeSig[0]}</beats><beat-type>${score.timeSig[1]}</beat-type></time>${clef}` +
          `<staff-details><staff-lines>5</staff-lines>${tuningXml}${score.capo ? `<capo>${score.capo}</capo>` : ''}</staff-details></attributes>`,
      )
      parts.push(
        `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit>${compound ? '<beat-unit-dot/>' : ''}<per-minute>${score.tempo}</per-minute></metronome></direction-type><sound tempo="${quarterTempo}"/></direction>`,
      )
    }
    // Left barline: repeat start and/or the start of an ending.
    const prevEnding = score.measures[mi - 1]?.ending?.join()
    const endingStart = m.ending && prevEnding !== m.ending.join()
    if (m.repeatStart || endingStart) {
      parts.push(
        `<barline location="left">${m.repeatStart ? '<bar-style>heavy-light</bar-style>' : ''}${endingStart ? `<ending number="${m.ending!.join(', ')}" type="start"/>` : ''}${m.repeatStart ? '<repeat direction="forward"/>' : ''}</barline>`,
      )
    }

    const starts = eventStarts(m)
    const chordsAt = new Map<number, string[]>()
    for (const c of m.chords ?? []) {
      const i = Math.max(0, starts.findIndex((s, idx) => c.tick >= s && c.tick < s + eventTicks(m.events[idx])))
      chordsAt.set(i, [...(chordsAt.get(i) ?? []), c.symbol])
    }

    if (m.events.length === 0) {
      for (const sym of chordsAt.get(0) ?? []) parts.push(harmonyXml(sym))
      parts.push(`<note><rest measure="yes"/><duration>${cap}</duration><voice>1</voice></note>`)
    }
    m.events.forEach((e, ei) => {
      for (const sym of chordsAt.get(ei) ?? []) parts.push(harmonyXml(sym))
      const prev = flat[k - 1]?.e
      const next = flat[k + 1]?.e
      k++
      const dur = eventTicks(e)
      const common =
        `<duration>${dur}</duration>` +
        `<voice>1</voice><type>${TYPE[e.duration]}</type>${'<dot/>'.repeat(e.dots)}` +
        (e.tuplet ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' : '')
      if (e.rest || e.notes.length === 0) {
        parts.push(`<note><rest/>${common}</note>`)
        return
      }
      const notes = [...e.notes].sort((a, b) => a.midi - b.midi)
      notes.forEach((n, i) => parts.push(noteXml(score, key, n, i > 0, common, e, prev, next)))
    })

    // Right barline: repeat end and/or the end of an ending.
    const nextEnding = score.measures[mi + 1]?.ending?.join()
    const endingStop = m.ending && nextEnding !== m.ending.join()
    const last = mi === score.measures.length - 1
    if (m.repeatEnd || endingStop || last) {
      const style = m.repeatEnd || last ? '<bar-style>light-heavy</bar-style>' : ''
      const stop = endingStop ? `<ending number="${m.ending!.join(', ')}" type="${m.repeatEnd ? 'stop' : 'discontinue'}"/>` : ''
      const rep = m.repeatEnd ? `<repeat direction="backward" times="${m.repeatEnd.times}"/>` : ''
      parts.push(`<barline location="right">${style}${stop}${rep}</barline>`)
    }
    return `<measure number="${mi + 1}">${parts.join('')}</measure>`
  })

  const title = esc(score.title || 'Untitled')
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` +
    `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n` +
    `<score-partwise version="4.0"><work><work-title>${title}</work-title></work>` +
    `<identification><encoding><software>Music Theory Learner</software></encoding></identification>` +
    `<part-list><score-part id="P1"><part-name>${BASS.has(score.tuning) ? 'Bass' : 'Guitar'}</part-name></score-part></part-list>` +
    `<part id="P1">${measures.join('')}</part></score-partwise>\n`
  )
}

function noteXml(score: Score, key: ReturnType<typeof scoreKey>, n: ScoreNote, chord: boolean, common: string, e: ScoreEvent, prev: ScoreEvent | undefined, next: ScoreEvent | undefined): string {
  const tech = n.tech ?? []
  const fromPrev = prev?.notes.find((x) => x.string === n.string)
  const prevTech = fromPrev?.tech ?? []
  const tiedFrom = !!prev?.tieToNext && !!prev.notes.some((x) => x.midi === n.midi)
  const tiedTo = !!e.tieToNext && !!next?.notes.some((x) => x.midi === n.midi)
  const ties = (tiedFrom ? '<tie type="stop"/>' : '') + (tiedTo ? '<tie type="start"/>' : '')
  const tied = (tiedFrom ? '<tied type="stop"/>' : '') + (tiedTo ? '<tied type="start"/>' : '')

  const technical: string[] = []
  const fret = fretOf(score, n)
  if (Number.isFinite(fret)) technical.push(`<string>${n.string}</string><fret>${fret}</fret>`)
  if (tech.includes('hammer')) technical.push('<hammer-on type="start">H</hammer-on>')
  if (prevTech.includes('hammer')) technical.push('<hammer-on type="stop"/>')
  if (tech.includes('pull')) technical.push('<pull-off type="start">P</pull-off>')
  if (prevTech.includes('pull')) technical.push('<pull-off type="stop"/>')
  if (tech.includes('bendFull') || tech.includes('bendHalf')) technical.push(`<bend><bend-alter>${tech.includes('bendFull') ? 2 : 1}</bend-alter></bend>`)
  if (tech.includes('harmonic')) technical.push('<harmonic><natural/></harmonic>')
  const slides = (tech.includes('slide') ? '<slide type="start"/>' : '') + (prevTech.includes('slide') ? '<slide type="stop"/>' : '')
  const notations = tied + slides + (technical.length ? `<technical>${technical.join('')}</technical>` : '')
  const head = tech.includes('dead') ? '<notehead>x</notehead>' : ''
  // `common` holds duration, voice, type, dots, time-modification — ties must sit between duration and voice.
  const withTies = common.replace('</duration>', `</duration>${ties}`)
  return `<note>${chord ? '<chord/>' : ''}${pitchXml(spellMidi(n.midi, key))}${withTies}${head}${notations ? `<notations>${notations}</notations>` : ''}</note>`
}

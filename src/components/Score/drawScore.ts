import type * as VexNS from 'vexflow'
import { Note as TonalNote } from 'tonal'
import { MAX_FRET, eventStarts, eventTicks, fretOf, scoreKey, scoreTuning, spellMidi, type Measure, type Score, type ScoreEvent } from '../../theory/score'
import { LAYOUT, type MeasureBox, type ScoreGeometry, type ScoreLayout, type ScoreViewMode, type SystemBox, type EventBox } from '../../theory/scoreLayout'

/**
 * Draws a `Score` into a container with VexFlow, following a precomputed `ScoreLayout`, and returns
 * where every event ended up (for the cursor overlay and click hit-testing).
 * VexFlow is passed in (it is loaded lazily), so this module never pulls it into the main bundle.
 */

export type Vex = typeof VexNS

type StaveNoteT = InstanceType<Vex['StaveNote']>
type TabNoteT = InstanceType<Vex['TabNote']>
type NoteT = InstanceType<Vex['Note']>
type StaveT = InstanceType<Vex['Stave']>

/** Tunings written an octave above their sound, with an "8" under the clef (guitar and bass). */
const OCTAVE_DOWN: Record<string, 'treble' | 'bass'> = {
  standard: 'treble',
  'half-down': 'treble',
  'drop-d': 'treble',
  dadgad: 'treble',
  'open-g': 'treble',
  bass4: 'bass',
  bass5: 'bass',
}

interface Drawn {
  staff?: StaveNoteT | NoteT
  tab?: TabNoteT | NoteT
  /** Midis in the order of the staff note's keys (low → high). */
  staffMidis: number[]
  /** Strings in the order of the tab note's positions. */
  tabStrings: number[]
  system: number
}

export interface DrawOptions {
  view: ScoreViewMode
  /** Colour for notes that cannot be played on this neck. */
  errorColor?: string
}

function keySpec(score: Score): string {
  const k = scoreKey(score)
  return k.tonic + (k.mode === 'minor' ? 'm' : '')
}

function vexKey(name: string): string {
  const n = TonalNote.get(name)
  return `${n.letter.toLowerCase()}${n.acc}/${n.oct}`
}

function durationString(e: ScoreEvent, rest = false): string {
  return e.duration + 'd'.repeat(e.dots) + (rest ? 'r' : '')
}

function voltaType(score: Score, i: number, V: Vex): number {
  const same = (a?: number[], b?: number[]) => !!a && !!b && a.join() === b.join()
  const m = score.measures[i]
  const prev = same(score.measures[i - 1]?.ending, m.ending)
  const next = same(score.measures[i + 1]?.ending, m.ending)
  if (prev && next) return V.VoltaType.MID
  if (prev) return V.VoltaType.END
  if (next) return V.VoltaType.BEGIN
  return V.VoltaType.BEGIN_END
}

export function drawScore(V: Vex, container: HTMLElement, score: Score, layout: ScoreLayout, opts: DrawOptions): ScoreGeometry {
  container.innerHTML = ''
  const renderer = new V.Renderer(container as HTMLDivElement, V.Renderer.Backends.SVG)
  renderer.resize(layout.width, Math.max(1, layout.height + 8))
  const ctx = renderer.getContext()

  const showStaff = opts.view !== 'tab'
  const showTab = opts.view !== 'staff'
  const key = scoreKey(score)
  const spec = keySpec(score)
  const clef = OCTAVE_DOWN[score.tuning] ?? 'treble'
  const shift = OCTAVE_DOWN[score.tuning] ? 12 : 0
  const timeSpec = `${score.timeSig[0]}/${score.timeSig[1]}`
  const strings = scoreTuning(score).strings.length
  const errorColor = opts.errorColor ?? '#dc2626'

  const drawn = new Map<string, Drawn>()
  const geo: ScoreGeometry = { systems: [], measures: [], events: [] }

  layout.systems.forEach((system, si) => {
    let stringYs: number[] = []
    for (const lm of system.measures) {
      const m = score.measures[lm.index]
      const staves: StaveT[] = []
      const staff = showStaff ? new V.Stave(lm.x, system.staffY!, lm.width) : undefined
      const tab = showTab ? new V.TabStave(lm.x, system.tabY!, lm.width, { numLines: strings, spaceAboveStaffLn: LAYOUT.tabSpaceAboveLines }) : undefined
      if (staff) staves.push(staff)
      if (tab) staves.push(tab)
      const top = staves[0]

      if (lm.first) {
        staff?.addClef(clef, 'default', shift ? '8vb' : undefined).addKeySignature(spec)
        tab?.addTabGlyph()
        top.setMeasure(lm.index + 1)
      }
      if (lm.index === 0) staves.forEach((s) => s.addTimeSignature(timeSpec))
      if (m.repeatStart) staves.forEach((s) => s.setBegBarType(V.BarlineType.REPEAT_BEGIN))
      if (m.repeatEnd) staves.forEach((s) => s.setEndBarType(V.BarlineType.REPEAT_END))
      else if (lm.index === score.measures.length - 1) staves.forEach((s) => s.setEndBarType(V.BarlineType.END))
      if (m.ending) {
        const type = voltaType(score, lm.index, V)
        const label = type === V.VoltaType.BEGIN || type === V.VoltaType.BEGIN_END ? `${m.ending.join(', ')}.` : ''
        top.setVoltaType(type, label, -6)
      }
      if (staves.length > 1) V.Stave.formatBegModifiers(staves)
      const startX = Math.max(...staves.map((s) => s.getNoteStartX()))
      staves.forEach((s) => s.setNoteStartX(startX))
      staves.forEach((s) => s.setContext(ctx).draw())
      if (tab) stringYs = Array.from({ length: strings }, (_, i) => tab.getYForLine(i))

      // Notes
      const staffNotes: (StaveNoteT | NoteT)[] = []
      const tabNotes: (TabNoteT | NoteT)[] = []
      const starts = eventStarts(m)
      m.events.forEach((e, ei) => {
        const d: Drawn = { staffMidis: [], tabStrings: [], system: si }
        if (staff) {
          d.staff = makeStaffNote(V, e, key, clef, shift, d)
          staffNotes.push(d.staff)
        }
        if (tab) {
          d.tab = makeTabNote(V, score, e, opts.view === 'tab', errorColor, d)
          tabNotes.push(d.tab)
        }
        drawn.set(`${lm.index}:${ei}`, d)
      })
      if (m.events.length === 0) {
        if (staff) staffNotes.push(new V.StaveNote({ keys: ['b/4'], duration: 'wr', alignCenter: true }))
        if (tab) tabNotes.push(new V.GhostNote({ duration: 'w' }))
      }

      // Chord symbols above the top layer.
      const topNotes = staff ? staffNotes : tabNotes
      for (const c of m.chords ?? []) {
        let idx = starts.findIndex((s, i) => c.tick >= s && c.tick < s + eventTicks(m.events[i]))
        if (idx < 0) idx = Math.max(0, Math.min(topNotes.length - 1, starts.length - 1))
        const target = topNotes[idx]
        if (!target) continue
        const a = new V.Annotation(c.symbol).setVerticalJustification(V.Annotation.VerticalJustify.TOP)
        a.setFont('Arial', 13, 'bold')
        target.addModifier(a, 0)
      }

      // Triplets must be built before the voice counts ticks.
      const staffTuplets = staff ? makeTuplets(V, m, staffNotes) : []
      const tabTuplets = tab ? makeTuplets(V, m, tabNotes) : []
      // Tab triplet brackets only make sense when the tab shows rhythm (tab-only view).
      const tuplets = [...staffTuplets, ...(opts.view === 'tab' ? tabTuplets : [])]

      const voices: InstanceType<Vex['Voice']>[] = []
      const makeVoice = (notes: (StaveNoteT | TabNoteT | NoteT)[]) => {
        const v = new V.Voice({ numBeats: score.timeSig[0], beatValue: score.timeSig[1] }).setMode(V.Voice.Mode.SOFT)
        v.addTickables(notes)
        voices.push(v)
        return v
      }
      const staffVoice = staff ? makeVoice(staffNotes) : undefined
      const tabVoice = tab ? makeVoice(tabNotes) : undefined
      if (staffVoice) V.Accidental.applyAccidentals([staffVoice], spec)

      const groups = V.Beam.getDefaultBeamGroups(timeSpec)
      const beams = [
        ...(staff ? V.Beam.generateBeams(staffNotes.filter((n): n is StaveNoteT => n instanceof V.StaveNote), { groups }) : []),
        ...(tab && opts.view === 'tab'
          ? V.Beam.generateBeams(tabNotes.filter((n): n is TabNoteT => n instanceof V.TabNote), { groups, stemDirection: -1 })
          : []),
      ]

      const formatter = new V.Formatter()
      voices.forEach((v) => formatter.joinVoices([v]))
      formatter.format(voices, Math.max(20, lm.x + lm.width - startX - 16))
      if (staffVoice) staffVoice.draw(ctx, staff!)
      if (tabVoice) tabVoice.draw(ctx, tab!)
      beams.forEach((b) => b.setContext(ctx).draw())
      tuplets.forEach((t) => t.setContext(ctx).draw())

      // Geometry
      const xs: number[] = []
      m.events.forEach((_, ei) => {
        const d = drawn.get(`${lm.index}:${ei}`)!
        const n = (d.staff ?? d.tab)!
        const x = n.getAbsoluteX() + (d.tab && 'getWidth' in d.tab ? Math.max(8, d.tab.getWidth()) / 2 : 6)
        xs.push(x)
        geo.events.push({ measure: lm.index, event: ei, x } satisfies EventBox)
      })
      const end = lm.x + lm.width
      const appendX = xs.length ? Math.min(end - 8, xs[xs.length - 1] + Math.max(14, (end - xs[xs.length - 1]) / 2)) : startX + 14
      geo.measures.push({ index: lm.index, system: si, x: lm.x, width: lm.width, appendX } satisfies MeasureBox)
    }
    geo.systems.push({ top: system.y, bottom: system.y + system.height, stringYs } satisfies SystemBox)
  })

  drawTies(V, ctx, score, drawn)
  return geo
}

function makeStaffNote(V: Vex, e: ScoreEvent, key: ReturnType<typeof scoreKey>, clef: string, shift: number, d: Drawn): StaveNoteT {
  if (e.rest || e.notes.length === 0) {
    const n = new V.StaveNote({ keys: [clef === 'bass' ? 'd/3' : 'b/4'], duration: durationString(e, true), clef })
    if (e.dots) V.Dot.buildAndAttach([n], { all: true })
    return n
  }
  const sorted = [...e.notes].sort((a, b) => a.midi - b.midi)
  d.staffMidis = sorted.map((n) => n.midi)
  const keys = sorted.map((n) => vexKey(spellMidi(n.midi + shift, key)) + (n.tech?.includes('dead') ? '/x' : ''))
  const sn = new V.StaveNote({ keys, duration: durationString(e), clef, autoStem: true })
  if (e.dots) V.Dot.buildAndAttach([sn], { all: true })
  return sn
}

function makeTabNote(V: Vex, score: Score, e: ScoreEvent, stems: boolean, errorColor: string, d: Drawn): TabNoteT | NoteT {
  const strings = scoreTuning(score).strings.length
  if (e.rest || e.notes.length === 0) {
    if (!stems) return new V.GhostNote({ duration: durationString(e) })
    const r = new V.StaveNote({ keys: ['b/4'], duration: durationString(e, true) })
    if (e.dots) V.Dot.buildAndAttach([r], { all: true })
    return r
  }
  const notes = [...e.notes].sort((a, b) => b.string - a.string)
  d.tabStrings = notes.map((n) => n.string)
  let bad = false
  const positions = notes.map((n) => {
    const fret = fretOf(score, n)
    const ok = Number.isFinite(fret) && fret >= 0 && fret <= MAX_FRET - score.capo
    if (!ok) bad = true
    const text = !ok ? '?' : n.tech?.includes('dead') ? 'X' : n.tech?.includes('harmonic') ? `<${fret}>` : String(fret)
    return { str: Math.min(n.string, strings), fret: text }
  })
  const tn = new V.TabNote({ positions, duration: durationString(e) }, stems)
  if (stems && e.dots) V.Dot.buildAndAttach([tn], { all: true })
  notes.forEach((n, i) => {
    if (n.tech?.includes('bendHalf')) tn.addModifier(new V.Bend([{ type: V.Bend.UP, text: '½' }]), i)
    if (n.tech?.includes('bendFull')) tn.addModifier(new V.Bend([{ type: V.Bend.UP, text: 'full' }]), i)
    if (n.tech?.includes('vibrato')) tn.addModifier(new V.Vibrato(), i)
  })
  const below = [
    notes.some((n) => n.tech?.includes('palmMute')) ? 'P.M.' : '',
    notes.some((n) => n.tech?.includes('letRing')) ? 'let ring' : '',
  ].filter(Boolean)
  if (below.length) {
    const a = new V.Annotation(below.join(' ')).setVerticalJustification(V.Annotation.VerticalJustify.BOTTOM)
    a.setFont('Arial', 10, 'normal', 'italic')
    tn.addModifier(a, 0)
  }
  if (bad) tn.setStyle({ fillStyle: errorColor, strokeStyle: errorColor })
  return tn
}

/** Brackets consecutive triplet events three at a time. */
function makeTuplets(V: Vex, m: Measure, notes: (StaveNoteT | TabNoteT | NoteT)[]): InstanceType<Vex['Tuplet']>[] {
  const out: InstanceType<Vex['Tuplet']>[] = []
  let group: (StaveNoteT | TabNoteT | NoteT)[] = []
  const flush = () => {
    if (group.length) out.push(new V.Tuplet(group, { numNotes: 3, notesOccupied: 2, bracketed: true, ratioed: false }))
    group = []
  }
  m.events.forEach((e, i) => {
    if (e.tuplet !== 3) return flush()
    group.push(notes[i])
    if (group.length === 3) flush()
  })
  flush()
  return out
}

/** Ties (same pitch, next event) and hammer-on / pull-off / slide arcs (same string, next event), within a system. */
function drawTies(V: Vex, ctx: ReturnType<InstanceType<Vex['Renderer']>['getContext']>, score: Score, drawn: Map<string, Drawn>) {
  const order: { ref: string; e: ScoreEvent }[] = []
  score.measures.forEach((m, mi) => m.events.forEach((e, ei) => order.push({ ref: `${mi}:${ei}`, e })))
  order.forEach(({ ref, e }, k) => {
    const next = order[k + 1]
    if (!next || e.rest || next.e.rest) return
    const a = drawn.get(ref)
    const b = drawn.get(next.ref)
    if (!a || !b) return
    const sameSystem = a.system === b.system
    if (e.tieToNext) {
      const pairs = a.staffMidis.map((m, i) => [i, b.staffMidis.indexOf(m)] as const).filter(([, j]) => j >= 0)
      if (a.staff && b.staff && pairs.length) {
        const tie = new V.StaveTie({
          firstNote: a.staff,
          lastNote: sameSystem ? b.staff : null,
          firstIndexes: pairs.map(([i]) => i),
          lastIndexes: pairs.map(([, j]) => j),
        })
        tie.setContext(ctx).draw()
        if (!sameSystem) new V.StaveTie({ firstNote: null, lastNote: b.staff, firstIndexes: pairs.map(([, j]) => j), lastIndexes: pairs.map(([, j]) => j) }).setContext(ctx).draw()
      }
    }
    if (!sameSystem || !a.tab || !b.tab || !(a.tab instanceof V.TabNote) || !(b.tab instanceof V.TabNote)) return
    e.notes.forEach((n) => {
      const i = a.tabStrings.indexOf(n.string)
      const j = b.tabStrings.indexOf(n.string)
      if (i < 0 || j < 0) return
      const notes = { firstNote: a.tab, lastNote: b.tab, firstIndexes: [i], lastIndexes: [j] }
      const nextMidi = next.e.notes.find((x) => x.string === n.string)!.midi
      if (n.tech?.includes('hammer')) V.TabTie.createHammeron(notes).setContext(ctx).draw()
      else if (n.tech?.includes('pull')) V.TabTie.createPulloff(notes).setContext(ctx).draw()
      else if (n.tech?.includes('slide')) (nextMidi >= n.midi ? V.TabSlide.createSlideUp(notes) : V.TabSlide.createSlideDown(notes)).setContext(ctx).draw()
      else if (e.tieToNext && nextMidi === n.midi) new V.TabTie(notes).setContext(ctx).draw()
    })
  })
}

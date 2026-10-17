import { Interval } from 'tonal'
import { chordsPerBar, chroma, guitarVoicing, rootMidiAtOrAbove, stringMidi, voiceLead, type GuitarVoicing, type ProgressionChord } from '../theory'
import type { BassNote, Groove } from './grooves'
import type { InstrumentId } from './instruments'
import { parsePattern, type PickNote, type Rhythm } from './rhythms'

export type JamTrack = 'drums' | 'bass' | 'chords' | 'click'

export type JamEvent =
  | { kind: 'bar'; beat: number; bar: number }
  | { kind: 'kick' | 'snare' | 'hat' | 'click'; beat: number; accent: boolean }
  | { kind: 'bass'; beat: number; midi: number; beats: number }
  | { kind: 'chord'; beat: number; midis: number[]; beats: number }
  /** Quạt / móc guitar: các nốt vang lần lượt cách nhau `spread` giây theo thứ tự trong mảng. */
  | { kind: 'strum'; beat: number; midis: number[]; spread: number; velocity: number; beats: number }
  | { kind: 'mute'; beat: number }
  /** Vị trí bước trong điệu (để vạch chạy trên lưới phách). */
  | { kind: 'pos'; beat: number; step: number }

/** Khoảng nốt cho phần đệm hợp âm: guitar thấp hơn piano. */
const COMP_RANGE: Record<InstrumentId, [number, number]> = {
  guitar: [48, 69],
  piano: [53, 76],
}

const BASS_LOW = 36 // C2

function bassInterval(chord: ProgressionChord, note: BassNote): number {
  const find = (num: number, fallback: string) => chord.intervals.find((i) => Interval.get(i).num === num) ?? fallback
  const name =
    note === 'root' ? '1P' : note === 'third' ? find(3, '3M') : note === 'fifth' ? find(5, '5P') : note === 'seventh' ? find(7, '7m') : note === 'octave' ? '8P' : note
  return Interval.get(name).semitones ?? 0
}

/** Các nốt dùng để xếp hợp âm: bỏ quãng 9/11/13 nếu hợp âm đã có từ 4 nốt để tiếng gọn. */
function voicingChromas(chord: ProgressionChord): number[] {
  const core = chord.intervals.filter((i) => Interval.get(i).num <= 7)
  const use = core.length >= 4 ? core : chord.intervals
  return use.map((i) => (chroma(chord.root) + (Interval.get(i).semitones ?? 0)) % 12)
}

/**
 * Dựng toàn bộ sự kiện cho một vòng tiến trình, thời gian tính bằng phách (nốt đen) kể từ đầu vòng.
 * Hợp âm được xếp theo kiểu dẫn giọng (nốt di chuyển ít nhất giữa các hợp âm).
 */
export function buildJamEvents(chords: ProgressionChord[], groove: Groove, instrument: InstrumentId, rhythm?: Rhythm): JamEvent[] {
  const bars = chordsPerBar(chords)
  const beatsPerBar = groove.beatsPerBar
  const beatsPerStep = beatsPerBar / groove.stepsPerBar
  // Điệu guitar thay cho phần đệm hợp âm của groove (chỉ khi cùng số phách).
  const useRhythm = rhythm && rhythm.beatsPerBar === beatsPerBar ? rhythm : undefined
  const [low, high] = COMP_RANGE[instrument]
  const events: JamEvent[] = []
  let prev: number[] | null = null

  bars.forEach((chord, bar) => {
    const start = bar * beatsPerBar
    const at = (step: number) => start + step * beatsPerStep
    events.push({ kind: 'bar', beat: start, bar })
    for (let b = 0; b < beatsPerBar; b++) events.push({ kind: 'click', beat: start + b, accent: b === 0 })
    for (const s of groove.kick) events.push({ kind: 'kick', beat: at(s), accent: s === 0 })
    for (const s of groove.snare) events.push({ kind: 'snare', beat: at(s), accent: true })
    for (const s of groove.hat) events.push({ kind: 'hat', beat: at(s), accent: s % (groove.stepsPerBar / beatsPerBar) === 0 })

    const bassRoot = rootMidiAtOrAbove(chroma(chord.bass ?? chord.root), BASS_LOW)
    const chordRoot = chord.bass ? rootMidiAtOrAbove(chroma(chord.root), BASS_LOW) : bassRoot
    groove.bass.forEach((b, i) => {
      // Hợp âm có bass riêng (C/E): nốt đầu ô nhịp là nốt bass đó, các nốt sau theo hợp âm.
      const midi = chord.bass && i === 0 ? bassRoot : chordRoot + bassInterval(chord, b.note)
      events.push({ kind: 'bass', beat: at(b.step), midi, beats: b.len * beatsPerStep })
    })

    if (useRhythm) {
      events.push(...rhythmBarEvents(chord, useRhythm, start))
      return
    }
    const voicing = voiceLead(voicingChromas(chord), prev, low, high)
    prev = voicing
    for (const c of groove.comp) {
      const midis = c.tones ? c.tones.map((t) => voicing[t % voicing.length]) : voicing
      events.push({ kind: 'chord', beat: at(c.step), midis, beats: c.len * beatsPerStep })
    }
  })
  return events
}

export function loopBeats(chords: ProgressionChord[], beatsPerBar = 4): number {
  return chordsPerBar(chords).length * beatsPerBar
}

const voicingCache = new Map<string, GuitarVoicing>()

function voicingFor(chord: ProgressionChord): GuitarVoicing {
  let v = voicingCache.get(chord.symbol)
  if (!v) {
    v = guitarVoicing(chord)
    voicingCache.set(chord.symbol, v)
  }
  return v
}

function pickMidi(v: GuitarVoicing, n: PickNote): number {
  if (n === 'B') return v.bass
  if (n === "B'") return v.altBass
  return stringMidi(v, n)
}

/**
 * Sự kiện của một ô nhịp theo điệu guitar: quạt xuống đánh từ dây trầm lên (bỏ dây không bấm),
 * quạt lên đánh 4 dây cao từ dây 1 xuống; quạt nhẹ chỉ chạm các dây cao; móc là từng nốt theo dây.
 */
export function rhythmBarEvents(chord: ProgressionChord, r: Rhythm, start: number): JamEvent[] {
  const v = voicingFor(chord)
  const sounding = v.stringMidis.filter((m): m is number => m !== null)
  const strummed = v.frets ? sounding : [v.bass, ...sounding.filter((m) => m !== v.bass)]
  const events: JamEvent[] = []
  parsePattern(r.pattern).forEach((step, i) => {
    const beat = start + i / r.stepsPerBeat
    events.push({ kind: 'pos', beat, step: i })
    if (step.kind === 'strum') {
      const top = strummed.slice(-4)
      if (step.dir === 'down') {
        const midis = step.light ? top : strummed
        events.push({ kind: 'strum', beat, midis, spread: 0.012, velocity: step.light ? 0.45 : 0.9, beats: 1 })
      } else {
        events.push({ kind: 'strum', beat, midis: [...(step.light ? top.slice(-3) : top)].reverse(), spread: 0.01, velocity: step.light ? 0.4 : 0.7, beats: 1 })
      }
    } else if (step.kind === 'mute') {
      events.push({ kind: 'mute', beat })
    } else if (step.kind === 'pick') {
      events.push({ kind: 'strum', beat, midis: step.notes.map((n) => pickMidi(v, n)), spread: 0, velocity: 0.8, beats: 2 })
    }
  })
  return events
}

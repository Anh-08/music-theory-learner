import { Interval } from 'tonal'
import { chordsPerBar, chroma, rootMidiAtOrAbove, voiceLead, type ProgressionChord } from '../theory'
import type { BassNote, Groove } from './grooves'
import type { InstrumentId } from './instruments'

export type JamTrack = 'drums' | 'bass' | 'chords'

export type JamEvent =
  | { kind: 'bar'; beat: number; bar: number }
  | { kind: 'kick' | 'snare' | 'hat'; beat: number; accent: boolean }
  | { kind: 'bass'; beat: number; midi: number; beats: number }
  | { kind: 'chord'; beat: number; midis: number[]; beats: number }

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
export function buildJamEvents(chords: ProgressionChord[], groove: Groove, instrument: InstrumentId): JamEvent[] {
  const bars = chordsPerBar(chords)
  const beatsPerStep = 4 / groove.stepsPerBar
  const [low, high] = COMP_RANGE[instrument]
  const events: JamEvent[] = []
  let prev: number[] | null = null

  bars.forEach((chord, bar) => {
    const start = bar * 4
    const at = (step: number) => start + step * beatsPerStep
    events.push({ kind: 'bar', beat: start, bar })
    for (const s of groove.kick) events.push({ kind: 'kick', beat: at(s), accent: s === 0 })
    for (const s of groove.snare) events.push({ kind: 'snare', beat: at(s), accent: true })
    for (const s of groove.hat) events.push({ kind: 'hat', beat: at(s), accent: s % (groove.stepsPerBar / 4) === 0 })

    const bassRoot = rootMidiAtOrAbove(chroma(chord.bass ?? chord.root), BASS_LOW)
    const chordRoot = chord.bass ? rootMidiAtOrAbove(chroma(chord.root), BASS_LOW) : bassRoot
    groove.bass.forEach((b, i) => {
      // Hợp âm có bass riêng (C/E): nốt đầu ô nhịp là nốt bass đó, các nốt sau theo hợp âm.
      const midi = chord.bass && i === 0 ? bassRoot : chordRoot + bassInterval(chord, b.note)
      events.push({ kind: 'bass', beat: at(b.step), midi, beats: b.len * beatsPerStep })
    })

    const voicing = voiceLead(voicingChromas(chord), prev, low, high)
    prev = voicing
    for (const c of groove.comp) {
      const midis = c.tones ? c.tones.map((t) => voicing[t % voicing.length]) : voicing
      events.push({ kind: 'chord', beat: at(c.step), midis, beats: c.len * beatsPerStep })
    }
  })
  return events
}

export function loopBeats(chords: ProgressionChord[]): number {
  return chordsPerBar(chords).length * 4
}

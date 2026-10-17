import { Chord } from 'tonal'
import { chordType } from './chords'
import { displayNote, noteFromMidi } from './notes'
import { chordTypeId } from './progression'
import { intervalLabel } from './intervals'

export interface ChordMatch {
  /** Tên hiển thị: "C", "Am7", "C/E". */
  name: string
  root: string
  bass?: string
  intervals: string[]
  /** Công thức: "1 3 5". */
  formula: string
}

/**
 * Đoán tên hợp âm từ các nốt (midi). Nốt thấp nhất là bass — nếu không phải nốt gốc thì ra hợp âm "/".
 * Trả về danh sách khả năng, hợp lý nhất trước.
 */
export function identifyChord(midis: number[]): ChordMatch[] {
  const sorted = [...new Set(midis)].sort((a, b) => a - b)
  const pcs = [...new Set(sorted.map((m) => noteFromMidi(m).replace(/\d+$/, '')))]
  if (pcs.length < 3) return []
  // Ưu tiên các loại hợp âm thông dụng (có trong CHORD_TYPES): C/E đứng trước Em#5.
  const detected = Chord.detect(pcs, { assumePerfectFifth: true })
  const known = (full: string) => (chordTypeId(Chord.get(full.split('/')[0]).intervals) ? 0 : 1)
  return [...detected]
    .sort((a, b) => known(a) - known(b))
    .slice(0, 4)
    .map((full) => {
      const [main, bass] = full.split('/')
      const c = Chord.get(main)
      const id = chordTypeId(c.intervals)
      const suffix = id ? chordType(id).suffix : (c.aliases[0] ?? c.type)
      return {
        name: `${displayNote(c.tonic!)}${suffix}${bass ? `/${displayNote(bass)}` : ''}`,
        root: c.tonic!,
        bass,
        intervals: c.intervals,
        formula: c.intervals.map(intervalLabel).join(' '),
      }
    })
}

import { isBluesLike, type KeyRef, type ProgressionChord } from './progression'
import { chroma } from './notes'

export interface ScaleSuggestion {
  root: string
  /** Id trong SCALE_TYPES. */
  typeId: string
  why: string
}

/** Gợi ý scale để improvise trên cả tiến trình, theo thứ tự nên thử. */
export function suggestScales(chords: ProgressionChord[], key: KeyRef): ScaleSuggestion[] {
  if (isBluesLike(chords)) {
    return [
      { root: key.tonic, typeId: 'minor pentatonic', why: 'Âm thanh blues kinh điển — chơi ngũ cung thứ trên nền hợp âm 7 trưởng.' },
      { root: key.tonic, typeId: 'blues', why: 'Ngũ cung thứ thêm nốt ♭5 cho đậm chất blues.' },
      { root: key.tonic, typeId: 'major pentatonic', why: 'Màu sáng, vui hơn (kiểu country / blues trưởng).' },
      { root: key.tonic, typeId: 'mixolydian', why: 'Bảy nốt khớp với hợp âm I7.' },
    ]
  }
  if (key.mode === 'major') {
    const relMinor = chordsRelativeMinorRoot(key)
    return [
      { root: key.tonic, typeId: 'major pentatonic', why: 'An toàn nhất: 5 nốt, không có nốt nào nghe "chỏi".' },
      { root: key.tonic, typeId: 'major', why: 'Đủ 7 nốt của giọng — nhiều màu hơn, cần chú ý bậc 4 và 7.' },
      { root: relMinor, typeId: 'minor pentatonic', why: `Cùng nốt với ngũ cung trưởng ${key.tonic}, nhưng nghĩ từ giọng thứ tương ứng.` },
    ]
  }
  const hasMajorFive = chords.some((c) => chroma(c.root) === (chroma(key.tonic) + 7) % 12 && c.intervals.includes('3M'))
  return [
    { root: key.tonic, typeId: 'minor pentatonic', why: 'An toàn nhất cho giọng thứ.' },
    { root: key.tonic, typeId: 'aeolian', why: 'Đủ 7 nốt của giọng thứ tự nhiên.' },
    { root: key.tonic, typeId: 'blues', why: 'Thêm nốt ♭5 cho màu blues / rock.' },
    ...(hasMajorFive ? [{ root: key.tonic, typeId: 'harmonic minor', why: 'Tiến trình có hợp âm V trưởng — bậc 7 được nâng lên.' }] : []),
  ]
}

function chordsRelativeMinorRoot(key: KeyRef): string {
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
  return names[(chroma(key.tonic) + 9) % 12]
}

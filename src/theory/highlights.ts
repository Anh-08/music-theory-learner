import { chroma, displayNote, solfege, type Chroma } from './notes'

export type LabelMode = 'note' | 'interval' | 'solfege'

export interface Highlight {
  label: string
  isRoot: boolean
}

/** Nốt cần tô sáng trên đàn, đánh chỉ mục theo chroma để dùng chung cho mọi quãng tám. */
export type HighlightMap = Map<Chroma, Highlight>

/**
 * Tạo bản đồ tô sáng từ danh sách nốt và nhãn quãng tương ứng
 * (nốt đầu tiên là chủ âm).
 */
export function makeHighlights(notes: string[], intervalLabels: string[], mode: LabelMode): HighlightMap {
  const map: HighlightMap = new Map()
  notes.forEach((note, i) => {
    const c = chroma(note)
    if (map.has(c)) return
    const label = mode === 'note' ? displayNote(note) : mode === 'interval' ? intervalLabels[i] : solfege(c)
    map.set(c, { label, isRoot: i === 0 })
  })
  return map
}

/** Nốt bass tính theo hợp âm hiện tại: các bậc của hợp âm, hoặc một quãng cụ thể từ nốt gốc ("6M"). */
export type BassNote = 'root' | 'third' | 'fifth' | 'seventh' | 'octave' | string

/** Mô tả từng nhịp nằm trong bản dịch giao diện, khóa "groove.<id>". */
export interface Groove {
  id: 'pop' | 'ballad' | 'rock' | 'blues' | 'bossa'
  name: string
  /** Số bước trong một ô nhịp 4/4: 16 (móc kép) hoặc 12 (chùm ba, cho shuffle). */
  stepsPerBar: 16 | 12
  defaultTempo: number
  kick: number[]
  snare: number[]
  hat: number[]
  bass: { step: number; note: BassNote; len: number }[]
  /** Nhịp đệm hợp âm. `tones` = chỉ số các nốt trong cách xếp hợp âm (rải); bỏ trống = đánh cả hợp âm. */
  comp: { step: number; len: number; tones?: number[] }[]
}

const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14]

export const GROOVES: Groove[] = [
  {
    id: 'pop',
    name: 'Pop',
    stepsPerBar: 16,
    defaultTempo: 100,
    kick: [0, 8, 10],
    snare: [4, 12],
    hat: EIGHTHS,
    bass: [
      { step: 0, note: 'root', len: 6 },
      { step: 6, note: 'root', len: 2 },
      { step: 8, note: 'fifth', len: 4 },
      { step: 12, note: 'root', len: 4 },
    ],
    comp: [
      { step: 0, len: 6 },
      { step: 6, len: 4 },
      { step: 12, len: 4 },
    ],
  },
  {
    id: 'ballad',
    name: 'Ballad',
    stepsPerBar: 16,
    defaultTempo: 72,
    kick: [0, 10],
    snare: [8],
    hat: EIGHTHS,
    bass: [
      { step: 0, note: 'root', len: 8 },
      { step: 8, note: 'fifth', len: 8 },
    ],
    comp: [0, 1, 2, 1, 3, 1, 2, 1].map((tone, i) => ({ step: i * 2, len: 2, tones: [tone] })),
  },
  {
    id: 'rock',
    name: 'Rock',
    stepsPerBar: 16,
    defaultTempo: 112,
    kick: [0, 6, 8],
    snare: [4, 12],
    hat: EIGHTHS,
    bass: EIGHTHS.map((step) => ({ step, note: 'root', len: 2 })),
    comp: EIGHTHS.map((step) => ({ step, len: 2 })),
  },
  {
    id: 'blues',
    name: 'Blues shuffle',
    stepsPerBar: 12,
    defaultTempo: 90,
    kick: [0, 6],
    snare: [3, 9],
    hat: [0, 2, 3, 5, 6, 8, 9, 11],
    bass: [
      { step: 0, note: 'root', len: 2 },
      { step: 2, note: 'third', len: 1 },
      { step: 3, note: 'fifth', len: 2 },
      { step: 5, note: '6M', len: 1 },
      { step: 6, note: '7m', len: 2 },
      { step: 8, note: '6M', len: 1 },
      { step: 9, note: 'fifth', len: 2 },
      { step: 11, note: 'third', len: 1 },
    ],
    comp: [
      { step: 0, len: 2 },
      { step: 5, len: 1 },
      { step: 6, len: 2 },
      { step: 11, len: 1 },
    ],
  },
  {
    id: 'bossa',
    name: 'Bossa nova',
    stepsPerBar: 16,
    defaultTempo: 120,
    kick: [0, 6, 8, 14],
    snare: [0, 6, 12],
    hat: EIGHTHS,
    bass: [
      { step: 0, note: 'root', len: 6 },
      { step: 6, note: 'fifth', len: 2 },
      { step: 8, note: 'fifth', len: 6 },
      { step: 14, note: 'root', len: 2 },
    ],
    comp: [
      { step: 0, len: 3 },
      { step: 3, len: 3 },
      { step: 6, len: 4 },
      { step: 10, len: 3 },
      { step: 13, len: 3 },
    ],
  },
]

export function groove(id: string): Groove {
  return GROOVES.find((g) => g.id === id) ?? GROOVES[0]
}

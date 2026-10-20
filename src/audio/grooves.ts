/** Bass note relative to the current chord: a chord degree, or a specific interval from the root ("6M"). */
export type BassNote = 'root' | 'third' | 'fifth' | 'seventh' | 'octave' | string

/** Each groove's description lives in the UI translations, key "groove.<id>". */
export interface Groove {
  id: 'pop' | 'ballad' | 'rock' | 'blues' | 'bossa' | 'slowrock' | 'slowrock68' | 'waltz'
  name: string
  /** Beats per bar. */
  beatsPerBar: 2 | 3 | 4
  /** Steps per bar: 16 (4/4, sixteenths), 12 (12/8: 4 beats of triplets), 6 (3/4 eighths, or 6/8: 2 beats of triplets). */
  stepsPerBar: 16 | 12 | 6
  defaultTempo: number
  kick: number[]
  snare: number[]
  hat: number[]
  bass: { step: number; note: BassNote; len: number }[]
  /** Chord comping rhythm. `tones` = indices of notes in the chord voicing (arpeggiated); empty = whole chord. */
  comp: { step: number; len: number; tones?: number[] }[]
}

const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14]

export const GROOVES: Groove[] = [
  {
    id: 'pop',
    name: 'Pop',
    beatsPerBar: 4,
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
    beatsPerBar: 4,
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
    beatsPerBar: 4,
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
    beatsPerBar: 4,
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
    beatsPerBar: 4,
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
  {
    id: 'slowrock',
    name: 'Slow rock',
    beatsPerBar: 4,
    stepsPerBar: 12,
    defaultTempo: 60,
    kick: [0, 6],
    snare: [3, 9],
    hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    bass: [
      { step: 0, note: 'root', len: 3 },
      { step: 3, note: 'fifth', len: 3 },
      { step: 6, note: 'root', len: 3 },
      { step: 9, note: 'fifth', len: 3 },
    ],
    comp: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((step) => ({ step, len: 1, tones: [[0, 1, 2][step % 3]] })),
  },
  {
    // 6/8: two dotted-quarter beats, each split in three — the same feel as the 12/8 groove in half-length bars.
    id: 'slowrock68',
    name: 'Slow rock (6/8)',
    beatsPerBar: 2,
    stepsPerBar: 6,
    defaultTempo: 60,
    kick: [0],
    snare: [3],
    hat: [0, 1, 2, 3, 4, 5],
    bass: [
      { step: 0, note: 'root', len: 3 },
      { step: 3, note: 'fifth', len: 3 },
    ],
    comp: [0, 1, 2, 3, 4, 5].map((step) => ({ step, len: 1, tones: [[0, 1, 2][step % 3]] })),
  },
  {
    id: 'waltz',
    name: 'Valse / Waltz (3/4)',
    beatsPerBar: 3,
    stepsPerBar: 6,
    defaultTempo: 120,
    kick: [0],
    snare: [2, 4],
    hat: [0, 2, 4],
    bass: [{ step: 0, note: 'root', len: 2 }],
    comp: [
      { step: 2, len: 2 },
      { step: 4, len: 2 },
    ],
  },
]

export function groove(id: string): Groove {
  return GROOVES.find((g) => g.id === id) ?? GROOVES[0]
}

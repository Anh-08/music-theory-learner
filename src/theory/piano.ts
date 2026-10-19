import { chromaOfMidi, type Chroma } from './notes'

const BLACK_CHROMAS = new Set([1, 3, 6, 8, 10])

export function isBlackKey(m: number): boolean {
  return BLACK_CHROMAS.has(chromaOfMidi(m))
}

export interface PianoKey {
  midi: number
  chroma: Chroma
  black: boolean
  /** White key: its index among white keys. Black key: index of the white key to its left. */
  whiteIndex: number
}

/** Keys from `startMidi` to `endMidi` (inclusive). Should start and end on white keys. */
export function pianoKeys(startMidi: number, endMidi: number): PianoKey[] {
  const keys: PianoKey[] = []
  let whiteIndex = -1
  for (let m = startMidi; m <= endMidi; m++) {
    const black = isBlackKey(m)
    if (!black) whiteIndex++
    keys.push({ midi: m, chroma: chromaOfMidi(m), black, whiteIndex })
  }
  return keys
}

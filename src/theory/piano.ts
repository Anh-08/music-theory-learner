import { chromaOfMidi, type Chroma } from './notes'

const BLACK_CHROMAS = new Set([1, 3, 6, 8, 10])

export function isBlackKey(m: number): boolean {
  return BLACK_CHROMAS.has(chromaOfMidi(m))
}

export interface PianoKey {
  midi: number
  chroma: Chroma
  black: boolean
  /** Phím trắng: thứ tự phím trắng. Phím đen: thứ tự phím trắng nằm bên trái nó. */
  whiteIndex: number
}

/** Các phím từ `startMidi` đến `endMidi` (tính cả hai đầu). Nên bắt đầu và kết thúc bằng phím trắng. */
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

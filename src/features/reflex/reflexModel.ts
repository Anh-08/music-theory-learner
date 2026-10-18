import type { ReflexSlot } from '../../audio/reflex'
import { chordFlow, chordShapes, nearestShape, parseKey, parseProgression, type ChordShape, type FlowSource, type ProgressionChord } from '../../theory'

export type ReflexMode = 'beats' | 'rhythm'
export type ReflexLevel = 'easy' | 'medium' | 'hard'

export interface ReflexSettings {
  source: FlowSource
  /** Giọng: "C", "Am"… */
  key: string
  /** Các vòng tự nhập, mỗi dòng một vòng. */
  custom: string
  mode: ReflexMode
  beatsPerChord: 1 | 2 | 4
  /** Id điệu (chế độ một lượt điệu). */
  rhythm: string
  phraseLength: 4 | 8
  tempo: number
  sevenths: boolean
  colors: boolean
  modulate: boolean
  hideShapes: boolean
  nearShapes: boolean
  sound: boolean
  ramp: boolean
}

export const DEFAULT_REFLEX: ReflexSettings = {
  source: 'loops',
  key: 'C',
  custom: 'C G Am F\nDm G C Am',
  mode: 'beats',
  beatsPerChord: 4,
  rhythm: 'ballad',
  phraseLength: 4,
  tempo: 70,
  sevenths: false,
  colors: false,
  modulate: false,
  hideShapes: false,
  nearShapes: false,
  sound: false,
  ramp: false,
}

/** Cài đặt sẵn theo mức: chỉ đụng tới độ khó, không đổi giọng / nguồn / điệu. */
export const LEVELS: Record<ReflexLevel, Partial<ReflexSettings>> = {
  easy: { beatsPerChord: 4, tempo: 70, sevenths: false, colors: false, modulate: false, hideShapes: false },
  medium: { beatsPerChord: 2, tempo: 80, sevenths: true, colors: false, modulate: false, hideShapes: false },
  hard: { beatsPerChord: 2, tempo: 100, sevenths: true, colors: true, modulate: true, hideShapes: true },
}

export function levelOf(s: ReflexSettings): ReflexLevel | null {
  return (Object.keys(LEVELS) as ReflexLevel[]).find((l) => Object.entries(LEVELS[l]).every(([k, v]) => s[k as keyof ReflexSettings] === v)) ?? null
}

/** Giọng cho người tập chọn: các giọng hay gặp khi đệm hát. */
export const REFLEX_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Am', 'Em', 'Dm', 'Bm', 'F#m', 'Gm', 'Cm']

/** Đọc các vòng tự nhập: mỗi dòng (hoặc mỗi đoạn cách nhau bởi ";") là một vòng. */
export function parseCustomLoops(text: string, keyText: string): { loops: ProgressionChord[][]; error: unknown } {
  const lines = text
    .split(/[\n;]+/)
    .map((l) => l.trim())
    .filter(Boolean)
  try {
    return { loops: lines.map((l) => parseProgression(l, parseKey(keyText))), error: null }
  } catch (e) {
    return { loops: [], error: e }
  }
}

/**
 * Nguồn hợp âm cho băng chạy: chuỗi từ `chordFlow`, kèm thế bấm (thế quen thuộc hoặc thế gần thế trước)
 * và số phách (một lượt điệu = một ô nhịp; hợp âm kéo dài nhiều ô như "C*2" thì nhân lên).
 */
export function reflexSource(s: ReflexSettings, seed: number, beatsPerBar: number, customLoops: ProgressionChord[][] = []): () => ReflexSlot {
  const next = chordFlow(
    { key: parseKey(s.key), source: s.source, sevenths: s.sevenths, colors: s.colors, modulate: s.modulate, phraseLength: s.phraseLength, custom: customLoops },
    seed,
  )
  const base = s.mode === 'rhythm' ? beatsPerBar : s.beatsPerChord
  let prev: ChordShape | undefined
  return () => {
    const { chord, phraseStart } = next()
    const shapes = chordShapes(chord)
    const shape = s.nearShapes ? nearestShape(shapes, prev) : shapes[0]
    prev = shape
    return { chord, shape, beats: base * chord.bars, phraseStart }
  }
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

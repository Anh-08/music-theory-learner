import { Chord } from 'tonal'
import { chroma, rootMidiAtOrAbove, stackIntervals } from '../theory'
import { chordEvents, type PlayEvent } from './events'

/** Đọc ký hiệu hợp âm ("Am", "F#m", "Bb", "Bdim") thành chủ âm + quãng. */
export function parseChordSymbol(symbol: string): { tonic: string; intervals: string[] } {
  const c = Chord.get(symbol)
  if (c.empty || !c.tonic) throw new Error(`Ký hiệu hợp âm không hợp lệ: ${symbol}`)
  return { tonic: c.tonic, intervals: c.intervals }
}

export function progressionEvents(symbols: string[], low: number, secondsPerChord: number, roll: number): PlayEvent[] {
  return symbols.flatMap((s, i) => {
    const { tonic, intervals } = parseChordSymbol(s)
    const midis = stackIntervals(rootMidiAtOrAbove(chroma(tonic), low), intervals)
    return chordEvents(midis, roll, secondsPerChord).map((e) => ({ ...e, at: e.at + i * secondsPerChord }))
  })
}

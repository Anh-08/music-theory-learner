import { describe, expect, it } from 'vitest'
import { parseProgression } from '../../theory'
import { GROOVES, groove } from '../grooves'
import { buildJamEvents, loopBeats } from '../jamEvents'

describe('buildJamEvents', () => {
  const chords = parseProgression('C G Am F*2')

  it('có một sự kiện "bar" ở đầu mỗi ô nhịp', () => {
    const e = buildJamEvents(chords, groove('pop'), 'piano')
    expect(e.filter((x) => x.kind === 'bar').map((x) => x.beat)).toEqual([0, 4, 8, 12, 16])
    expect(loopBeats(chords)).toBe(20)
  })

  it('bass chơi nốt gốc của hợp âm ở đầu ô nhịp', () => {
    const e = buildJamEvents(chords, groove('pop'), 'piano')
    const firstBass = (bar: number) => e.find((x) => x.kind === 'bass' && x.beat === bar * 4)
    expect(firstBass(0)).toMatchObject({ midi: 36 }) // C2
    expect(firstBass(1)).toMatchObject({ midi: 43 }) // G2
    expect(firstBass(2)).toMatchObject({ midi: 45 }) // A2
  })

  it('hợp âm có bass riêng thì bass chơi nốt đó', () => {
    const e = buildJamEvents(parseProgression('C G/B'), groove('pop'), 'piano')
    expect(e.find((x) => x.kind === 'bass' && x.beat === 4)).toMatchObject({ midi: 47 }) // B2
  })

  it('đệm hợp âm đúng nốt và dẫn giọng', () => {
    const e = buildJamEvents(chords, groove('pop'), 'piano')
    const chordAt = (bar: number) => e.find((x) => x.kind === 'chord' && x.beat === bar * 4) as { midis: number[] }
    expect(chordAt(0).midis.map((m) => m % 12).sort((a, b) => a - b)).toEqual([0, 4, 7])
    expect(chordAt(2).midis.map((m) => m % 12).sort((a, b) => a - b)).toEqual([0, 4, 9])
    // Dẫn giọng: tổng quãng di chuyển giữa C và G nhỏ.
    const moved = chordAt(0).midis.reduce((s, m, i) => s + Math.abs(m - chordAt(1).midis[i]), 0)
    expect(moved).toBeLessThanOrEqual(6)
  })

  it('shuffle dùng 12 bước mỗi ô nhịp', () => {
    const e = buildJamEvents(parseProgression('A7'), groove('blues'), 'guitar')
    const snares = e.filter((x) => x.kind === 'snare').map((x) => x.beat)
    expect(snares).toEqual([1, 3])
    const bass = e.filter((x) => x.kind === 'bass').map((x) => (x as { midi: number }).midi - 45)
    expect(bass).toEqual([0, 4, 7, 9, 10, 9, 7, 4]) // boogie 1 3 5 6 ♭7 6 5 3
  })

  it('mọi groove dựng được với hợp âm 7', () => {
    for (const g of GROOVES) {
      const e = buildJamEvents(parseProgression('Dm7 G7 Cmaj7'), g, 'guitar')
      expect(e.length, g.id).toBeGreaterThan(10)
      for (const x of e) if (x.kind === 'chord') expect(x.midis.every((m) => m >= 48 && m <= 69), g.id).toBe(true)
    }
  })
})

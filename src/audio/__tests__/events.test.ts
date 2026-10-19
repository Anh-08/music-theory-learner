import { describe, expect, it } from 'vitest'
import { arpeggioThenChord, chordEvents, sequenceEvents, totalDuration } from '../events'

describe('events', () => {
  it('sequences notes one after another', () => {
    const e = sequenceEvents([60, 62, 64], 0.5, 0.8)
    expect(e.map((x) => x.at)).toEqual([0, 0.5, 1])
    expect(e[2]).toEqual({ midis: [64], at: 1, duration: 0.8 })
  })

  it('plays a chord all at once', () => {
    expect(chordEvents([67, 60, 64])).toEqual([{ midis: [60, 64, 67], at: 0, duration: 2 }])
  })

  it('rolls a chord from low to high', () => {
    const e = chordEvents([64, 60, 67], 0.03)
    expect(e.map((x) => x.midis[0])).toEqual([60, 64, 67])
    expect(e[2].at).toBeCloseTo(0.06)
  })

  it('arpeggiates then strikes the whole chord', () => {
    const e = arpeggioThenChord([60, 64, 67], 0.3)
    expect(e).toHaveLength(4)
    expect(e[3].midis).toEqual([60, 64, 67])
    expect(totalDuration(e)).toBeCloseTo(0.9 + 0.2 + 2)
  })
})

import { describe, expect, it } from 'vitest'
import { rootMidiAtOrAbove, scaleRun, stackIntervals, stepLabel, stepPattern } from '../voicing'

describe('voicing', () => {
  it('finds the root within a range', () => {
    expect(rootMidiAtOrAbove(0, 60)).toBe(60)
    expect(rootMidiAtOrAbove(9, 60)).toBe(69)
    expect(rootMidiAtOrAbove(4, 41)).toBe(52)
  })

  it('stacks intervals into a chord', () => {
    expect(stackIntervals(60, ['1P', '3M', '5P', '7m'])).toEqual([60, 64, 67, 70])
    expect(stackIntervals(48, ['1P', '3M', '5P', '9M'])).toEqual([48, 52, 55, 62])
  })

  it('runs a scale up one octave', () => {
    expect(scaleRun(57, ['1P', '3m', '4P', '5P', '7m'])).toEqual([57, 60, 62, 64, 67, 69])
  })

  it('computes the whole/half-step formula', () => {
    const major = ['1P', '2M', '3M', '4P', '5P', '6M', '7M']
    expect(stepPattern(major)).toEqual([2, 2, 1, 2, 2, 2, 1])
    expect(stepPattern(['1P', '3m', '4P', '5P', '7m'])).toEqual([3, 2, 2, 3, 2])
    expect([1, 2, 3, 4].map(stepLabel)).toEqual(['½', '1', '1½', '2'])
  })
})

describe('voiceLead', async () => {
  const { voiceLead } = await import('../voicing')

  it('without a previous chord, picks the voicing closest to the middle of the range', () => {
    const v = voiceLead([0, 4, 7], null, 52, 76)
    expect(v.map((m) => m % 12).sort()).toEqual([0, 4, 7])
    expect(Math.min(...v)).toBeGreaterThanOrEqual(52)
    expect(Math.max(...v)).toBeLessThanOrEqual(76)
  })

  it('moves to the next chord with the least note movement', () => {
    // C (C4 E4 G4) → F: the closest is C4 F4 A4.
    expect(voiceLead([5, 9, 0], [60, 64, 67], 52, 76)).toEqual([60, 65, 69])
    // C (C4 E4 G4) → G: B3 D4 G4.
    expect(voiceLead([7, 11, 2], [60, 64, 67], 52, 76)).toEqual([59, 62, 67])
  })
})

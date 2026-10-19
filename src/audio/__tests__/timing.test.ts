import { describe, expect, it } from 'vitest'
import { scoreTiming } from '../timing'

describe('scoreTiming', () => {
  it('matches strums to the nearest beat and measures the offset', () => {
    const expected = [0, 0.5, 1, 1.5, 2]
    const onsets = [0.02, 0.53, 1.09, 1.48, 3]
    expect(scoreTiming(expected, onsets)).toEqual({ matched: 4, meanMs: 30, onTimePct: 75 })
  })

  it('each beat matches only once; nothing matched gives 0', () => {
    expect(scoreTiming([1], [1.01, 1.02]).matched).toBe(1)
    expect(scoreTiming([1], [5])).toEqual({ matched: 0, meanMs: 0, onTimePct: 0 })
  })
})

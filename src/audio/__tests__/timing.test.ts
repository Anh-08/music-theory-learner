import { describe, expect, it } from 'vitest'
import { scoreTiming } from '../timing'

describe('scoreTiming', () => {
  it('khớp tiếng gảy với nhịp gần nhất và tính độ lệch', () => {
    const expected = [0, 0.5, 1, 1.5, 2]
    const onsets = [0.02, 0.53, 1.09, 1.48, 3]
    expect(scoreTiming(expected, onsets)).toEqual({ matched: 4, meanMs: 30, onTimePct: 75 })
  })

  it('mỗi nhịp chỉ khớp một lần; không có gì khớp thì trả về 0', () => {
    expect(scoreTiming([1], [1.01, 1.02]).matched).toBe(1)
    expect(scoreTiming([1], [5])).toEqual({ matched: 0, meanMs: 0, onTimePct: 0 })
  })
})

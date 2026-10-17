import { describe, expect, it } from 'vitest'
import { rootMidiAtOrAbove, scaleRun, stackIntervals, stepLabel, stepPattern } from '../voicing'

describe('voicing', () => {
  it('tìm nốt gốc trong khoảng', () => {
    expect(rootMidiAtOrAbove(0, 60)).toBe(60)
    expect(rootMidiAtOrAbove(9, 60)).toBe(69)
    expect(rootMidiAtOrAbove(4, 41)).toBe(52)
  })

  it('chồng quãng thành hợp âm', () => {
    expect(stackIntervals(60, ['1P', '3M', '5P', '7m'])).toEqual([60, 64, 67, 70])
    expect(stackIntervals(48, ['1P', '3M', '5P', '9M'])).toEqual([48, 52, 55, 62])
  })

  it('chạy scale lên một quãng tám', () => {
    expect(scaleRun(57, ['1P', '3m', '4P', '5P', '7m'])).toEqual([57, 60, 62, 64, 67, 69])
  })

  it('tính công thức cung – nửa cung', () => {
    const major = ['1P', '2M', '3M', '4P', '5P', '6M', '7M']
    expect(stepPattern(major)).toEqual([2, 2, 1, 2, 2, 2, 1])
    expect(stepPattern(['1P', '3m', '4P', '5P', '7m'])).toEqual([3, 2, 2, 3, 2])
    expect([1, 2, 3, 4].map(stepLabel)).toEqual(['½', '1', '1½', '2'])
  })
})

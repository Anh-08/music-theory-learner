import { describe, expect, it } from 'vitest'
import { isBlackKey, pianoKeys } from '../piano'

describe('piano', () => {
  it('nhận biết phím đen', () => {
    expect(isBlackKey(60)).toBe(false) // C4
    expect(isBlackKey(61)).toBe(true) // C#4
    expect(isBlackKey(64)).toBe(false) // E4
    expect(isBlackKey(70)).toBe(true) // Bb4
  })

  it('một quãng tám có 7 phím trắng và 5 phím đen', () => {
    const keys = pianoKeys(60, 71)
    expect(keys.filter((k) => !k.black)).toHaveLength(7)
    expect(keys.filter((k) => k.black)).toHaveLength(5)
  })

  it('đánh thứ tự phím trắng liên tục, phím đen theo phím trắng bên trái', () => {
    const keys = pianoKeys(60, 64)
    expect(keys.map((k) => k.whiteIndex)).toEqual([0, 0, 1, 1, 2])
  })
})

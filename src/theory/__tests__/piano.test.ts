import { describe, expect, it } from 'vitest'
import { isBlackKey, pianoKeys } from '../piano'

describe('piano', () => {
  it('recognises black keys', () => {
    expect(isBlackKey(60)).toBe(false) // C4
    expect(isBlackKey(61)).toBe(true) // C#4
    expect(isBlackKey(64)).toBe(false) // E4
    expect(isBlackKey(70)).toBe(true) // Bb4
  })

  it('an octave has 7 white keys and 5 black keys', () => {
    const keys = pianoKeys(60, 71)
    expect(keys.filter((k) => !k.black)).toHaveLength(7)
    expect(keys.filter((k) => k.black)).toHaveLength(5)
  })

  it('numbers white keys consecutively, black keys by the white key on their left', () => {
    const keys = pianoKeys(60, 64)
    expect(keys.map((k) => k.whiteIndex)).toEqual([0, 0, 1, 1, 2])
  })
})

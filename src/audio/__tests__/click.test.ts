import { describe, expect, it } from 'vitest'
import { DEFAULT_CLICK, parseClickSettings, volumeToDb } from '../click'

describe('click settings', () => {
  it('falls back to the soft sound at 70% when nothing is stored', () => {
    expect(parseClickSettings(null)).toEqual(DEFAULT_CLICK)
    expect(DEFAULT_CLICK).toEqual({ sound: 'soft', volume: 0.7 })
  })

  it('keeps valid stored values and replaces invalid ones', () => {
    expect(parseClickSettings('{"sound":"wood","volume":0.3}')).toEqual({ sound: 'wood', volume: 0.3 })
    expect(parseClickSettings('{"sound":"loud","volume":3}')).toEqual(DEFAULT_CLICK)
    expect(parseClickSettings('not json')).toEqual(DEFAULT_CLICK)
  })

  it('maps the volume slider to decibels, 0 = silent', () => {
    expect(volumeToDb(1)).toBe(0)
    expect(volumeToDb(0.5)).toBeCloseTo(-6.02, 1)
    expect(volumeToDb(0)).toBe(-Infinity)
  })
})

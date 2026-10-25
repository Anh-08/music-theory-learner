import { describe, expect, it } from 'vitest'
import {
  DEFAULT_METRONOME,
  addTap,
  barEvents,
  beatLevels,
  isMutedBar,
  meterLayout,
  nextLevel,
  normalizeSettings,
  parseGrouping,
  pulseOffsets,
  tapTempo,
  tempoName,
  trainerTempo,
  type MetronomeSettings,
} from './metronomeModel'

const s = (patch: Partial<MetronomeSettings>): MetronomeSettings => ({ ...DEFAULT_METRONOME, ...patch })

describe('meters', () => {
  it('simple meters count quarter notes', () => {
    expect(meterLayout(s({ meter: '3/4' }))).toEqual({ pulses: 3, kind: 'quarter', groups: [3] })
    expect(meterLayout(s({ meter: 'custom', customBeats: 11 }))).toEqual({ pulses: 11, kind: 'quarter', groups: [11] })
  })

  it('custom meters take any top and bottom number; one dot = one bottom-number note', () => {
    expect(meterLayout(s({ meter: 'custom', customBeats: 3, customUnit: 2 }))).toEqual({ pulses: 3, kind: 'quarter', groups: [3] })
    // A multiple of 3 eighths / sixteenths is compound by default…
    expect(meterLayout(s({ meter: 'custom', customBeats: 9, customUnit: 16 })).groups).toEqual([3, 3, 3])
    expect(meterLayout(s({ meter: 'custom', customBeats: 6, customUnit: 4 })).groups).toEqual([6])
    // …and any additive grouping can be typed.
    expect(meterLayout(s({ meter: 'custom', customBeats: 11, customUnit: 8, customGrouping: '3+3+3+2' })).groups).toEqual([3, 3, 3, 2])
    expect(meterLayout(s({ meter: 'custom', customBeats: 11, customUnit: 8, customGrouping: '3+3' })).groups).toEqual([11])
  })

  it('parses groupings that add up to the beat count', () => {
    expect(parseGrouping('2+2+3', 7)).toEqual([2, 2, 3])
    expect(parseGrouping(' 3 + 2 ', 5)).toEqual([3, 2])
    expect(parseGrouping('3+3', 7)).toBeNull()
    expect(parseGrouping('3+0+4', 7)).toBeNull()
    expect(parseGrouping('3+x', 7)).toBeNull()
    expect(parseGrouping('', 7)).toBeNull()
  })

  it('compound meters count dotted quarters by default, or every eighth in groups of 3', () => {
    expect(meterLayout(s({ meter: '6/8' }))).toEqual({ pulses: 2, kind: 'dotted', groups: [2] })
    expect(meterLayout(s({ meter: '12/8', compoundUnit: 'eighth' }))).toEqual({ pulses: 12, kind: 'eighth', groups: [3, 3, 3, 3] })
  })

  it('7/8 follows the chosen grouping', () => {
    expect(meterLayout(s({ meter: '7/8', grouping7: '3+2+2' })).groups).toEqual([3, 2, 2])
  })
})

describe('accents', () => {
  it('beat 1 is strong and other group starts are medium', () => {
    expect(beatLevels(s({ meter: '4/4' }))).toEqual(['strong', 'normal', 'normal', 'normal'])
    expect(beatLevels(s({ meter: '7/8', grouping7: '2+2+3' }))).toEqual(['strong', 'normal', 'medium', 'normal', 'medium', 'normal', 'normal'])
    expect(beatLevels(s({ meter: '6/8', compoundUnit: 'eighth' }))).toEqual(['strong', 'normal', 'normal', 'medium', 'normal', 'normal'])
  })

  it('user accents apply only while their length matches the meter', () => {
    const accents = ['silent', 'strong', 'normal', 'strong'] as const
    expect(beatLevels(s({ meter: '4/4', accents: [...accents] }))).toEqual(accents)
    expect(beatLevels(s({ meter: '3/4', accents: [...accents] }))).toEqual(['strong', 'normal', 'normal'])
  })

  it('clicking a dot cycles strong → medium → normal → silent → strong', () => {
    expect(['strong', 'medium', 'normal', 'silent'].map((l) => nextLevel(l as never))).toEqual(['medium', 'normal', 'silent', 'strong'])
  })
})

describe('subdivisions', () => {
  it('splits a quarter-note beat evenly', () => {
    expect(pulseOffsets('quarter', 'none', 0.66)).toEqual([0])
    expect(pulseOffsets('quarter', 'eighths', 0.66)).toEqual([0, 0.5])
    expect(pulseOffsets('quarter', 'triplets', 0.66)).toEqual([0, 1 / 3, 2 / 3])
    expect(pulseOffsets('quarter', 'sixteenths', 0.66)).toEqual([0, 0.25, 0.5, 0.75])
  })

  it('swung eighths put the second click at the swing ratio', () => {
    expect(pulseOffsets('quarter', 'swing', 2 / 3)).toEqual([0, 2 / 3])
  })

  it('a dotted quarter holds 3 eighths or 6 sixteenths; swing and triplets fall back to none', () => {
    expect(pulseOffsets('dotted', 'eighths', 0.66)).toEqual([0, 1 / 3, 2 / 3])
    expect(pulseOffsets('dotted', 'sixteenths', 0.66)).toHaveLength(6)
    expect(pulseOffsets('dotted', 'swing', 0.66)).toEqual([0])
    expect(pulseOffsets('eighth', 'triplets', 0.66)).toEqual([0])
    expect(pulseOffsets('eighth', 'eighths', 0.66)).toEqual([0, 0.5])
  })

  it('a bar lists every click with its level, subdivisions marked as sub', () => {
    const events = barEvents(s({ meter: '2/4', subdivision: 'eighths', accents: ['strong', 'silent'] }))
    expect(events).toEqual([
      { at: 0, pulse: 0, level: 'strong' },
      { at: 0.5, pulse: 0, level: 'sub' },
      { at: 1, pulse: 1, level: 'silent' },
      { at: 1.5, pulse: 1, level: 'sub' },
    ])
  })
})

describe('speed trainer', () => {
  const t = { on: true, start: 60, target: 80, step: 5, every: 4, unit: 'bars' as const }

  it('adds a step every N bars and stops at the target', () => {
    expect([0, 3, 4, 8, 15, 16, 40].map((bar) => trainerTempo(t, bar, 0))).toEqual([60, 60, 65, 70, 75, 80, 80])
  })

  it('can step by elapsed seconds instead', () => {
    expect([0, 29, 30, 65].map((sec) => trainerTempo({ ...t, unit: 'seconds', every: 30 }, 0, sec))).toEqual([60, 60, 65, 70])
  })

  it('a target below the start slows down instead', () => {
    expect(trainerTempo({ ...t, start: 100, target: 90 }, 12, 0)).toBe(90)
    expect(trainerTempo({ ...t, start: 100, target: 90 }, 4, 0)).toBe(95)
  })
})

describe('gap trainer', () => {
  it('plays X bars then mutes Y bars, repeating', () => {
    const g = { on: true, play: 2, mute: 1 }
    expect([0, 1, 2, 3, 4, 5].map((b) => isMutedBar(g, b))).toEqual([false, false, true, false, false, true])
    expect(isMutedBar({ ...g, on: false }, 2)).toBe(false)
  })
})

describe('tap tempo', () => {
  it('needs two taps and averages the intervals', () => {
    expect(tapTempo([1000])).toBeNull()
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120)
  })

  it('ignores an outlier interval', () => {
    expect(tapTempo([0, 500, 1000, 1900, 2400])).toBe(120)
  })

  it('starts over after a pause and keeps only the last 5 taps', () => {
    expect(addTap([0, 500], 3000)).toEqual([3000])
    expect(addTap([0, 500, 1000, 1500, 2000], 2500)).toEqual([500, 1000, 1500, 2000, 2500])
  })
})

describe('settings', () => {
  it('fills missing and invalid stored fields with defaults', () => {
    const n = normalizeSettings({ tempo: 999, meter: '11/8' as never, subdivision: 'quintuplets' as never, trainer: { on: true } as never })
    expect(n.tempo).toBe(300)
    expect(n.meter).toBe('4/4')
    expect(n.subdivision).toBe('none')
    expect(n.trainer).toEqual({ ...DEFAULT_METRONOME.trainer, on: true })
    expect(normalizeSettings({ customBeats: 99, customUnit: 3 as never }).customBeats).toBe(32)
    expect(normalizeSettings({ customUnit: 3 as never }).customUnit).toBe(4)
  })

  it('names the tempo', () => {
    expect([35, 50, 72, 90, 112, 130, 210].map(tempoName)).toEqual(['grave', 'largo', 'adagio', 'andante', 'moderato', 'allegro', 'prestissimo'])
  })
})

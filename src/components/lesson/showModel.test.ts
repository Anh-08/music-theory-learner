import { describe, expect, it } from 'vitest'
import { ascendingMidis, buildShow, neckPositions, neckRun, pianoRangeFor } from './showModel'

describe('buildShow', () => {
  it('builds a scale and plays it up and down', () => {
    const m = buildShow({ root: 'C', scale: 'major' }, 'piano')
    expect(m.notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    expect(m.events.map((e) => e.midis[0])).toEqual([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60])
  })

  it('notes with octaves: piano highlights exactly those keys', () => {
    const m = buildShow({ notes: 'E4 G4 C5', labels: 'interval' }, 'piano')
    expect([...m.onlyMidis!]).toEqual([64, 67, 72])
    expect(m.highlights.get(4)).toEqual({ label: '1', isRoot: true })
    expect(m.highlights.get(0)?.label).toBe('♭6')
  })

  it('guitar shape: highlights only the shape positions and plays the right pitches', () => {
    const m = buildShow({ root: 'C', chord: 'M', shape: 'x32010' }, 'guitar')
    expect(m.only).toHaveLength(5)
    expect(m.events.map((e) => e.midis[0])).toEqual([48, 52, 55, 60, 64])
  })

  it('throws when information is missing', () => {
    expect(() => buildShow({}, 'guitar')).toThrow()
    expect(() => buildShow({ scale: 'major' }, 'guitar')).toThrow()
  })

  it('stacks notes upward and computes the piano key range', () => {
    expect(ascendingMidis(['G', 'C', 'E'], 60)).toEqual([67, 72, 76])
    expect(pianoRangeFor(new Set([43, 76]))).toEqual([36, 83])
    expect(pianoRangeFor()).toEqual([48, 71])
  })
})

describe('neckRun', () => {
  it('runs each position up and back down, one after another', () => {
    const boxes = neckPositions('G', 'major', 15)
    const run = neckRun(boxes, [0, 1])
    const first = boxes[0].notes.length * 2 - 1
    expect(run.events).toHaveLength(first + boxes[1].notes.length * 2 - 1)
    expect(run.steps[0]).toEqual({ position: 0, spot: { string: 6, fret: 0 } })
    expect(run.steps[first - 1].position).toBe(0)
    expect(run.steps[first].position).toBe(1)
    expect(run.events[first].at).toBeGreaterThan(run.events[first - 1].at + 0.24)
    expect(run.events.map((e) => e.midis[0])[first - 1]).toBe(run.events[0].midis[0])
  })
})

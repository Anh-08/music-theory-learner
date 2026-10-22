import { describe, expect, it } from 'vitest'
import { LickSyntaxError, parseLick } from '../lickText'
import { fretOf, measureCapacity, measureTicks } from '../score'

describe('lick text', () => {
  it('reads notes, durations, techniques and chord symbols', () => {
    const s = parseLick('[Am] 8 5:5h 5:7 4:5 4:7p | q 4:5 3:7b 8. 2:5~ 16 1:5x | h 4:7+3:5m r', { keySig: 'Am', tempo: 80 })
    const events = s.measures.flatMap((m) => m.events)
    expect(events.slice(0, 4).map((e) => `${e.duration}:${e.notes[0].string}:${fretOf(s, e.notes[0])}`)).toEqual(['8:5:5', '8:5:7', '8:4:5', '8:4:7'])
    expect(events[0].notes[0].tech).toEqual(['hammer'])
    expect(events[3].notes[0].tech).toEqual(['pull'])
    expect(events[5].notes[0].tech).toEqual(['bendFull'])
    expect(events[6]).toMatchObject({ duration: '8', dots: 1 })
    expect(events[7].notes[0].tech).toEqual(['dead'])
    expect(events[8].notes.map((n) => n.string).sort()).toEqual([3, 4])
    expect(events[8].notes.every((n) => n.tech?.includes('palmMute') || n.string === 4)).toBe(true)
    expect(events[9].rest).toBe(true)
    expect(s.measures[0].chords).toEqual([{ tick: 0, symbol: 'Am' }])
    expect(s.keySig).toBe('Am')
    expect(s.tempo).toBe(80)
  })

  it('fills bars from the time signature and pads the last one', () => {
    const s = parseLick('q 1:0 1:1 1:3 1:5 1:7', { timeSig: [3, 4] })
    expect(s.measures.map((m) => m.events.length)).toEqual([3, 3])
    expect(measureTicks(s.measures[1])).toBe(measureCapacity([3, 4]))
  })

  it('reads triplets, ties and half bends', () => {
    const s = parseLick('8t 3:5 3:7 3:5½ q 2:5t 2:5')
    const e = s.measures[0].events
    expect(e[0].tuplet).toBe(3)
    expect(e[2].notes[0].tech).toEqual(['bendHalf'])
    expect(e[3].tieToNext).toBe(true)
  })

  it('reports tokens it cannot read', () => {
    expect(() => parseLick('q 5:5 hello')).toThrow(LickSyntaxError)
    expect(() => parseLick('q 5-5')).toThrow('5-5')
  })
})

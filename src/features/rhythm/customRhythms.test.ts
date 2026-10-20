import { describe, expect, it } from 'vitest'
import { rhythm } from '../../audio/rhythms'
import { rhythmLabel, timeSignature } from './customRhythms'

describe('time signatures', () => {
  it('simple and compound time', () => {
    expect(timeSignature({ beatsPerBar: 4, stepsPerBeat: 2 })).toBe('4/4')
    expect(timeSignature({ beatsPerBar: 4, stepsPerBeat: 4 })).toBe('4/4')
    expect(timeSignature({ beatsPerBar: 3, stepsPerBeat: 2 })).toBe('3/4')
    expect(timeSignature({ beatsPerBar: 4, stepsPerBeat: 3 })).toBe('12/8')
    expect(timeSignature({ beatsPerBar: 2, stepsPerBeat: 3 })).toBe('6/8')
  })

  it('labels add the time signature unless the name already has it', () => {
    expect(rhythmLabel(rhythm('ballad'), 'vi')).toBe('Ballad / Pop (4/4)')
    expect(rhythmLabel(rhythm('slowrock'), 'vi')).toBe('Slow Rock (12/8)')
    expect(rhythmLabel(rhythm('slowrock'), 'en')).toBe('Slow rock (12/8)')
    expect(rhythmLabel(rhythm('slowrock68'), 'vi')).toBe('Slow Rock 6/8')
    expect(rhythmLabel(rhythm('slowrock68-pick'), 'en')).toBe('Slow rock picking (6/8)')
  })
})

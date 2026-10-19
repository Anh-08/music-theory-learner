import { beforeEach, describe, expect, it } from 'vitest'
import { createNoteStabilizer, disconnectLive, handleMidiMessage, liveStore, onLiveNote } from './liveInput'

describe('MIDI', () => {
  beforeEach(() => disconnectLive())

  it('key down / up updates held keys and emits note events', () => {
    const notes: number[] = []
    const off = onLiveNote((m) => notes.push(m))
    handleMidiMessage([0x90, 60, 100])
    handleMidiMessage([0x91, 64, 80]) // other channels count too
    expect(liveStore.get().held).toEqual([60, 64])
    handleMidiMessage([0x80, 60, 0])
    handleMidiMessage([0x90, 64, 0]) // note-on with velocity 0 = release
    expect(liveStore.get().held).toEqual([])
    expect(notes).toEqual([60, 64])
    off()
  })
})

describe('createNoteStabilizer', () => {
  it('reports a note only once it is stable for enough frames, without repeats', () => {
    const s = createNoteStabilizer(3)
    const out = [60, 60, 60, 60, 62, 62, 62, null, 62, 62, 62].map((m) => s(m))
    expect(out).toEqual([null, null, 60, null, null, null, 62, null, null, null, 62])
  })
})

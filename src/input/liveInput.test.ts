import { beforeEach, describe, expect, it } from 'vitest'
import { createNoteStabilizer, disconnectLive, handleMidiMessage, liveStore, onLiveNote } from './liveInput'

describe('MIDI', () => {
  beforeEach(() => disconnectLive())

  it('nhấn / nhả phím cập nhật danh sách phím giữ và phát sự kiện nốt', () => {
    const notes: number[] = []
    const off = onLiveNote((m) => notes.push(m))
    handleMidiMessage([0x90, 60, 100])
    handleMidiMessage([0x91, 64, 80]) // kênh khác vẫn tính
    expect(liveStore.get().held).toEqual([60, 64])
    handleMidiMessage([0x80, 60, 0])
    handleMidiMessage([0x90, 64, 0]) // note-on velocity 0 = nhả
    expect(liveStore.get().held).toEqual([])
    expect(notes).toEqual([60, 64])
    off()
  })
})

describe('createNoteStabilizer', () => {
  it('chỉ báo nốt khi ổn định đủ khung, không báo lặp', () => {
    const s = createNoteStabilizer(3)
    const out = [60, 60, 60, 60, 62, 62, 62, null, 62, 62, 62].map((m) => s(m))
    expect(out).toEqual([null, null, 60, null, null, null, 62, null, null, null, 62])
  })
})

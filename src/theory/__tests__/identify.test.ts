import { describe, expect, it } from 'vitest'
import { identifyChord } from '../identify'

describe('identifyChord', () => {
  it('nhận ra hợp âm ba và hợp âm 7', () => {
    expect(identifyChord([60, 64, 67])[0]).toMatchObject({ name: 'C', formula: '1 3 5' })
    expect(identifyChord([57, 60, 64])[0].name).toBe('Am')
    expect(identifyChord([55, 59, 62, 65])[0].name).toBe('G7')
    expect(identifyChord([59, 62, 65, 69])[0].name).toBe('Bm7♭5')
  })

  it('thế bấm guitar thật (C mở x32010)', () => {
    expect(identifyChord([48, 52, 55, 60, 64])[0].name).toBe('C')
  })

  it('bass không phải nốt gốc thì ra hợp âm "/"', () => {
    expect(identifyChord([52, 55, 60])[0].name).toBe('C/E')
  })

  it('ít hơn 3 nốt khác tên thì không đoán', () => {
    expect(identifyChord([60, 72, 64])).toEqual([])
  })
})

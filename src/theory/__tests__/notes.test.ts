import { describe, expect, it } from 'vitest'
import { bestRootSpelling, chroma, displayNote, midi, noteFromMidi, rootLabel, spellingsOf } from '../notes'
import { Scale } from 'tonal'

describe('notes', () => {
  it('computes chroma and midi', () => {
    expect(chroma('C')).toBe(0)
    expect(chroma('Db')).toBe(1)
    expect(chroma('B#')).toBe(0)
    expect(midi('E2')).toBe(40)
    expect(midi('A4')).toBe(69)
  })

  it('throws on invalid notes', () => {
    expect(() => chroma('H')).toThrow()
  })

  it('converts midi to note names with sharps or flats', () => {
    expect(noteFromMidi(61)).toBe('C#4')
    expect(noteFromMidi(61, true)).toBe('Db4')
  })

  it('shows ♯ ♭ symbols', () => {
    expect(displayNote('Bb')).toBe('B♭')
    expect(displayNote('F#')).toBe('F♯')
    expect(displayNote('Bbb')).toBe('B♭♭')
    expect(rootLabel(1)).toBe('C♯ / D♭')
    expect(rootLabel(0)).toBe('C')
  })

  it('lists the possible spellings', () => {
    expect(spellingsOf(0)).toEqual(['C'])
    expect(spellingsOf(10)).toEqual(['A#', 'Bb'])
  })

  it('picks the root spelling with the fewest accidentals', () => {
    const major = (r: string) => Scale.get(`${r} major`).notes
    const minor = (r: string) => Scale.get(`${r} minor`).notes
    expect(bestRootSpelling(1, major)).toBe('Db')
    expect(bestRootSpelling(10, major)).toBe('Bb')
    expect(bestRootSpelling(1, minor)).toBe('C#')
    expect(bestRootSpelling(8, minor)).toBe('G#')
  })
})

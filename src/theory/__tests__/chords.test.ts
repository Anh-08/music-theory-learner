import { describe, expect, it } from 'vitest'
import { CHORD_TYPES, getChord } from '../chords'

describe('chords', () => {
  it('builds triads', () => {
    expect(getChord(0, 'M').notes).toEqual(['C', 'E', 'G'])
    expect(getChord(9, 'm').notes).toEqual(['A', 'C', 'E'])
    expect(getChord(11, 'dim').notes).toEqual(['B', 'D', 'F'])
  })

  it('builds seventh chords with the right formula', () => {
    const c = getChord(11, 'm7b5')
    expect(c.notes).toEqual(['B', 'D', 'F', 'A'])
    expect(c.labels).toEqual(['1', '♭3', '♭5', '♭7'])
    expect(getChord(7, '7').notes).toEqual(['G', 'B', 'D', 'F'])
    expect(getChord(0, 'dim7').labels).toEqual(['1', '♭3', '♭5', '♭♭7'])
  })

  it('picks a sensible root spelling', () => {
    expect(getChord(10, 'M').root).toBe('Bb')
    expect(getChord(6, 'm').root).toBe('F#')
  })

  it('builds every chord type on every root', () => {
    for (const t of CHORD_TYPES) {
      for (let c = 0; c < 12; c++) {
        const chord = getChord(c, t.id)
        expect(chord.notes.length, `${c} ${t.id}`).toBeGreaterThanOrEqual(3)
      }
    }
  })
})

describe('chordFromRoot', () => {
  it('keeps the root spelling and builds the symbol', async () => {
    const { chordFromRoot, chordSymbol } = await import('../chords')
    expect(chordFromRoot('Gb', 'M').notes).toEqual(['Gb', 'Bb', 'Db'])
    expect(chordSymbol('Bb', 'm7')).toBe('B♭m7')
    expect(chordSymbol('C', 'M')).toBe('C')
  })
})

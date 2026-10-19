import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getScale, makeHighlights, tuning } from '../../theory'
import { Fretboard } from './Fretboard'

describe('Fretboard', () => {
  const cMajor = getScale(0, 'major')
  const highlights = makeHighlights(cMajor.notes, cMajor.labels, 'note')

  it('highlights the scale notes and marks the root', () => {
    const { container } = render(<Fretboard tuning={tuning('standard')} fretCount={12} highlights={highlights} />)
    // String 5 fret 3 is C (root), string 6 fret 1 is F (in the scale), string 6 fret 2 is F♯ (not in the scale).
    expect(screen.getByLabelText('Dây 5, phím 3: C')).toHaveAttribute('data-highlighted', 'root')
    expect(screen.getByLabelText('Dây 6, phím 1: F')).toHaveAttribute('data-highlighted', 'tone')
    expect(screen.getByLabelText('Dây 6, phím 2: F♯ / G♭')).not.toHaveAttribute('data-highlighted')
    // Each string has 13 positions, 7/12 notes are in C major → 7 positions per octave, plus fret 12 repeating fret 0.
    expect(container.querySelectorAll('[data-highlighted]')).toHaveLength(6 * 8)
  })

  it('reports the clicked position', () => {
    const onNoteClick = vi.fn()
    render(<Fretboard tuning={tuning('standard')} fretCount={5} highlights={highlights} onNoteClick={onNoteClick} />)
    fireEvent.click(screen.getByLabelText('Dây 6, phím 5: A'))
    expect(onNoteClick).toHaveBeenCalledWith(expect.objectContaining({ string: 6, fret: 5, midi: 45 }))
  })
})

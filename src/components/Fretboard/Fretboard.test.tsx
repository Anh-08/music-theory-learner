import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getScale, makeHighlights, tuning } from '../../theory'
import { Fretboard } from './Fretboard'

describe('Fretboard', () => {
  const cMajor = getScale(0, 'major')
  const highlights = makeHighlights(cMajor.notes, cMajor.labels, 'note')

  it('tô sáng đúng các nốt của scale và đánh dấu chủ âm', () => {
    const { container } = render(<Fretboard tuning={tuning('standard')} fretCount={12} highlights={highlights} />)
    // Dây 5 phím 3 là C (chủ âm), dây 6 phím 1 là F (thuộc scale), dây 6 phím 2 là F♯ (không thuộc scale).
    expect(screen.getByLabelText('Dây 5, phím 3: C')).toHaveAttribute('data-highlighted', 'root')
    expect(screen.getByLabelText('Dây 6, phím 1: F')).toHaveAttribute('data-highlighted', 'tone')
    expect(screen.getByLabelText('Dây 6, phím 2: F♯ / G♭')).not.toHaveAttribute('data-highlighted')
    // Mỗi dây có 13 vị trí, 7/12 nốt thuộc C trưởng → mỗi quãng tám 7 vị trí, cộng phím 12 lặp lại phím 0.
    expect(container.querySelectorAll('[data-highlighted]')).toHaveLength(6 * 8)
  })

  it('báo vị trí được bấm', () => {
    const onNoteClick = vi.fn()
    render(<Fretboard tuning={tuning('standard')} fretCount={5} highlights={highlights} onNoteClick={onNoteClick} />)
    fireEvent.click(screen.getByLabelText('Dây 6, phím 5: A'))
    expect(onNoteClick).toHaveBeenCalledWith(expect.objectContaining({ string: 6, fret: 5, midi: 45 }))
  })
})

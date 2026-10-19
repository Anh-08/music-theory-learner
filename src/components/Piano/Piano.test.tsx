import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getChord, makeHighlights } from '../../theory'
import { Piano } from './Piano'

describe('Piano', () => {
  const d = getChord(2, 'M')
  const highlights = makeHighlights(d.notes, d.labels, 'interval')

  it('draws every key and highlights the chord notes', () => {
    const { container } = render(<Piano startMidi={60} endMidi={71} highlights={highlights} />)
    expect(screen.getAllByRole('button')).toHaveLength(12)
    expect(screen.getByLabelText('Phím D quãng tám 4')).toHaveAttribute('data-highlighted', 'root')
    expect(screen.getByLabelText('Phím F♯ / G♭ quãng tám 4')).toHaveAttribute('data-highlighted', 'tone')
    expect(container.querySelectorAll('[data-highlighted]')).toHaveLength(3)
  })

  it('reports the clicked key', () => {
    const onKeyClick = vi.fn()
    render(<Piano startMidi={60} endMidi={71} highlights={highlights} onKeyClick={onKeyClick} />)
    fireEvent.click(screen.getByLabelText('Phím E quãng tám 4'))
    expect(onKeyClick).toHaveBeenCalledWith(64)
  })
})

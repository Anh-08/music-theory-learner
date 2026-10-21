import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { ClickSettings } from './ClickSettings'

describe('ClickSettings', () => {
  it('changes the shared metronome sound and volume and remembers them', () => {
    renderWithProviders(<ClickSettings />)
    expect(screen.getByRole('radio', { name: 'Mềm' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: 'Gõ gỗ' }))
    fireEvent.change(screen.getByLabelText(/Âm lượng metronome/), { target: { value: '40' } })
    expect(screen.getByRole('radio', { name: 'Gõ gỗ' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Âm lượng metronome: 40%')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('mtl:click')!)).toEqual({ sound: 'wood', volume: 0.4 })
  })
})

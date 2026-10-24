import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CLICK, setClickSettings } from '../../audio/click'
import { renderWithProviders } from '../../test/renderWithProviders'
import { ClickSettings, ClickVolume } from './ClickSettings'

describe('ClickSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    act(() => setClickSettings(DEFAULT_CLICK))
  })

  it('changes the shared metronome sound and volume and remembers them', () => {
    renderWithProviders(<ClickSettings />)
    expect(screen.getByText('Tiếng metronome · 100% ▾')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Mềm' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: 'Gõ gỗ' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Âm lượng metronome' }), { target: { value: '40' } })
    expect(screen.getByRole('radio', { name: 'Gõ gỗ' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Âm lượng metronome: 40%')).toBeInTheDocument()
    expect(screen.getByText('Tiếng metronome · 40% ▾')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('mtl:click')!)).toEqual({ sound: 'wood', volume: 0.4 })
  })

  it('− / + step by 10% between 0% and 200%', () => {
    renderWithProviders(<ClickVolume />)
    const louder = screen.getByRole('button', { name: 'Tăng âm lượng metronome' })
    for (let i = 0; i < 12; i++) fireEvent.click(louder)
    expect(screen.getByText('Âm lượng metronome: 200%')).toBeInTheDocument()
    expect(louder).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Giảm âm lượng metronome' }))
    expect(screen.getByText('Âm lượng metronome: 190%')).toBeInTheDocument()
    act(() => setClickSettings({ volume: 0.1 }))
    fireEvent.click(screen.getByRole('button', { name: 'Giảm âm lượng metronome' }))
    expect(screen.getByRole('button', { name: 'Giảm âm lượng metronome' })).toBeDisabled()
  })
})

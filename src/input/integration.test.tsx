import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from '../App'
import { NoteDrill } from '../components/exercises/NoteDrill'
import { renderWithProviders } from '../test/renderWithProviders'
import { disconnectLive, handleMidiMessage, liveStore } from './liveInput'

describe('real instrument', () => {
  beforeEach(() => {
    localStorage.clear()
    act(() => disconnectLive())
  })

  it('answers the note-name drill by playing a note on a MIDI keyboard', () => {
    renderWithProviders(<NoteDrill id="d" naturalsOnly strings="6" maxFret={0} />, { instrument: 'guitar' })
    act(() => liveStore.set({ source: 'midi', status: 'on' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }))
    expect(screen.getByText(/Hoặc chơi nốt trên đàn thật/)).toBeInTheDocument()
    act(() => handleMidiMessage([0x90, 52, 90])) // E3 — same note name E as open string 6
    expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi')
  })

  it('identifies the chord from held MIDI keys', () => {
    renderWithProviders(<AppRoutes />, { route: '/identify', instrument: 'piano' })
    act(() => {
      liveStore.set({ source: 'midi', status: 'on' })
      handleMidiMessage([0x90, 57, 90])
      handleMidiMessage([0x90, 60, 90])
      handleMidiMessage([0x90, 64, 90])
    })
    expect(screen.getByText('Am')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '🎹 MIDI' })).toBeInTheDocument()
  })

  it('connect page: reports when the browser does not support MIDI', async () => {
    renderWithProviders(<AppRoutes />, { route: '/connect' })
    fireEvent.click(screen.getByRole('button', { name: 'Kết nối MIDI' }))
    expect(await screen.findByText(/không hỗ trợ/)).toBeInTheDocument()
  })
})

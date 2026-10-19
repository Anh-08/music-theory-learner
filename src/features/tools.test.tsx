import { act, fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from '../App'
import { renderWithProviders } from '../test/renderWithProviders'

describe('Key Explorer', () => {
  beforeEach(() => localStorage.clear())

  it('shows diatonic chords and changes key on the circle of fifths', () => {
    renderWithProviders(<AppRoutes />, { route: '/keys' })
    expect(screen.getByRole('heading', { level: 2, name: 'C trưởng' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nghe tiến trình Dm' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hợp âm E thứ' }))
    expect(screen.getByRole('heading', { level: 2, name: 'E thứ' })).toBeInTheDocument()
    expect(screen.getByText(/1♯ \(F♯\)/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Hợp âm 7' }))
    expect(screen.getByRole('button', { name: 'Nghe tiến trình F♯m7♭5' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'G trưởng' }))
    expect(screen.getByRole('heading', { level: 2, name: 'G trưởng' })).toBeInTheDocument()
  })
})

describe('Chord identifier', () => {
  beforeEach(() => localStorage.clear())

  it('guitar: fretting an open C shape gives a C chord, one note per string', () => {
    renderWithProviders(<AppRoutes />, { route: '/identify', instrument: 'guitar' })
    for (const label of ['Dây 5, phím 3: C', 'Dây 4, phím 2: E', 'Dây 3, buông: G', 'Dây 2, phím 1: C', 'Dây 1, buông: E']) fireEvent.click(screen.getByLabelText(label))
    const region = screen.getByText('Có thể là').parentElement!
    expect(within(region).getByText('C')).toBeInTheDocument()
    // Another fret on the same string replaces the old note: string 4 fret 2 (E) → fret 1 (D#); check the note was replaced.
    fireEvent.click(screen.getByLabelText('Dây 4, phím 1: D♯ / E♭'))
    expect(screen.getByText(/C – D♯ – G – C – E|C – E♭ – G – C – E/)).toBeInTheDocument()
  })

  it('piano: prompts when there are fewer than 3 notes', () => {
    renderWithProviders(<AppRoutes />, { route: '/identify', instrument: 'piano' })
    fireEvent.click(screen.getByLabelText('Phím A quãng tám 3'))
    fireEvent.click(screen.getByLabelText('Phím C quãng tám 4'))
    expect(screen.getByText('Chọn ít nhất 3 nốt khác nhau.')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Phím E quãng tám 4'))
    expect(screen.getByText('Am')).toBeInTheDocument()
  })
})

describe('Review', () => {
  beforeEach(() => localStorage.clear())

  it('one review session: answer, schedule the review, finish', () => {
    localStorage.setItem('mtl:review.decks', JSON.stringify(['key-sig']))
    renderWithProviders(<AppRoutes />, { route: '/review' })
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu ôn \(12 thẻ\)/ }))
    expect(screen.getByText('Thẻ 1/12')).toBeInTheDocument()
    const options = screen.getAllByRole('button').filter((b) => /^(\d+[♯♭]|0)$/.test(b.textContent ?? ''))
    fireEvent.click(options[0])
    expect(screen.getByRole('status')).toBeInTheDocument()
    const srs = JSON.parse(localStorage.getItem('mtl:progress')!).srs
    expect(Object.keys(srs)).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp →' }))
    expect(screen.getByText(/Thẻ 2\/1[23]/)).toBeInTheDocument()
  })
})

describe('Chord identifier — quick clicks', () => {
  beforeEach(() => localStorage.clear())

  it('several notes clicked in the same tick are all kept', () => {
    renderWithProviders(<AppRoutes />, { route: '/identify', instrument: 'guitar' })
    act(() => {
      for (const label of ['Dây 6, phím 3: G', 'Dây 5, phím 2: B', 'Dây 4, buông: D', 'Dây 1, phím 1: F']) {
        screen.getByLabelText(label).dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }
    })
    expect(screen.getByText('G7')).toBeInTheDocument()
  })
})

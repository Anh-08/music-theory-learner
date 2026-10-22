import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import { renderWithProviders } from '../../test/renderWithProviders'
import { newScore } from '../../theory/score'
import { listSheets, loadSheet, saveSheet } from './sheetStore'
import { buildTemplate } from './templates'

vi.mock('../../components/Score/loadVex', () => ({ loadVex: () => new Promise(() => {}) }))

describe('learning overlays and the Jam Room', () => {
  beforeEach(() => localStorage.clear())

  it('counts notes outside the chosen scale', () => {
    // A, B, C#: in A minor pentatonic only A is in the scale.
    const notes = [69, 71, 73].map((midi) => ({ duration: 'q' as const, dots: 0 as const, notes: [{ midi, string: 1 }] }))
    saveSheet(newScore('s1', { keySig: 'Am', measures: [{ events: notes, chords: [{ tick: 0, symbol: 'Am' }] }] }))
    renderWithProviders(<AppRoutes />, { route: '/sheet/s1' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tô màu theo vai trò' }))
    expect(screen.getByText('1 nốt ngoài âm giai')).toBeInTheDocument() // C# is outside A natural minor
    fireEvent.change(screen.getByRole('combobox', { name: 'So với âm giai' }), { target: { value: 'minor pentatonic' } })
    expect(screen.getByText('2 nốt ngoài âm giai')).toBeInTheDocument()
  })

  it('links the score’s chords to the Jam Room', () => {
    saveSheet(buildTemplate('blues', 'b1', 'Blues'))
    renderWithProviders(<AppRoutes />, { route: '/sheet/b1' })
    const link = screen.getByRole('link', { name: 'Ngẫu hứng trên vòng hợp âm này trong Jam Room →' })
    const url = new URL(link.getAttribute('href')!, 'http://x')
    expect(url.searchParams.get('p')).toBe('A7*4 D7*2 A7*2 E7 D7 A7 E7')
    expect(url.searchParams.get('key')).toBe('A')
    expect(url.searchParams.get('tempo')).toBe('110')
  })

  it('hints when interval labels need chord symbols', () => {
    saveSheet(newScore('s2'))
    renderWithProviders(<AppRoutes />, { route: '/sheet/s2' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Nhãn dưới nốt' }), { target: { value: 'chord' } })
    expect(screen.getByText(/để xem quãng so với hợp âm/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ngẫu hứng trên vòng hợp âm này trong Jam Room →' })).not.toBeInTheDocument()
  })

  it('notates a Jam Room progression as a new score', () => {
    renderWithProviders(<AppRoutes />, { route: '/jam?p=Am%20F%20C%20G&tempo=100' })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi thành bản nhạc →' }))
    const s = loadSheet(listSheets()[0].id)!
    expect(s.measures.map((m) => m.chords?.[0].symbol)).toEqual(['Am', 'F', 'C', 'G'])
    expect(s.tempo).toBe(100)
    expect(screen.getByRole('textbox', { name: 'Tên bản nhạc' })).toHaveValue('Am F C G')
  })
})

import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import { startJam } from '../../audio/jam'
import { jamStore } from '../../audio/jamStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { RhythmTrainer } from '../rhythm/RhythmTrainer'

describe('Thế bấm hợp âm', () => {
  beforeEach(() => localStorage.clear())

  it('hiện nhiều thế bấm cho hợp âm đã chọn, kể cả hợp âm mở rộng', () => {
    renderWithProviders(<AppRoutes />, { route: '/chords' })
    expect(screen.getByRole('img', { name: 'Sơ đồ hợp âm C: x 3 2 0 1 0' })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /^Sơ đồ hợp âm C:/ }).length).toBeGreaterThanOrEqual(5)
    fireEvent.change(screen.getByLabelText('Chủ âm'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Loại hợp âm'), { target: { value: '7#9' } })
    expect(screen.getByRole('heading', { name: 'E7♯9' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Sơ đồ hợp âm E7♯9: x 7 6 7 8 x' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Loại hợp âm'), { target: { value: '13' } })
    expect(screen.getByText(/Khi bấm có thể bỏ/)).toBeInTheDocument()
  })
})

describe('Đổi thế bấm trong trang Đệm guitar', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(startJam).mockClear()
    jamStore.set({ ownerId: null, bar: 0, step: -1 })
  })

  it('đổi thế bấm của hợp âm và điệu dùng đúng thế đó', () => {
    renderWithProviders(<RhythmTrainer rhythm="ballad" progression="C G" />)
    expect(screen.getByText('Thế 1/7')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Sơ đồ hợp âm C: x 3 2 0 1 0' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thế tiếp' }))
    expect(screen.getByText('Thế 2/7')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '▶ Chơi điệu' }))
    const opts = vi.mocked(startJam).mock.calls[0][0]
    expect(opts.shapes?.C).toEqual([null, 3, 5, 5, 5, 3])
    expect(opts.shapes?.G).toEqual([3, 2, 0, 0, 0, 3])
  })
})

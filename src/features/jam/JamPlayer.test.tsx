import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startJam, stopJam } from '../../audio/jam'
import { jamStore } from '../../audio/jamStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { JamPlayer } from './JamPlayer'
import { act } from 'react'

describe('JamPlayer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(startJam).mockClear()
    vi.mocked(stopJam).mockClear()
    jamStore.set({ ownerId: null, bar: 0 })
  })

  it('hiển thị hợp âm, số La Mã và giọng tự đoán', () => {
    renderWithProviders(<JamPlayer progression="G D Em C" />)
    const chords = within(screen.getByRole('list', { name: 'Các hợp âm' })).getAllByRole('button')
    expect(chords.map((c) => c.textContent)).toEqual(['GI', 'DV', 'Emvi', 'CIV'])
    expect(screen.getByText('G trưởng')).toBeInTheDocument()
  })

  it('phát, theo dõi ô nhịp và dừng', async () => {
    renderWithProviders(<JamPlayer progression="C G Am F" groove="rock" />)
    fireEvent.click(screen.getByRole('button', { name: '▶ Phát nhạc nền' }))
    expect(startJam).toHaveBeenCalledWith(expect.objectContaining({ tempo: 112, instrument: 'guitar' }))
    expect(await screen.findByRole('button', { name: '■ Dừng' })).toBeInTheDocument()
    act(() => jamStore.set({ bar: 2 }))
    const current = within(screen.getByRole('list', { name: 'Các hợp âm' })).getByRole('button', { current: true })
    expect(current).toHaveTextContent('Am')
    fireEvent.click(screen.getByRole('button', { name: '■ Dừng' }))
    expect(stopJam).toHaveBeenCalled()
  })

  it('trang Jam Room: báo lỗi khi gõ sai nhưng vẫn giữ tiến trình cũ', () => {
    renderWithProviders(<JamPlayer editable progression="C G" />)
    fireEvent.change(screen.getByLabelText('Tiến trình hợp âm'), { target: { value: 'C Xm' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Xm')
    expect(within(screen.getByRole('list', { name: 'Các hợp âm' })).getAllByRole('button')).toHaveLength(2)
  })

  it('chọn tiến trình mẫu', () => {
    renderWithProviders(<JamPlayer editable progression="C G" />)
    fireEvent.click(screen.getByRole('button', { name: 'Blues 12 ô nhịp' }))
    expect(screen.getByLabelText('Tiến trình hợp âm')).toHaveValue('A7*4 D7*2 A7*2 E7 D7 A7 E7')
    expect(screen.getByLabelText('Nhịp điệu')).toHaveValue('blues')
    expect(screen.getByLabelText('Scale để improvise')).toHaveDisplayValue(/A Ngũ cung thứ/)
  })

  it('đổi giọng thì dịch hợp âm theo giọng mới, tiến trình mẫu theo giọng đang chọn', () => {
    renderWithProviders(<JamPlayer editable progression="C G Am F" songKey="C" />)
    fireEvent.change(screen.getByLabelText('Giọng'), { target: { value: 'Eb' } })
    expect(screen.getByLabelText('Tiến trình hợp âm')).toHaveValue('Eb Bb Cm Ab')
    const romans = within(screen.getByRole('list', { name: 'Các hợp âm' })).getAllByRole('button').map((b) => b.textContent)
    expect(romans).toEqual(['E♭I', 'B♭V', 'Cmvi', 'A♭IV'])
    fireEvent.click(screen.getByRole('button', { name: 'Rock giọng thứ' }))
    expect(screen.getByLabelText('Giọng')).toHaveValue('Cm')
    expect(screen.getByLabelText('Tiến trình hợp âm')).toHaveValue('Cm Bb Ab Bb')
  })
})

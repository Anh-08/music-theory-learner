import { act, fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startJam } from '../../audio/jam'
import { jamStore } from '../../audio/jamStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { RhythmTrainer } from './RhythmTrainer'

describe('RhythmTrainer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(startJam).mockClear()
    jamStore.set({ ownerId: null, bar: 0, step: -1 })
  })

  it('plays the rhythm with a groove and guitar sound, the playhead follows the steps', async () => {
    renderWithProviders(<RhythmTrainer rhythm="valse" progression="C G" />)
    fireEvent.click(screen.getByRole('button', { name: '▶ Chơi điệu' }))
    expect(startJam).toHaveBeenCalledWith(expect.objectContaining({ instrument: 'guitar', rhythm: expect.objectContaining({ id: 'valse' }), groove: expect.objectContaining({ id: 'waltz' }) }))
    await screen.findByRole('button', { name: '■ Dừng' })
    act(() => jamStore.set({ step: 2 }))
    // The playing column is highlighted (the "2" header of beat 2 gets the accent colour).
    const header = within(screen.getByRole('table', { name: 'Lưới phách của điệu' })).getAllByRole('columnheader')[3]
    expect(header.className).toContain('text-rose')
  })

  it('changes rhythm and creates a custom rhythm', () => {
    renderWithProviders(<RhythmTrainer editable rhythm="ballad" progression="C G" />)
    fireEvent.change(screen.getByLabelText('Điệu'), { target: { value: 'disco' } })
    expect(screen.getByLabelText('Quạt, bước 3: chặn')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tự tạo điệu từ điệu này' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quạt, bước 1: xuống' }))
    expect(screen.getByRole('button', { name: 'Quạt, bước 1: lên' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tên điệu'), { target: { value: 'Disco của tôi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu điệu' }))
    const saved = JSON.parse(localStorage.getItem('mtl:rhythms.custom')!)
    expect(saved).toEqual([expect.objectContaining({ name: 'Disco của tôi', pattern: 'U U X U D U X U', beatsPerBar: 4 })])
    expect(screen.getByLabelText('Điệu')).toHaveValue('custom-1')
    fireEvent.click(screen.getByRole('button', { name: 'Xóa điệu này' }))
    expect(JSON.parse(localStorage.getItem('mtl:rhythms.custom')!)).toEqual([])
  })

  it('shows an error on a bad progression', () => {
    renderWithProviders(<RhythmTrainer editable progression="C G" />)
    fireEvent.change(screen.getByLabelText('Tiến trình'), { target: { value: 'C Qm' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Qm')
  })
})

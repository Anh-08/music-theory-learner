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

  it('phát điệu với groove và tiếng guitar, vạch chạy theo bước', async () => {
    renderWithProviders(<RhythmTrainer rhythm="valse" progression="C G" />)
    fireEvent.click(screen.getByRole('button', { name: '▶ Chơi điệu' }))
    expect(startJam).toHaveBeenCalledWith(expect.objectContaining({ instrument: 'guitar', rhythm: expect.objectContaining({ id: 'valse' }), groove: expect.objectContaining({ id: 'waltz' }) }))
    await screen.findByRole('button', { name: '■ Dừng' })
    act(() => jamStore.set({ step: 2 }))
    // Cột đang phát được tô (tiêu đề "2" của phách 2 có màu nhấn).
    const header = within(screen.getByRole('table', { name: 'Lưới phách của điệu' })).getAllByRole('columnheader')[3]
    expect(header.className).toContain('text-rose')
  })

  it('đổi điệu và tự tạo điệu riêng', () => {
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

  it('báo lỗi khi gõ sai tiến trình', () => {
    renderWithProviders(<RhythmTrainer editable progression="C G" />)
    fireEvent.change(screen.getByLabelText('Tiến trình'), { target: { value: 'C Qm' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Qm')
  })
})

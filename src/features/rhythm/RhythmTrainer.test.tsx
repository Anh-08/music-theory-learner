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

  it('a custom rhythm can switch to sixteenths', () => {
    renderWithProviders(<RhythmTrainer editable rhythm="ballad" progression="C G" />)
    fireEvent.click(screen.getByRole('button', { name: 'Tự tạo điệu từ điệu này' }))
    expect(screen.queryByRole('button', { name: /^Quạt, bước 16:/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Móc kép (1 e & a)' }))
    expect(screen.getByRole('button', { name: 'Quạt, bước 5: xuống' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Quạt, bước 2:/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu điệu' }))
    const [saved] = JSON.parse(localStorage.getItem('mtl:rhythms.custom')!)
    expect(saved).toMatchObject({ stepsPerBeat: 4, beatsPerBar: 4, pattern: 'D D - - D - U - - - U - D - U -' })
    expect(screen.getByLabelText(/^Quạt, bước 16:/)).toBeInTheDocument()
  })

  it('drags across cells to switch several on, and drags back to undo', () => {
    renderWithProviders(<RhythmTrainer editable rhythm="ballad-pick" progression="C G" />)
    fireEvent.click(screen.getByRole('button', { name: 'Tự tạo điệu từ điệu này' }))
    const cell = (row: string, n: number) => screen.getByRole('button', { name: new RegExp(`^${row}, bước ${n}:`) })
    // Step 2 of "B 3 2 3 1 3 2 3" only picks string 3: drag down from string 1 to string 3.
    fireEvent.pointerDown(cell('Dây 1', 2), { button: 0, pointerId: 1 })
    fireEvent.pointerEnter(cell('Dây 2', 2), { pointerId: 1 })
    fireEvent.pointerEnter(cell('Dây 3', 2), { pointerId: 1 })
    expect(cell('Dây 1', 2)).toHaveAccessibleName('Dây 1, bước 2: có')
    expect(cell('Dây 2', 2)).toHaveAccessibleName('Dây 2, bước 2: có')
    expect(cell('Dây 3', 2)).toHaveAccessibleName('Dây 3, bước 2: có')
    // Dragging back up shrinks the block: string 2 goes back to off (string 3 was already on before the drag).
    fireEvent.pointerEnter(cell('Dây 1', 2), { pointerId: 1 })
    expect(cell('Dây 2', 2)).toHaveAccessibleName('Dây 2, bước 2: không')
    fireEvent.pointerUp(window, { pointerId: 1 })
    // After the drag ends, moving over cells changes nothing.
    fireEvent.pointerEnter(cell('Dây 1', 3), { pointerId: 1 })
    expect(cell('Dây 1', 3)).toHaveAccessibleName('Dây 1, bước 3: không')
    expect(cell('Dây 1', 2)).toHaveAccessibleName('Dây 1, bước 2: có')
  })

  it('shows an error on a bad progression', () => {
    renderWithProviders(<RhythmTrainer editable progression="C G" />)
    fireEvent.change(screen.getByLabelText('Tiến trình'), { target: { value: 'C Qm' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Qm')
  })
})

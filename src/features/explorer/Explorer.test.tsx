import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { Explorer } from './Explorer'

describe('Explorer', () => {
  beforeEach(() => localStorage.clear())

  it('mặc định hiển thị C trưởng trên guitar', () => {
    render(<Explorer />)
    expect(screen.getByRole('heading', { name: 'C Trưởng' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Cần đàn guitar/ })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Bàn phím piano/ })).not.toBeInTheDocument()
  })

  it('đổi chủ âm và loại scale', () => {
    render(<Explorer />)
    fireEvent.change(screen.getByLabelText('Chủ âm'), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText('Loại scale'), { target: { value: 'minor pentatonic' } })
    expect(screen.getByRole('heading', { name: 'A Ngũ cung thứ' })).toBeInTheDocument()
    const notes = screen.getByRole('region', { name: 'Các nốt' })
    expect(notes).toHaveTextContent('ACDEG')
  })

  it('chuyển sang hợp âm và piano', () => {
    render(<Explorer />)
    fireEvent.click(screen.getByRole('radio', { name: 'Hợp âm' }))
    fireEvent.change(screen.getByLabelText('Loại hợp âm'), { target: { value: 'maj7' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Piano' }))
    expect(screen.getByRole('heading', { name: 'Cmaj7' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Bàn phím piano/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Tuning')).not.toBeInTheDocument()
  })

  it('nhớ lựa chọn sau khi tải lại', () => {
    const { unmount } = render(<Explorer />)
    fireEvent.change(screen.getByLabelText('Chủ âm'), { target: { value: '7' } })
    unmount()
    render(<Explorer />)
    expect(screen.getByRole('heading', { name: 'G Trưởng' })).toBeInTheDocument()
  })
})

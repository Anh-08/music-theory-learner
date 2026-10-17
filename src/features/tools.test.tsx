import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from '../App'
import { renderWithProviders } from '../test/renderWithProviders'

describe('Key Explorer', () => {
  beforeEach(() => localStorage.clear())

  it('hiện hợp âm thuận giọng và đổi giọng trên vòng quãng năm', () => {
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

describe('Nhận diện hợp âm', () => {
  beforeEach(() => localStorage.clear())

  it('guitar: bấm thế C mở thì ra hợp âm C, mỗi dây một nốt', () => {
    renderWithProviders(<AppRoutes />, { route: '/identify', instrument: 'guitar' })
    for (const label of ['Dây 5, phím 3: C', 'Dây 4, phím 2: E', 'Dây 3, buông: G', 'Dây 2, phím 1: C', 'Dây 1, buông: E']) fireEvent.click(screen.getByLabelText(label))
    const region = screen.getByText('Có thể là').parentElement!
    expect(within(region).getByText('C')).toBeInTheDocument()
    // Bấm phím khác trên cùng dây thì thay nốt cũ: dây 4 phím 2 (E) → phím 1 (D#)… thành C+/C aug? kiểm tra nốt được thay.
    fireEvent.click(screen.getByLabelText('Dây 4, phím 1: D♯ / E♭'))
    expect(screen.getByText(/C – D♯ – G – C – E|C – E♭ – G – C – E/)).toBeInTheDocument()
  })

  it('piano: chưa đủ 3 nốt thì nhắc', () => {
    renderWithProviders(<AppRoutes />, { route: '/identify', instrument: 'piano' })
    fireEvent.click(screen.getByLabelText('Phím A quãng tám 3'))
    fireEvent.click(screen.getByLabelText('Phím C quãng tám 4'))
    expect(screen.getByText('Chọn ít nhất 3 nốt khác nhau.')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Phím E quãng tám 4'))
    expect(screen.getByText('Am')).toBeInTheDocument()
  })
})

describe('Ôn tập', () => {
  beforeEach(() => localStorage.clear())

  it('một lượt ôn: trả lời, ghi lịch ôn, kết thúc', () => {
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

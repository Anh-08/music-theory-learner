import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from '../../App'
import { renderWithProviders } from '../../test/renderWithProviders'
import { DEFAULT_REFLEX, LEVELS, levelOf, parseCustomLoops, reflexSource } from './reflexModel'

const strip = () =>
  within(screen.getByRole('list', { name: 'Hợp âm đang chơi và các hợp âm tiếp theo' }))
    .getAllByRole('listitem')
    .map((li) => li.querySelector('span')!.textContent)

describe('reflexModel', () => {
  it('mức Dễ / Vừa / Khó được nhận ra từ cài đặt', () => {
    expect(levelOf(DEFAULT_REFLEX)).toBe('easy')
    expect(levelOf({ ...DEFAULT_REFLEX, ...LEVELS.hard })).toBe('hard')
    expect(levelOf({ ...DEFAULT_REFLEX, tempo: 93 })).toBeNull()
  })

  it('số phách: theo phách đã chọn, hoặc một ô nhịp của điệu; hợp âm "C*2" giữ gấp đôi', () => {
    const custom = parseCustomLoops('C*2 G', 'C').loops
    const beats = reflexSource({ ...DEFAULT_REFLEX, source: 'custom', beatsPerChord: 2 }, 1, 4, custom)
    expect([beats(), beats()].map((s) => [s.chord.symbol, s.beats])).toEqual([
      ['C', 4],
      ['G', 2],
    ])
    const rhythm = reflexSource({ ...DEFAULT_REFLEX, source: 'custom', mode: 'rhythm' }, 1, 3, custom)
    expect(rhythm().beats).toBe(6)
  })

  it('vòng tự nhập: số La Mã theo giọng, báo lỗi khi gõ sai', () => {
    expect(parseCustomLoops('I V vi IV\nii V I', 'G').loops.map((l) => l.map((c) => c.symbol).join(' '))).toEqual(['G D Em C', 'Am D G'])
    expect(parseCustomLoops('C Xyz', 'C').error).not.toBeNull()
  })

  it('thế bấm gần nhau: luôn có thế cho mọi hợp âm', () => {
    const next = reflexSource({ ...DEFAULT_REFLEX, ...LEVELS.hard, nearShapes: true, source: 'generate' }, 3, 4)
    for (let i = 0; i < 40; i++) expect(next().shape).toBeDefined()
  })
})

describe('trang luyện phản xạ hợp âm', () => {
  beforeEach(() => localStorage.clear())

  it('hiện hợp âm đầu (chủ âm) và hai hợp âm sắp tới, cùng seed ra cùng chuỗi', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/chords?seed=12345' })
    expect(screen.getByRole('heading', { level: 1, name: 'Luyện phản xạ hợp âm' })).toBeInTheDocument()
    const first = strip()
    expect(first).toHaveLength(3)
    expect(first[0]).toBe('C')
    expect(screen.getByRole('img', { name: /Sơ đồ hợp âm C: x 3 2 0 1 0/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Tự sinh' }))
    expect(strip()[0]).toBe('C')
  })

  it('đổi giọng, ẩn thế bấm, tự nhập vòng hợp âm', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/chords?seed=7' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Giọng' }), { target: { value: 'Am' } })
    expect(strip()[0]).toBe('Am')

    fireEvent.click(screen.getByText('Thêm tùy chọn'))
    fireEvent.click(screen.getByLabelText('Ẩn thế bấm (chỉ còn tên hợp âm)'))
    expect(screen.queryByRole('img', { name: /Sơ đồ hợp âm/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'Tự nhập' }))
    const box = screen.getByRole('textbox', { name: /Các vòng của bạn/ })
    fireEvent.change(box, { target: { value: 'Dm G C' } })
    expect(strip()).toEqual(['Dm', 'G', 'C'])
    fireEvent.change(box, { target: { value: 'Dm Qq' } })
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('chọn mức Khó: 2 phách mỗi hợp âm, ẩn thế bấm; cài đặt được lưu lại', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/chords' })
    fireEvent.click(screen.getByRole('radio', { name: 'Khó' }))
    expect(screen.getByRole('radio', { name: 'Khó' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '2' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('img', { name: /Sơ đồ hợp âm/ })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('mtl:reflex.chords')!).hideShapes).toBe(true)
  })

  it('chế độ một lượt điệu: hiện lưới phách của điệu', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/chords' })
    fireEvent.click(screen.getByRole('radio', { name: 'Một lượt điệu' }))
    expect(screen.getByRole('combobox', { name: 'Điệu' })).toHaveValue('ballad')
    expect(screen.getByText('Mỗi hợp âm chơi đúng một lượt điệu (một ô nhịp) rồi đổi.')).toBeInTheDocument()
  })
})

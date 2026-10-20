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
  it('Easy / Medium / Hard levels are recognised from the settings', () => {
    expect(levelOf(DEFAULT_REFLEX)).toBe('easy')
    expect(levelOf({ ...DEFAULT_REFLEX, ...LEVELS.hard })).toBe('hard')
    expect(levelOf({ ...DEFAULT_REFLEX, tempo: 93 })).toBeNull()
  })

  it('beat count: the chosen beats, or one bar of the rhythm; a "C*2" chord lasts twice as long', () => {
    const custom = parseCustomLoops('C*2 G', 'C').loops
    const beats = reflexSource({ ...DEFAULT_REFLEX, source: 'custom', beatsPerChord: 2 }, 1, 4, custom)
    expect([beats(), beats()].map((s) => [s.chord.symbol, s.beats])).toEqual([
      ['C', 4],
      ['G', 2],
    ])
    const rhythm = reflexSource({ ...DEFAULT_REFLEX, source: 'custom', mode: 'rhythm' }, 1, 3, custom)
    expect(rhythm().beats).toBe(6)
  })

  it('custom loops: Roman numerals follow the key, errors on bad input', () => {
    expect(parseCustomLoops('I V vi IV\nii V I', 'G').loops.map((l) => l.map((c) => c.symbol).join(' '))).toEqual(['G D Em C', 'Am D G'])
    expect(parseCustomLoops('C Xyz', 'C').error).not.toBeNull()
  })

  it('nearby shapes: every chord always gets a shape', () => {
    const next = reflexSource({ ...DEFAULT_REFLEX, ...LEVELS.hard, nearShapes: true, source: 'generate' }, 3, 4)
    for (let i = 0; i < 40; i++) expect(next().shape).toBeDefined()
  })
})

describe('chord reflex page', () => {
  beforeEach(() => localStorage.clear())

  it('shows the first chord (tonic) and the next two; the same seed gives the same stream', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/chords?seed=12345' })
    expect(screen.getByRole('heading', { level: 1, name: 'Luyện phản xạ hợp âm' })).toBeInTheDocument()
    const first = strip()
    expect(first).toHaveLength(3)
    expect(first[0]).toBe('C')
    expect(screen.getByRole('img', { name: /Sơ đồ hợp âm C: x 3 2 0 1 0/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Tự sinh' }))
    expect(strip()[0]).toBe('C')
  })

  it('changes key, hides shapes, enters custom loops', () => {
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

  it('chaos mode: hides the key and key changes, still shows chords with shapes', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/chords?seed=9' })
    fireEvent.click(screen.getByRole('radio', { name: 'Hỗn loạn (mọi giọng)' }))
    expect(screen.queryByRole('combobox', { name: 'Giọng' })).not.toBeInTheDocument()
    expect(screen.getByText(/Hợp âm lấy từ mọi giọng/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '4 hợp âm' })).toBeInTheDocument()
    fireEvent.click(screen.getByText('Thêm tùy chọn'))
    expect(screen.queryByLabelText('Thỉnh thoảng sang giọng gần')).not.toBeInTheDocument()
    expect(strip()).toHaveLength(3)
    expect(screen.getAllByRole('img', { name: /Sơ đồ hợp âm/ }).length).toBeGreaterThan(0)
    expect(JSON.parse(localStorage.getItem('mtl:reflex.chords')!).source).toBe('chaos')
  })

  it('chaos mode: every chord of the stream has a shape, in both playing modes', () => {
    for (const mode of ['beats', 'rhythm'] as const) {
      const next = reflexSource({ ...DEFAULT_REFLEX, ...LEVELS.hard, source: 'chaos', mode, nearShapes: true }, 11, 4)
      for (let i = 0; i < 60; i++) expect(next().shape).toBeDefined()
    }
  })

  it('Hard level: 2 beats per chord, shapes hidden; settings are saved', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/chords' })
    fireEvent.click(screen.getByRole('radio', { name: 'Khó' }))
    expect(screen.getByRole('radio', { name: 'Khó' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '2' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('img', { name: /Sơ đồ hợp âm/ })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('mtl:reflex.chords')!).hideShapes).toBe(true)
  })

  it('one-rhythm-pass mode: shows the rhythm grid', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/chords' })
    fireEvent.click(screen.getByRole('radio', { name: 'Một lượt điệu' }))
    expect(screen.getByRole('combobox', { name: 'Điệu' })).toHaveValue('ballad')
    expect(screen.getByText('Mỗi hợp âm chơi đúng một lượt điệu (một ô nhịp) rồi đổi.')).toBeInTheDocument()
  })
})

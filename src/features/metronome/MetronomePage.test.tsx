import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import { metronomeStore, setMetronomeTempo, startMetronome, stopMetronome, type MetronomeOptions } from '../../audio/metronome'
import { renderWithProviders } from '../../test/renderWithProviders'
import { MetronomePage } from './MetronomePage'

const run = vi.hoisted(() => ({ opts: null as MetronomeOptions | null }))
vi.mock('../../audio/metronome', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../audio/metronome')>()
  return {
    ...actual,
    startMetronome: vi.fn(async (opts: MetronomeOptions) => {
      run.opts = opts
      actual.metronomeStore.set({ running: true, bar: 0, pulse: -1, tempo: opts.tempo, startedAt: Date.now() })
    }),
    stopMetronome: vi.fn(async () => actual.metronomeStore.set({ running: false, pulse: -1 })),
    setMetronomeTempo: vi.fn(async (bpm: number) => actual.metronomeStore.set({ tempo: bpm })),
  }
})

const bigTempo = () => document.querySelector('.text-7xl')!.textContent
const dots = () => screen.getAllByRole('button', { name: /^Phách \d+:/ })

describe('Metronome page', () => {
  beforeEach(() => {
    localStorage.clear()
    run.opts = null
    vi.mocked(startMetronome).mockClear()
    vi.mocked(setMetronomeTempo).mockClear()
    act(() => metronomeStore.set({ running: false, pulse: -1 }))
  })

  it('opens from the Tools menu', () => {
    renderWithProviders(<AppRoutes />, { route: '/' })
    fireEvent.click(screen.getByText(/Công cụ/))
    fireEvent.click(screen.getByRole('link', { name: 'Máy đếm nhịp (Metronome)' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Máy đếm nhịp (Metronome)' })).toBeInTheDocument()
    expect(bigTempo()).toBe('90')
    expect(dots()).toHaveLength(4)
  })

  it('tap tempo sets the BPM from the tap intervals', () => {
    const now = vi.spyOn(performance, 'now')
    renderWithProviders(<MetronomePage />)
    for (const t of [1000, 1500, 2000, 2500]) {
      now.mockReturnValue(t)
      fireEvent.click(screen.getByRole('button', { name: 'Gõ theo nhịp để đặt tempo' }))
    }
    now.mockRestore()
    expect(bigTempo()).toBe('120')
  })

  it('clicking a beat dot cycles its accent, and the bar plan follows', async () => {
    renderWithProviders(<MetronomePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Phách 2: thường. Bấm để đổi.' }))
    expect(screen.getByRole('button', { name: 'Phách 2: im lặng. Bấm để đổi.' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '▶ Bắt đầu' }))
    await act(async () => {})
    const plan = run.opts!.plan(0, 0)
    expect(plan.clicks.map((c) => c.level)).toEqual(['strong', 'silent', 'normal', 'normal'])
    expect(plan).toMatchObject({ pulses: 4, silent: false, tempo: 90 })
    fireEvent.click(screen.getByRole('button', { name: 'Trọng âm mặc định' }))
    expect(run.opts!.plan(1, 0).clicks[1].level).toBe('normal')
  })

  it('remembers the settings', () => {
    const { unmount } = renderWithProviders(<MetronomePage />)
    fireEvent.change(screen.getByLabelText('Số chỉ nhịp (time signature)'), { target: { value: '3/4' } })
    fireEvent.click(screen.getByRole('button', { name: '+5 bpm' }))
    fireEvent.click(screen.getByRole('button', { name: '+1 bpm' }))
    unmount()
    renderWithProviders(<MetronomePage />)
    expect(dots()).toHaveLength(3)
    expect(bigTempo()).toBe('96')
  })

  it('7/8 shows its grouping and compound meters offer counting by eighths', () => {
    renderWithProviders(<MetronomePage />)
    fireEvent.change(screen.getByLabelText('Số chỉ nhịp (time signature)'), { target: { value: '7/8' } })
    fireEvent.click(screen.getByRole('radio', { name: '3+2+2' }))
    expect(dots().map((d) => d.getAttribute('aria-label')!.split(':')[1].split('.')[0].trim())).toEqual(['nhấn mạnh', 'thường', 'thường', 'nhấn vừa', 'thường', 'nhấn vừa', 'thường'])
    fireEvent.change(screen.getByLabelText('Số chỉ nhịp (time signature)'), { target: { value: '6/8' } })
    expect(dots()).toHaveLength(2)
    expect(screen.queryByRole('radio', { name: 'Swing' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Nốt móc đơn' }))
    expect(dots()).toHaveLength(6)
  })

  it('keyboard: Space starts and stops, arrows change the tempo live', async () => {
    renderWithProviders(<MetronomePage />)
    fireEvent.keyDown(document.body, { key: ' ' })
    await act(async () => {})
    expect(startMetronome).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(document.body, { key: 'ArrowUp', shiftKey: true })
    fireEvent.keyDown(document.body, { key: 'ArrowDown' })
    expect(setMetronomeTempo).toHaveBeenLastCalledWith(94)
    expect(bigTempo()).toBe('94')
    fireEvent.keyDown(document.body, { key: ' ' })
    expect(stopMetronome).toHaveBeenCalled()
  })

  it('speed trainer, muted bars and visual-only mode shape the bar plan', async () => {
    localStorage.setItem(
      'mtl:metronome:settings',
      JSON.stringify({ visualOnly: false, trainer: { on: true, start: 60, target: 70, step: 5, every: 2, unit: 'bars' }, gap: { on: true, play: 1, mute: 1 } }),
    )
    renderWithProviders(<MetronomePage />)
    expect(bigTempo()).toBe('60')
    expect(screen.getByRole('button', { name: 'Gõ theo nhịp để đặt tempo' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '▶ Bắt đầu' }))
    await act(async () => {})
    expect(startMetronome).toHaveBeenCalledWith(expect.objectContaining({ tempo: 60 }))
    const plan = run.opts!.plan
    expect([0, 1, 2, 3, 4].map((bar) => plan(bar, 0).tempo)).toEqual([60, 60, 65, 65, 70])
    expect([0, 1, 2].map((bar) => plan(bar, 0).gap)).toEqual([false, true, false])
    fireEvent.click(screen.getByLabelText('Chỉ nháy màn hình, không phát tiếng'))
    expect(plan(0, 0)).toMatchObject({ silent: true, gap: false })
  })
})

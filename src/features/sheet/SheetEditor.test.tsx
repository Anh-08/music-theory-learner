import { act, fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import { playScore } from '../../audio/scorePlayer'
import { handleMidiMessage, liveStore } from '../../input/liveInput'
import { renderWithProviders } from '../../test/renderWithProviders'
import { listSheets, loadSheet } from './sheetStore'

// VexFlow needs real font metrics; the drawing itself is not part of these tests.
vi.mock('../../components/Score/loadVex', () => ({ loadVex: () => new Promise(() => {}) }))
vi.mock('../../audio/scorePlayer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../audio/scorePlayer')>()
  return {
    ...actual,
    playScore: vi.fn(async () => actual.scorePlayerStore.set({ playing: true, current: null })),
    stopScore: vi.fn(async () => actual.scorePlayerStore.set({ playing: false, current: null })),
  }
})

const editor = () => document.querySelector('div[tabindex="-1"]') as HTMLElement

describe('Sheet & tab editor', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(playScore).mockClear()
    act(() => liveStore.set({ source: 'none', status: 'idle', held: [] }))
  })

  it('opens from the Tools menu and creates a score from a template', () => {
    renderWithProviders(<AppRoutes />, { route: '/' })
    fireEvent.click(screen.getByText(/Công cụ/))
    fireEvent.click(screen.getByRole('link', { name: 'Soạn sheet & tab' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Soạn sheet & tab' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Mẫu' }), { target: { value: 'blues' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Tạo bản mới' }))
    expect(screen.getByRole('textbox', { name: 'Tên bản nhạc' })).toHaveValue('Blues 12 ô nhịp giọng A — đệm boogie')
    const [summary] = listSheets()
    expect(summary.bars).toBe(12)
  })

  it('enters notes from the keyboard, saves them and undoes', () => {
    renderWithProviders(<AppRoutes />, { route: '/sheet' })
    fireEvent.click(screen.getByRole('button', { name: '+ Tạo bản mới' }))
    const id = listSheets()[0].id
    fireEvent.keyDown(editor(), { key: '5' })
    fireEvent.keyDown(editor(), { key: 'ArrowRight' })
    fireEvent.keyDown(editor(), { key: '7' })
    fireEvent.keyDown(editor(), { key: 'h' })
    let events = loadSheet(id)!.measures[0].events
    expect(events.map((e) => e.notes[0].midi)).toEqual([55 + 5, 55 + 7]) // string 3: frets 5 and 7
    expect(events[1].notes[0].tech).toEqual(['hammer'])
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác (Ctrl+Z)' }))
    events = loadSheet(id)!.measures[0].events
    expect(events[1].notes[0].tech).toBeUndefined()
  })

  it('applies the selected duration and changes the title', () => {
    renderWithProviders(<AppRoutes />, { route: '/sheet' })
    fireEvent.click(screen.getByRole('button', { name: '+ Tạo bản mới' }))
    const id = listSheets()[0].id
    fireEvent.click(screen.getByRole('button', { name: 'Nốt đen (quarter)' }))
    fireEvent.keyDown(editor(), { key: '0' })
    expect(loadSheet(id)!.measures[0].events[0].duration).toBe('q')
    fireEvent.change(screen.getByRole('textbox', { name: 'Tên bản nhạc' }), { target: { value: 'Lick 1' } })
    expect(loadSheet(id)!.title).toBe('Lick 1')
  })

  it('lists, duplicates and deletes scores', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderWithProviders(<AppRoutes />, { route: '/sheet' })
    fireEvent.click(screen.getByRole('button', { name: '+ Tạo bản mới' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Tên bản nhạc' }), { target: { value: 'Riff' } })
    fireEvent.click(screen.getByRole('link', { name: '← Bản nhạc của tôi' }))
    const item = screen.getByRole('link', { name: 'Riff' }).closest('li')!
    fireEvent.click(within(item).getByRole('button', { name: 'Nhân bản' }))
    expect(screen.getByRole('link', { name: 'Riff (bản sao)' })).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('link', { name: 'Riff' }).closest('li')!).getByRole('button', { name: 'Xóa' }))
    expect(screen.queryByRole('link', { name: 'Riff' })).not.toBeInTheDocument()
    expect(listSheets()).toHaveLength(1)
  })

  it('shows a message for an unknown score', () => {
    renderWithProviders(<AppRoutes />, { route: '/sheet/nope' })
    expect(screen.getByText('Không tìm thấy bản nhạc này trong trình duyệt.')).toBeInTheDocument()
  })

  it('plays from the start or from the cursor with the playback settings', () => {
    renderWithProviders(<AppRoutes />, { route: '/sheet' })
    fireEvent.click(screen.getByRole('button', { name: '+ Tạo bản mới' }))
    fireEvent.keyDown(editor(), { key: '3' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Metronome' }))
    fireEvent.click(screen.getByRole('button', { name: '▶ Phát từ đầu' }))
    expect(playScore).toHaveBeenLastCalledWith(expect.objectContaining({ id: listSheets()[0].id }), expect.objectContaining({ from: undefined, metronome: true, countIn: true, speed: 1 }))
    expect(screen.getByRole('button', { name: '■ Dừng' })).toBeInTheDocument()
    fireEvent.keyDown(editor(), { key: ' ' })
    expect(screen.getByRole('button', { name: '▶ Phát từ đầu' })).toBeInTheDocument()
    fireEvent.keyDown(editor(), { key: ' ' })
    expect(playScore).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ from: { measure: 0, event: 0, string: 3 } }))
  })

  it('enters notes played on a MIDI keyboard, keys pressed together as a chord', () => {
    act(() => liveStore.set({ source: 'midi', status: 'on', devices: ['Piano'] }))
    renderWithProviders(<AppRoutes />, { route: '/sheet' })
    fireEvent.click(screen.getByRole('button', { name: '+ Tạo bản mới' }))
    const id = listSheets()[0].id
    expect(screen.getByRole('checkbox', { name: 'Nhập nốt từ đàn MIDI' })).toBeChecked()
    const now = vi.spyOn(performance, 'now')
    now.mockReturnValue(1000)
    act(() => handleMidiMessage([0x90, 57, 90]))
    now.mockReturnValue(2000)
    act(() => handleMidiMessage([0x90, 60, 90]))
    now.mockReturnValue(2020)
    act(() => handleMidiMessage([0x90, 64, 90]))
    now.mockRestore()
    const events = loadSheet(id)!.measures[0].events
    expect(events[0].notes.map((n) => n.midi)).toEqual([57])
    expect(events).toHaveLength(2)
    expect(new Set(events[1].notes.map((n) => n.midi))).toEqual(new Set([60, 64]))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nhập nốt từ đàn MIDI' }))
    act(() => handleMidiMessage([0x90, 67, 90]))
    expect(loadSheet(id)!.measures[0].events).toHaveLength(2)
  })

  it('links to the connect page when no instrument is connected', () => {
    renderWithProviders(<AppRoutes />, { route: '/sheet' })
    fireEvent.click(screen.getByRole('button', { name: '+ Tạo bản mới' }))
    expect(screen.getByRole('link', { name: 'Kết nối đàn thật để nhập nốt bằng cách chơi →' })).toHaveAttribute('href', expect.stringMatching(/connect$/))
  })

  it('enters notes by clicking the fretboard, Shift-click adding to the chord, with a capo', () => {
    renderWithProviders(<AppRoutes />, { route: '/sheet' })
    fireEvent.click(screen.getByRole('button', { name: '+ Tạo bản mới' }))
    const id = listSheets()[0].id
    fireEvent.click(screen.getByLabelText('Dây 5, phím 3: C'))
    fireEvent.pointerDown(window, { shiftKey: true })
    fireEvent.click(screen.getByLabelText('Dây 4, phím 2: E'))
    fireEvent.pointerDown(window, { shiftKey: false })
    fireEvent.change(screen.getByRole('combobox', { name: 'Capo' }), { target: { value: '2' } })
    fireEvent.click(screen.getByLabelText('Dây 1, phím 1: F')) // below the capo: nothing sounds
    fireEvent.click(screen.getByLabelText('Dây 1, phím 5: A'))
    const s = loadSheet(id)!
    const events = s.measures[0].events
    expect(events).toHaveLength(2)
    expect(events[0].notes.map((n) => n.midi).sort()).toEqual([48, 52])
    expect(events[1].notes).toEqual([{ midi: 69, string: 1 }])
  })
})

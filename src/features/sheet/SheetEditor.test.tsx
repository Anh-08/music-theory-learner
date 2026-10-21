import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import { renderWithProviders } from '../../test/renderWithProviders'
import { listSheets, loadSheet } from './sheetStore'

// VexFlow needs real font metrics; the drawing itself is not part of these tests.
vi.mock('../../components/Score/loadVex', () => ({ loadVex: () => new Promise(() => {}) }))

const editor = () => document.querySelector('div[tabindex="-1"]') as HTMLElement

describe('Sheet & tab editor', () => {
  beforeEach(() => localStorage.clear())

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
})

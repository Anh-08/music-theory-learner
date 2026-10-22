import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import { renderWithProviders } from '../../test/renderWithProviders'
import { newScore } from '../../theory/score'
import { buildTemplate } from './templates'
import { decodeScore, encodeScore, fileBase } from './share'
import { exportAllSheets, importSheets, listSheets, loadSheet, saveSheet } from './sheetStore'

vi.mock('../../components/Score/loadVex', () => ({ loadVex: () => new Promise(() => {}) }))

describe('share links', () => {
  it('round-trips a score through the link code', async () => {
    const score = buildTemplate('blues', 'abc', 'Blues')
    const code = await encodeScore(score)
    expect(code).toMatch(/^[01][\w-]+$/)
    expect(await decodeScore(code, 'new')).toEqual({ ...score, id: 'new' })
  })

  it('compresses when the browser can', async () => {
    const score = buildTemplate('blues', 'abc', 'Blues')
    const code = await encodeScore(score)
    if (typeof CompressionStream !== 'undefined') {
      expect(code[0]).toBe('1')
      expect(code.length).toBeLessThan(JSON.stringify(score).length / 3)
    }
  })

  it('rejects damaged codes', async () => {
    expect(await decodeScore('1abc', 'x')).toBeNull()
    expect(await decodeScore('9xyz', 'x')).toBeNull()
    expect(await decodeScore('', 'x')).toBeNull()
  })

  it('makes file names from titles', () => {
    expect(fileBase('Đệm boogie #1 (Am)')).toBe('dem-boogie-1-am')
    expect(fileBase('')).toBe('score')
  })
})

describe('importing and sharing in the app', () => {
  beforeEach(() => localStorage.clear())

  it('creates a score from a pasted text tab', () => {
    renderWithProviders(<AppRoutes />, { route: '/sheet' })
    fireEvent.click(screen.getByText('Dán tab chữ'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Dán tab chữ' }), {
      target: { value: 'e|---------|\nB|---------|\nG|-----2---|\nD|---2-----|\nA|-3-------|\nE|---------|' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bản nhạc từ tab' }))
    expect(screen.getByRole('textbox', { name: 'Tên bản nhạc' })).toHaveValue('Tab đã nhập')
    const s = loadSheet(listSheets()[0].id)!
    expect(s.measures[0].events.map((e) => e.notes[0].string)).toEqual([5, 4, 3])
  })

  it('says so when the pasted text has no tab', () => {
    renderWithProviders(<AppRoutes />, { route: '/sheet' })
    fireEvent.click(screen.getByText('Dán tab chữ'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Dán tab chữ' }), { target: { value: 'hello' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bản nhạc từ tab' }))
    expect(screen.getByRole('status')).toHaveTextContent('Không tìm thấy tab')
  })

  it('opens a share link read-only and saves a copy', async () => {
    const code = await encodeScore(newScore('orig', { title: 'Shared riff' }))
    renderWithProviders(<AppRoutes />, { route: `/sheet/shared?d=${code}` })
    expect(await screen.findByRole('heading', { name: 'Shared riff' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu vào thư viện của tôi' }))
    expect(screen.getByRole('textbox', { name: 'Tên bản nhạc' })).toHaveValue('Shared riff')
    expect(listSheets()).toHaveLength(1)
    expect(listSheets()[0].id).not.toBe('orig')
  })

  it('shows an error for a broken share link', async () => {
    renderWithProviders(<AppRoutes />, { route: '/sheet/shared?d=1zzzz' })
    expect(await screen.findByText('Link chia sẻ bị hỏng hoặc không đầy đủ.')).toBeInTheDocument()
  })

  it('backs up scores with the progress file', async () => {
    saveSheet(buildTemplate('pentatonic', 'p1', 'Penta'))
    const all = exportAllSheets()
    expect(all.map((s) => s.id)).toEqual(['p1'])
    localStorage.clear()
    expect(importSheets(all)).toBe(1)
    expect(importSheets([{ junk: true }, 'x'])).toBe(0)
    expect(importSheets(undefined)).toBe(0)
    await waitFor(() => expect(loadSheet('p1')!.title).toBe('Penta'))
    act(() => undefined)
  })
})

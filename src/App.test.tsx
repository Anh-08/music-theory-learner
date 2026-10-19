import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ProgressProvider } from './store/ProgressProvider'
import { SettingsProvider } from './store/SettingsProvider'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from './App'
import { LESSONS, lessonMeta } from './lessons/registry'
import { renderWithProviders } from './test/renderWithProviders'

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('home page shows the curriculum and the start button', () => {
    renderWithProviders(<AppRoutes />)
    expect(screen.getByRole('link', { name: 'Music Theory Learner' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(`Bắt đầu học: ${lessonMeta(LESSONS[0], 'vi').title}`) })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Module 0/ })).toBeInTheDocument()
    // Every module in the curriculum has lessons.
    expect(screen.queryByText('Sắp có')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Module 10/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Nhánh guitar/ })).toBeInTheDocument()
  })

  it('marking a lesson done updates the home page', () => {
    renderWithProviders(<AppRoutes />, { route: `/learn/${LESSONS[0].id}` })
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã học xong' }))
    expect(screen.getByRole('button', { name: '✓ Đã hoàn thành' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: '← Lộ trình' }))
    expect(screen.getByText(`Đã học 1/${LESSONS.length} bài`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(`Học tiếp: ${lessonMeta(LESSONS[1], 'vi').title}`) })).toBeInTheDocument()
  })

  it('switching the instrument in the top bar switches the lesson view', async () => {
    renderWithProviders(<AppRoutes />, { route: `/learn/${LESSONS[0].id}` })
    expect((await screen.findAllByRole('group', { name: /Cần đàn guitar/ })).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('radio', { name: 'Piano' }))
    expect(screen.queryByRole('group', { name: /Cần đàn guitar/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('group', { name: /Bàn phím piano/ }).length).toBeGreaterThan(0)
  })

  it('switching language changes both the interface and the lessons, and is remembered', () => {
    const { unmount } = renderWithProviders(<AppRoutes />, { route: `/learn/${LESSONS[0].id}` })
    expect(screen.getByRole('heading', { level: 1, name: lessonMeta(LESSONS[0], 'vi').title })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'EN' }))
    expect(screen.getByRole('heading', { level: 1, name: lessonMeta(LESSONS[0], 'en').title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as complete' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Curriculum' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    unmount()
    render(
      <MemoryRouter>
        <SettingsProvider>
          <ProgressProvider>
            <AppRoutes />
          </ProgressProvider>
        </SettingsProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Learn music theory on your own instrument' })).toBeInTheDocument()
  })

  it('unknown paths show a notice', () => {
    renderWithProviders(<AppRoutes />, { route: '/learn/khong/co' })
    expect(screen.getByText('Không tìm thấy bài học này.')).toBeInTheDocument()
  })
})

import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from './App'
import { LESSONS } from './lessons/registry'
import { renderWithProviders } from './test/renderWithProviders'

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('trang chủ hiển thị lộ trình và nút bắt đầu', () => {
    renderWithProviders(<AppRoutes />)
    expect(screen.getByRole('link', { name: 'Music Theory Learner' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(`Bắt đầu học: ${LESSONS[0].meta.title}`) })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Module 0/ })).toBeInTheDocument()
    expect(screen.getAllByText('Sắp có').length).toBeGreaterThan(0)
  })

  it('đánh dấu bài học xong thì trang chủ cập nhật', () => {
    renderWithProviders(<AppRoutes />, { route: `/learn/${LESSONS[0].id}` })
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã học xong' }))
    expect(screen.getByRole('button', { name: '✓ Đã hoàn thành' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: '← Lộ trình' }))
    expect(screen.getByText(`Đã học 1/${LESSONS.length} bài`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(`Học tiếp: ${LESSONS[1].meta.title}`) })).toBeInTheDocument()
  })

  it('đổi nhạc cụ ở thanh trên thì bài học đổi theo', () => {
    renderWithProviders(<AppRoutes />, { route: `/learn/${LESSONS[0].id}` })
    expect(screen.getAllByRole('group', { name: /Cần đàn guitar/ }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('radio', { name: 'Piano' }))
    expect(screen.queryByRole('group', { name: /Cần đàn guitar/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('group', { name: /Bàn phím piano/ }).length).toBeGreaterThan(0)
  })

  it('đường dẫn lạ hiện thông báo', () => {
    renderWithProviders(<AppRoutes />, { route: '/learn/khong/co' })
    expect(screen.getByText('Không tìm thấy bài học này.')).toBeInTheDocument()
  })
})

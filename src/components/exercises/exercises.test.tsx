import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { FindNotes } from './FindNotes'
import { NoteDrill } from './NoteDrill'
import { Quiz } from './Quiz'

const storedProgress = () => JSON.parse(localStorage.getItem('mtl:progress') ?? '{}')

describe('Quiz', () => {
  beforeEach(() => localStorage.clear())

  it('a wrong pick says try again, the right pick shows the explanation and saves progress', () => {
    renderWithProviders(<Quiz id="q" question="1 + 1?" options={['1', '2']} answer={1} explain="Vì vậy." />)
    fireEvent.click(screen.getByRole('button', { name: '1' }))
    expect(screen.getByRole('status')).toHaveTextContent('thử lại')
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(screen.getByRole('status')).toHaveTextContent('Chính xác! Vì vậy.')
    expect(storedProgress().quizzes.q).toEqual({ correct: true, attempts: 2 })
    expect(screen.getByText('✓ Đã làm đúng')).toBeInTheDocument()
  })
})

describe('FindNotes', () => {
  beforeEach(() => localStorage.clear())

  it('guitar: correct once every note is selected', () => {
    renderWithProviders(<FindNotes id="f" prompt="Find C and E" targets="C E" />, { instrument: 'guitar' })
    fireEvent.click(screen.getByLabelText('Dây 5, phím 3: C'))
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng')
    fireEvent.click(screen.getByLabelText('Dây 4, phím 2: E'))
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    expect(screen.getByRole('status')).toHaveTextContent('Chính xác')
    expect(storedProgress().quizzes.f).toEqual({ correct: true, attempts: 2 })
  })

  it('guitar: ignores notes clicked outside the requested string', () => {
    renderWithProviders(<FindNotes id="f2" prompt="On string 5, play D" targets="D" string={5} />, { instrument: 'guitar' })
    fireEvent.click(screen.getByLabelText('Dây 4, buông: D'))
    expect(screen.getByRole('button', { name: 'Kiểm tra' })).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Dây 5, phím 5: D'))
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    expect(screen.getByRole('status')).toHaveTextContent('Chính xác')
  })

  it('piano: a wrong note is marked wrong', () => {
    renderWithProviders(<FindNotes id="f3" prompt="Play F♯" targets="F#" />, { instrument: 'piano' })
    fireEvent.click(screen.getByLabelText('Phím G quãng tám 3'))
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng')
  })
})

describe('NoteDrill', () => {
  beforeEach(() => localStorage.clear())

  it('asks for a note and grades the answer', () => {
    renderWithProviders(<NoteDrill id="d" naturalsOnly strings="6" maxFret={0} />, { instrument: 'guitar' })
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }))
    // Only one valid position: open string 6 = E.
    expect(screen.getByLabelText('Dây 6, buông: E')).toHaveAttribute('data-highlighted')
    const options = screen.getAllByRole('button').filter((b) => /^[A-G]$/.test(b.textContent ?? ''))
    expect(options).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: 'E' }))
    expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi')
    expect(within(screen.getByText(/Chuỗi đúng/)).getByText('1')).toBeInTheDocument()
    expect(storedProgress().drills.d).toEqual({ best: 1, total: 1 })
  })
})

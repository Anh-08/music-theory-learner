import { act, fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import { disconnectLive, handleMidiMessage, liveStore } from '../../input/liveInput'
import { renderWithProviders } from '../../test/renderWithProviders'
import { chroma, tuning } from '../../theory'
import { FretReflex } from './FretReflex'
import { DEFAULT_FRET_REFLEX, emptyStats, heat, recordAttempt, roundLimitMs, summarize, targetOptions } from './fretReflexModel'

const metronome = vi.hoisted(() => ({ onBeat: null as ((b: number) => void) | null, ownerId: null as string | null }))
vi.mock('../../audio/noteReflex', () => ({
  useNoteMetronome: () => ({ ownerId: metronome.ownerId, countIn: 0 }),
  startNoteMetronome: vi.fn(async (opts: { ownerId: string; onBeat: (b: number) => void }) => {
    metronome.onBeat = opts.onBeat
    metronome.ownerId = opts.ownerId
  }),
  stopNoteMetronome: vi.fn(async () => {}),
}))

const standard = tuning('standard')
const OPEN: Record<number, number> = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 }

/** The note asked, with Unicode accidentals turned back into tonal spelling. */
const targetName = () => screen.getByLabelText('Nốt cần tìm').textContent!.replace('♯', '#').replace('♭', 'b')
const fretFor = (string: number, name: string, from: number) => from + ((chroma(name) - (OPEN[string] % 12) + 12) % 12)
const clickFret = (string: number, fret: number) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Dây ${string}, ${fret === 0 ? 'buông' : `phím ${fret}`}:`) }))
const progress = () => JSON.parse(localStorage.getItem('mtl:progress')!)

describe('fretReflexModel', () => {
  it('one-string mode can rotate through the enabled strings', () => {
    const s = { ...DEFAULT_FRET_REFLEX, string: 6, strings: [5, 6], rotateEvery: 4 as const }
    expect([0, 3, 4, 8].map((r) => targetOptions(s, standard, r).strings)).toEqual([[6], [6], [5], [6]])
  })

  it('exact-pitch mode needs advanced mode; zones only at level 1', () => {
    expect(targetOptions({ ...DEFAULT_FRET_REFLEX, mode: 'pitch' }, standard, 0).mode).toBe('noteString')
    expect(targetOptions({ ...DEFAULT_FRET_REFLEX, level: 2 }, standard, 0).zone).toBeNull()
    expect(targetOptions({ ...DEFAULT_FRET_REFLEX, strings: [1, 2, 3, 4, 5, 6] }, tuning('ukulele'), 0).strings).toEqual([4])
  })

  it('time limits: per note, per beat group, times the positions to find', () => {
    expect(roundLimitMs({ ...DEFAULT_FRET_REFLEX, seconds: 2 }, 3)).toBe(6000)
    expect(roundLimitMs({ ...DEFAULT_FRET_REFLEX, pace: 'metronome', tempo: 60, beatsPerNote: 2 }, 1)).toBe(2000)
  })

  it('heat and summary', () => {
    let st = emptyStats(0)
    st = recordAttempt(st, { string: 3, fret: 9 }, false, 5000)
    st = recordAttempt(st, { string: 3, fret: 9 }, true, 1000)
    st = recordAttempt(st, { string: 6, fret: 3 }, true, 500)
    expect(heat(st.cells['note-pos:3:9'], 5000)).toBeGreaterThan(heat(st.cells['note-pos:6:3'], 5000))
    expect(summarize(st, 30_000)).toEqual({ correct: 2, answered: 3, perMinute: 4, avgMs: 750 })
  })
})

describe('note reflex page', () => {
  beforeEach(() => {
    localStorage.clear()
    act(() => disconnectLive())
  })

  it('is linked from the main navigation', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/notes' })
    expect(screen.getByRole('heading', { level: 1, name: 'Luyện phản xạ nốt trên cần đàn' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Chính' })).getByRole('link', { name: 'Phản xạ nốt' })).toHaveAttribute('href', '/reflex/notes')
  })

  it('level 1, one string: the right fret in the zone is correct and goes into the review schedule', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/notes' })
    fireEvent.click(screen.getByRole('button', { name: '▶ Bắt đầu' }))
    expect(screen.getByRole('img', { name: 'Tìm trên dây 6, phím 0–11' })).toBeInTheDocument()
    expect(screen.getByText('Dây 6 · phím 0–11')).toBeInTheDocument()
    const fret = fretFor(6, targetName(), 0)
    clickFret(6, fret)
    expect(screen.getByText('Đúng rồi!')).toBeInTheDocument()
    expect(progress().srs[`note-pos:6:${fret}`].box).toBe(1)
  })

  it('a wrong position shows where the note is; stopping shows the report and saves records', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/notes' })
    fireEvent.click(screen.getByRole('button', { name: '▶ Bắt đầu' }))
    const fret = fretFor(6, targetName(), 0)
    clickFret(6, (fret + 1) % 12)
    expect(screen.getByText(`Chưa đúng. Nốt này ở dây 6 phím ${fret}.`)).toBeInTheDocument()
    expect(progress().srs[`note-pos:6:${fret}`].box).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: '■ Dừng' }))
    const report = screen.getByRole('region', { name: 'Kết quả lượt luyện' })
    expect(within(report).getByText('0/1')).toBeInTheDocument()
    expect(within(report).getByRole('img', { name: /Bản đồ nhiệt cần đàn/ })).toBeInTheDocument()
    expect(within(report).getByText(new RegExp(`Cần luyện thêm: dây 6 phím ${fret}`))).toBeInTheDocument()
  })

  it('records: correct notes per minute and reaction time are saved per mode', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/notes' })
    fireEvent.click(screen.getByRole('button', { name: '▶ Bắt đầu' }))
    clickFret(6, fretFor(6, targetName(), 0))
    fireEvent.click(screen.getByRole('button', { name: '■ Dừng' }))
    expect(screen.getAllByText('Kỷ lục mới!')).toHaveLength(2)
    expect(progress().records['fret-reflex:string:l1'].perMinute).toBeGreaterThan(0)
  })

  it('find them all: every position from fret 0 to 12 must be found', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/notes' })
    fireEvent.click(screen.getByRole('radio', { name: 'Tìm tất cả' }))
    fireEvent.click(screen.getByRole('button', { name: '▶ Bắt đầu' }))
    const name = targetName()
    const answers = [6, 5, 4, 3, 2, 1].flatMap((s) => {
      const f = fretFor(s, name, 0)
      return f === 0 ? [[s, 0], [s, 12]] : [[s, f]]
    })
    for (const [s, f] of answers.slice(0, -1)) clickFret(s, f)
    expect(screen.getByText(new RegExp(`đã tìm ${answers.length - 1}/${answers.length} vị trí`))).toBeInTheDocument()
    clickFret(answers[answers.length - 1][0], answers[answers.length - 1][1])
    expect(screen.getByText('Đúng rồi!')).toBeInTheDocument()
  })

  it('advanced mode: octave names, no small neck, exact-pitch mode available', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/notes' })
    fireEvent.click(screen.getByLabelText(/Chế độ nâng cao/))
    expect(screen.queryByRole('radiogroup', { name: 'Mức' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Cao độ chính xác' }))
    fireEvent.click(screen.getByRole('button', { name: '▶ Bắt đầu' }))
    expect(screen.getByLabelText('Nốt cần tìm').textContent).toMatch(/^\S+\d \(\S+\d\)$/)
    expect(screen.queryByRole('img', { name: /^Tìm trên dây/ })).not.toBeInTheDocument()
    expect(screen.getByText('Tìm mọi vị trí của đúng cao độ này')).toBeInTheDocument()
  })

  it('answers with a MIDI instrument: the octave must match', () => {
    renderWithProviders(<FretReflex strings="6" zone={1} />)
    act(() => liveStore.set({ source: 'midi', status: 'on' }))
    fireEvent.click(screen.getByRole('button', { name: '▶ Bắt đầu' }))
    const fret = fretFor(6, targetName(), 12)
    act(() => handleMidiMessage([0x90, 40 + fret - 12, 90])) // the same note an octave too low
    expect(screen.getByText(/Chưa đúng/)).toBeInTheDocument()
  })

  it('metronome pace: the note changes every N beats, an unanswered note times out', () => {
    renderWithProviders(<AppRoutes />, { route: '/reflex/notes' })
    fireEvent.click(screen.getByRole('radio', { name: 'Theo metronome' }))
    fireEvent.click(screen.getByRole('radio', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '▶ Bắt đầu' }))
    act(() => metronome.onBeat!(-1))
    expect(screen.queryByLabelText('Nốt cần tìm')).not.toBeInTheDocument()
    act(() => metronome.onBeat!(0))
    expect(screen.getByText('Nốt 1/20')).toBeInTheDocument()
    act(() => metronome.onBeat!(1))
    expect(screen.getByText(/Hết giờ!/)).toBeInTheDocument()
    act(() => metronome.onBeat!(2))
    expect(screen.getByText('Nốt 2/20')).toBeInTheDocument()
  })

  it('in a lesson: the exercise id is shown and settings are tucked away', () => {
    const { container } = renderWithProviders(<FretReflex id="lesson-fret" strings="5" naturalsOnly />)
    expect(container.querySelector('[data-exercise-id="lesson-fret"]')).not.toBeNull()
    expect(screen.getByText('Tùy chọn').closest('details')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '▶ Bắt đầu' }))
    expect(['C', 'D', 'E', 'F', 'G', 'A', 'B']).toContain(targetName())
    clickFret(5, fretFor(5, targetName(), 0))
    expect(progress().drills['lesson-fret'].best).toBe(1)
  })
})

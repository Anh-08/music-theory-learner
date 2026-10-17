import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import type { InstrumentId } from '../audio/instruments'
import { ProgressProvider } from '../store/ProgressProvider'
import { SettingsProvider } from '../store/SettingsProvider'

/** Render kèm router + cài đặt + tiến độ. Nhạc cụ được đặt qua localStorage như khi người dùng chọn. */
export function renderWithProviders(ui: ReactElement, { route = '/', instrument = 'guitar' }: { route?: string; instrument?: InstrumentId } = {}) {
  localStorage.setItem('mtl:instrument', JSON.stringify(instrument))
  return render(
    <MemoryRouter initialEntries={[route]}>
      <SettingsProvider>
        <ProgressProvider>{ui}</ProgressProvider>
      </SettingsProvider>
    </MemoryRouter>,
  )
}

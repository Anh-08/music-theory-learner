import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import type { InstrumentId } from '../audio/instruments'
import type { Locale } from '../i18n/locale'
import { ProgressProvider } from '../store/ProgressProvider'
import { SettingsProvider } from '../store/SettingsProvider'

/** Render kèm router + cài đặt + tiến độ. Nhạc cụ và ngôn ngữ được đặt qua localStorage như khi người dùng chọn. */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', instrument = 'guitar', locale = 'vi' }: { route?: string; instrument?: InstrumentId; locale?: Locale } = {},
) {
  localStorage.setItem('mtl:instrument', JSON.stringify(instrument))
  localStorage.setItem('mtl:locale', JSON.stringify(locale))
  return render(
    <MemoryRouter initialEntries={[route]}>
      <SettingsProvider>
        <ProgressProvider>{ui}</ProgressProvider>
      </SettingsProvider>
    </MemoryRouter>,
  )
}

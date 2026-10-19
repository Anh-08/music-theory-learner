import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import type { InstrumentId } from '../audio/instruments'
import type { Locale } from '../i18n/locale'
import { ProgressProvider } from '../store/ProgressProvider'
import { SettingsProvider } from '../store/SettingsProvider'

/** Renders with router + settings + progress. Instrument and language are set via localStorage, as when the user picks them. */
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

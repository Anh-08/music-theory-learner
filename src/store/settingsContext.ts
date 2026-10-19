import { createContext, useContext } from 'react'
import type { InstrumentId } from '../audio/instruments'
import type { Locale } from '../i18n/locale'

export interface Settings {
  /** The learner's main instrument — lessons display and play sound for this instrument. */
  instrument: InstrumentId
  setInstrument: (i: InstrumentId) => void
  /** Language of the interface and lessons. */
  locale: Locale
  setLocale: (l: Locale) => void
}

export const SettingsContext = createContext<Settings>({ instrument: 'guitar', setInstrument: () => {}, locale: 'vi', setLocale: () => {} })

export function useSettings(): Settings {
  return useContext(SettingsContext)
}

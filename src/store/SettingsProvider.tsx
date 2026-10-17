import { useEffect, useMemo, type ReactNode } from 'react'
import type { InstrumentId } from '../audio/instruments'
import type { Locale } from '../i18n/locale'
import { SettingsContext } from './settingsContext'
import { usePersistentState } from './usePersistentState'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [instrument, setInstrument] = usePersistentState<InstrumentId>('instrument', 'guitar')
  const [locale, setLocale] = usePersistentState<Locale>('locale', 'vi')
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  const value = useMemo(() => ({ instrument, setInstrument, locale, setLocale }), [instrument, setInstrument, locale, setLocale])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

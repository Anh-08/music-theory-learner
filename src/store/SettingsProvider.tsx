import { useMemo, type ReactNode } from 'react'
import type { InstrumentId } from '../audio/instruments'
import { SettingsContext } from './settingsContext'
import { usePersistentState } from './usePersistentState'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [instrument, setInstrument] = usePersistentState<InstrumentId>('instrument', 'guitar')
  const value = useMemo(() => ({ instrument, setInstrument }), [instrument, setInstrument])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

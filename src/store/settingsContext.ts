import { createContext, useContext } from 'react'
import type { InstrumentId } from '../audio/instruments'

export interface Settings {
  /** Nhạc cụ chính của người học — bài học hiển thị và phát âm thanh theo nhạc cụ này. */
  instrument: InstrumentId
  setInstrument: (i: InstrumentId) => void
}

export const SettingsContext = createContext<Settings>({ instrument: 'guitar', setInstrument: () => {} })

export function useSettings(): Settings {
  return useContext(SettingsContext)
}

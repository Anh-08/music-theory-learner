import { createContext, useContext } from 'react'
import type { InstrumentId } from '../audio/instruments'
import type { Locale } from '../i18n/locale'

export interface Settings {
  /** Nhạc cụ chính của người học — bài học hiển thị và phát âm thanh theo nhạc cụ này. */
  instrument: InstrumentId
  setInstrument: (i: InstrumentId) => void
  /** Ngôn ngữ giao diện và bài học. */
  locale: Locale
  setLocale: (l: Locale) => void
}

export const SettingsContext = createContext<Settings>({ instrument: 'guitar', setInstrument: () => {}, locale: 'vi', setLocale: () => {} })

export function useSettings(): Settings {
  return useContext(SettingsContext)
}

import { useCallback } from 'react'
import { useSettings } from '../store/settingsContext'
import type { Locale } from './locale'
import { MESSAGES, format, type MessageKey, type MessageParams } from './messages'

export type Translate = (key: MessageKey, params?: MessageParams) => string

export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  return format(MESSAGES[locale][key], params)
}

/** Translation function for the current language, plus that language. */
export function useT(): { t: Translate; locale: Locale } {
  const { locale } = useSettings()
  const t = useCallback<Translate>((key, params) => translate(locale, key, params), [locale])
  return { t, locale }
}

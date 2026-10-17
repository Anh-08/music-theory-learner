import { useCallback } from 'react'
import { useSettings } from '../store/settingsContext'
import type { Locale } from './locale'
import { MESSAGES, format, type MessageKey, type MessageParams } from './messages'

export type Translate = (key: MessageKey, params?: MessageParams) => string

export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  return format(MESSAGES[locale][key], params)
}

/** Hàm dịch theo ngôn ngữ đang chọn, kèm ngôn ngữ đó. */
export function useT(): { t: Translate; locale: Locale } {
  const { locale } = useSettings()
  const t = useCallback<Translate>((key, params) => translate(locale, key, params), [locale])
  return { t, locale }
}

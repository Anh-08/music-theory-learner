export type Locale = 'vi' | 'en'

export const LOCALES: Locale[] = ['vi', 'en']

/** Một chuỗi có bản dịch cho mọi ngôn ngữ. */
export type Localized = Record<Locale, string>

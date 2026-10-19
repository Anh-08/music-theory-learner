export type Locale = 'vi' | 'en'

export const LOCALES: Locale[] = ['vi', 'en']

/** A string with a translation for every language. */
export type Localized = Record<Locale, string>

/** Default language for a first visit: the first Vietnamese or English entry in the browser's preferred languages, else English. */
export function browserLocale(languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]): Locale {
  for (const lang of languages) {
    const code = lang.toLowerCase().slice(0, 2)
    if (code === 'vi' || code === 'en') return code
  }
  return 'en'
}

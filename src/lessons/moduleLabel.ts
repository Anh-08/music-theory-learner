import type { Locale } from '../i18n/locale'
import type { Translate } from '../i18n/useT'
import type { ModuleInfo } from './modules'

/** "Module 3", or the module's own label (e.g. "Guitar track"). */
export function moduleLabel(m: ModuleInfo, locale: Locale, t: Translate): string {
  return m.badge?.[locale] ?? t('home.module', { n: m.number })
}

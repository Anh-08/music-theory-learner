import { useT } from '../../i18n/useT'
import { FretReflex } from './FretReflex'

export function NoteReflexPage() {
  const { t } = useT()
  return (
    <div className="space-y-4">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{t('noteReflex.title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">{t('noteReflex.intro')}</p>
      </header>
      <FretReflex page />
    </div>
  )
}

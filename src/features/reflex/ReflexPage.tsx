import { useSearchParams } from 'react-router'
import { useT } from '../../i18n/useT'
import { ChordReflex } from './ChordReflex'

export function ReflexPage() {
  const [params] = useSearchParams()
  const { t } = useT()
  const seed = Number(params.get('seed'))
  return (
    <div className="space-y-4">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{t('reflex.title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">{t('reflex.intro')}</p>
      </header>
      <ChordReflex key={params.toString()} page seed={Number.isInteger(seed) && seed > 0 ? seed : undefined} />
    </div>
  )
}

import { useSearchParams } from 'react-router'
import { useT } from '../../i18n/useT'
import { RhythmTrainer } from './RhythmTrainer'

export function RhythmPage() {
  const [params] = useSearchParams()
  const { t } = useT()
  return (
    <div className="space-y-4">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{t('rhythm.title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">{t('rhythm.intro')}</p>
      </header>
      <RhythmTrainer key={params.toString()} editable rhythm={params.get('r') ?? 'ballad'} progression={params.get('p') ?? 'C Am F G'} />
    </div>
  )
}

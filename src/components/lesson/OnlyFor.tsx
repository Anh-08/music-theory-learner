import type { ReactNode } from 'react'
import type { InstrumentId } from '../../audio/instruments'
import { useT } from '../../i18n/useT'
import { useSettings } from '../../store/settingsContext'

/** Nội dung chỉ dành cho người học một nhạc cụ; người học nhạc cụ kia thấy một dòng thông báo thu gọn. */
export function OnlyFor({ instrument, children }: { instrument: InstrumentId; children: ReactNode }) {
  const settings = useSettings()
  const { t } = useT()
  if (settings.instrument === instrument) return <>{children}</>
  return (
    <p className="not-prose my-4 text-xs text-stone-400 italic">
      {t('onlyFor.hidden', { instrument: t(instrument === 'guitar' ? 'common.guitar' : 'common.piano') })}
    </p>
  )
}

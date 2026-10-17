import type { ReactNode } from 'react'
import type { InstrumentId } from '../../audio/instruments'
import { useSettings } from '../../store/settingsContext'

/** Nội dung chỉ dành cho người học một nhạc cụ; người học nhạc cụ kia thấy một dòng thông báo thu gọn. */
export function OnlyFor({ instrument, children }: { instrument: InstrumentId; children: ReactNode }) {
  const settings = useSettings()
  if (settings.instrument === instrument) return <>{children}</>
  return (
    <p className="not-prose my-4 text-xs text-stone-400 italic">
      (Có một phần dành riêng cho {instrument === 'guitar' ? 'guitar' : 'piano'} ở đây — đổi nhạc cụ ở góc trên để xem.)
    </p>
  )
}

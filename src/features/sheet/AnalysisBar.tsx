import { Link } from 'react-router'
import { Select } from '../../components/ui/Select'
import type { MessageKey } from '../../i18n/messages'
import { useT } from '../../i18n/useT'
import { scaleType, scaleTypeName } from '../../theory/scales'
import type { Score } from '../../theory/score'
import { CHECK_SCALES, progressionFromScore, type CheckScale, type EventInfo, type LabelMode, type NoteRole } from '../../theory/scoreAnalysis'
import { ROLE_CLASS, type AnalysisSettings } from './ui'

/** Labels under the notes, the scale check and the link to the Jam Room. */
export function AnalysisBar({ score, info, settings, onSettings }: { score: Score; info: EventInfo[]; settings: AnalysisSettings; onSettings: (s: AnalysisSettings) => void }) {
  const { t, locale } = useT()
  const set = (patch: Partial<AnalysisSettings>) => onSettings({ ...settings, ...patch })
  const outside = info.filter((x) => x.role === 'outside').length
  const progression = progressionFromScore(score)
  const tempo = Math.max(40, Math.min(200, score.tempo))
  const jam = progression ? `/jam?${new URLSearchParams({ p: progression, key: score.keySig, tempo: String(tempo) })}` : null
  const hasChords = info.some((x) => x.chord)

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
      <div className="w-48">
        <Select
          label={t('sheet.labels')}
          value={settings.mode}
          options={(['off', 'chord', 'key'] as LabelMode[]).map((m) => ({ value: m, label: t(`sheet.labels.${m}` as MessageKey) }))}
          onChange={(v) => set({ mode: v as LabelMode })}
        />
      </div>
      <div className="w-48">
        <Select
          label={t('sheet.checkScale')}
          value={settings.scale}
          options={CHECK_SCALES.map((s) => ({ value: s, label: s === 'key' ? t('sheet.scaleKey') : scaleTypeName(scaleType(s), locale) }))}
          onChange={(v) => set({ scale: v as CheckScale })}
        />
      </div>
      <label className="flex items-center gap-1.5 pb-1.5 text-sm">
        <input type="checkbox" checked={settings.colors} onChange={(e) => set({ colors: e.target.checked })} />
        {t('sheet.colors')}
      </label>
      {settings.colors && (
        <p className="pb-1.5 text-xs">
          {(['chord', 'scale', 'outside'] as NoteRole[]).map((r) => (
            <span key={r} className={`mr-3 ${ROLE_CLASS[r]}`}>
              ● {t(`sheet.role.${r}` as MessageKey)}
            </span>
          ))}
          {outside > 0 && <span className="font-medium text-amber-700 dark:text-amber-400">{t('sheet.outsideCount', { n: outside })}</span>}
        </p>
      )}
      {settings.mode === 'chord' && !hasChords && <p className="w-full text-xs text-stone-500">{t('sheet.noChords')}</p>}
      {jam && (
        <Link to={jam} className="ml-auto pb-1.5 text-sm text-rose-600 hover:underline">
          {t('sheet.toJam')}
        </Link>
      )}
    </div>
  )
}

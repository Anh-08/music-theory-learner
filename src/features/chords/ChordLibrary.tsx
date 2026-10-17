import { ChordShapeGrid } from '../../components/ChordDiagram/ChordShapeGrid'
import { Segmented } from '../../components/ui/Segmented'
import { Select } from '../../components/ui/Select'
import { useT } from '../../i18n/useT'
import { usePersistentState } from '../../store/usePersistentState'
import { CHORD_TYPES, CHROMAS, chordTypeName, displayNote, getChord, intervalLabel, rootLabel, toneRules, chroma } from '../../theory'

export function ChordLibrary() {
  const { t, locale } = useT()
  const [rootChroma, setRootChroma] = usePersistentState('chords.root', 0)
  const [typeId, setTypeId] = usePersistentState('chords.type', 'M')
  const [labels, setLabels] = usePersistentState<'fingers' | 'intervals'>('chords.labels', 'fingers')

  const chord = getChord(rootChroma, typeId)
  const name = displayNote(chord.root) + chord.type.suffix
  const optional = toneRules({ root: chord.root, intervals: chord.intervals })
    .filter((r) => !r.required)
    .map((r) => chord.notes.find((n) => chroma(n) === r.chroma)!)

  return (
    <div className="space-y-5">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{t('shapes.title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">{t('shapes.intro')}</p>
      </header>

      <section className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-3 dark:border-stone-800 dark:bg-stone-900">
        <Select label={t('explorer.root')} value={String(rootChroma)} onChange={(v) => setRootChroma(Number(v))} options={CHROMAS.map((c) => ({ value: String(c), label: rootLabel(c) }))} />
        <Select
          label={t('explorer.chordType')}
          value={typeId}
          onChange={setTypeId}
          options={CHORD_TYPES.map((c) => ({ value: c.id, label: `${displayNote(getChord(rootChroma, c.id).root)}${c.suffix} — ${chordTypeName(c, locale)}`, group: t(`chordGroup.${c.group}`) }))}
        />
        <Segmented
          label={t('shapes.labels')}
          value={labels}
          onChange={setLabels}
          options={[
            { value: 'fingers', label: t('shapes.fingers') },
            { value: 'intervals', label: t('labels.interval') },
          ]}
        />
      </section>

      <div>
        <h2 className="text-2xl font-bold">{name}</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {t('shapes.formula', { formula: chord.intervals.map(intervalLabel).join(' – '), notes: chord.notes.map(displayNote).join(' ') })}
        </p>
        {optional.length > 0 && <p className="text-sm text-stone-500">{t('shapes.optional', { notes: optional.map(displayNote).join(', ') })}</p>}
      </div>

      <ChordShapeGrid root={chord.root} intervals={chord.intervals} name={name} symbol={chord.root + typeId} labels={labels} />
    </div>
  )
}

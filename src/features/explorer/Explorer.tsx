import { useMemo } from 'react'
import { arpeggioThenChord, chordEvents, sequenceEvents } from '../../audio/events'
import { PLAY_RANGE, type InstrumentId } from '../../audio/instruments'
import { usePlayer } from '../../audio/usePlayer'
import { Fretboard } from '../../components/Fretboard/Fretboard'
import { Piano } from '../../components/Piano/Piano'
import { Segmented } from '../../components/ui/Segmented'
import { Select } from '../../components/ui/Select'
import { useT } from '../../i18n/useT'
import { useLiveInput } from '../../input/useLiveInput'
import { usePersistentState } from '../../store/usePersistentState'
import {
  CHORD_TYPES,
  chordTypeName,
  CHROMAS,
  SCALE_TYPES,
  scaleTypeName,
  TUNINGS,
  displayNote,
  getChord,
  getScale,
  intervalName,
  makeHighlights,
  rootLabel,
  rootMidiAtOrAbove,
  scaleRun,
  stackIntervals,
  stepLabel,
  stepPattern,
  tuning as getTuning,
  type LabelMode,
} from '../../theory'

type View = 'guitar' | 'piano' | 'both'
type Kind = 'scale' | 'chord'

const FRET_COUNTS = ['12', '15', '17', '22']


export function Explorer() {
  const [view, setView] = usePersistentState<View>('explorer.view', 'guitar')
  const [kind, setKind] = usePersistentState<Kind>('explorer.kind', 'scale')
  const [rootChroma, setRootChroma] = usePersistentState('explorer.root', 0)
  const [scaleId, setScaleId] = usePersistentState('explorer.scale', 'major')
  const [chordId, setChordId] = usePersistentState('explorer.chord', 'M')
  const [labelMode, setLabelMode] = usePersistentState<LabelMode>('explorer.labels', 'note')
  const [tuningId, setTuningId] = usePersistentState('explorer.tuning', 'standard')
  const [fretCount, setFretCount] = usePersistentState('explorer.frets', 15)

  const { t, locale } = useT()
  const instrument: InstrumentId = view === 'piano' ? 'piano' : 'guitar'
  const { playing, activeMidis: playerMidis, play, stop, playNote } = usePlayer(instrument)
  // Nốt đang chơi trên đàn thật cũng sáng lên.
  const live = useLiveInput()
  const activeMidis = useMemo(() => {
    const extra = live.source === 'midi' ? live.held : live.detected ? [live.detected.midi] : []
    return extra.length ? new Set([...playerMidis, ...extra]) : playerMidis
  }, [playerMidis, live.source, live.held, live.detected])

  const scale = useMemo(() => getScale(rootChroma, scaleId), [rootChroma, scaleId])
  const chord = useMemo(() => getChord(rootChroma, chordId), [rootChroma, chordId])
  const info = kind === 'scale' ? scale : chord
  const highlights = useMemo(() => makeHighlights(info.notes, info.labels, labelMode, locale), [info, labelMode, locale])
  const tuning = getTuning(tuningId)

  const title = kind === 'scale' ? `${displayNote(scale.root)} ${scaleTypeName(scale.type, locale)}` : `${displayNote(chord.root)}${chord.type.suffix}`
  // Tiếng Việt: kèm tên tiếng Anh của scale; tiếng Anh: tên đã nằm ở tiêu đề.
  const subtitle =
    kind === 'scale'
      ? locale === 'vi'
        ? scale.type.name
        : ''
      : t('explorer.chordSubtitle', { name: locale === 'vi' ? chord.type.nameVi.toLowerCase() : chord.type.nameEn })

  const handlePlay = () => {
    if (playing) {
      void stop()
      return
    }
    const range = PLAY_RANGE[instrument]
    if (kind === 'scale') {
      const run = scaleRun(rootMidiAtOrAbove(rootChroma, range.scale), info.intervals)
      void play(sequenceEvents([...run, ...run.slice(0, -1).reverse()], 0.28))
    } else {
      const midis = stackIntervals(rootMidiAtOrAbove(rootChroma, range.chord), info.intervals)
      void play(arpeggioThenChord(midis, 0.3, instrument === 'guitar' ? 0.035 : 0))
    }
  }

  const handleChordOnly = () => {
    const range = PLAY_RANGE[instrument]
    const midis = stackIntervals(rootMidiAtOrAbove(rootChroma, range.chord), info.intervals)
    void play(chordEvents(midis, instrument === 'guitar' ? 0.035 : 0))
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-stone-800 dark:bg-stone-900">
        <Segmented
          label={t('explorer.instrument')}
          value={view}
          onChange={setView}
          options={[
            { value: 'guitar', label: t('common.guitar') },
            { value: 'piano', label: t('common.piano') },
            { value: 'both', label: t('common.both') },
          ]}
        />
        <Segmented
          label={t('explorer.view')}
          value={kind}
          onChange={setKind}
          options={[
            { value: 'scale', label: t('explorer.scale') },
            { value: 'chord', label: t('explorer.chord') },
          ]}
        />
        <Select
          label={t('explorer.root')}
          value={String(rootChroma)}
          onChange={(v) => setRootChroma(Number(v))}
          options={CHROMAS.map((c) => ({ value: String(c), label: rootLabel(c) }))}
        />
        {kind === 'scale' ? (
          <Select
            label={t('explorer.scaleType')}
            value={scaleId}
            onChange={setScaleId}
            options={SCALE_TYPES.map((s) => ({ value: s.id, label: locale === 'en' || s.nameVi === s.name ? scaleTypeName(s, locale) : `${s.nameVi} (${s.name})` }))}
          />
        ) : (
          <Select
            label={t('explorer.chordType')}
            value={chordId}
            onChange={setChordId}
            options={CHORD_TYPES.map((c) => ({ value: c.id, label: `${displayNote(getChord(rootChroma, c.id).root)}${c.suffix} — ${chordTypeName(c, locale)}`, group: t(`chordGroup.${c.group}`) }))}
          />
        )}
        <Segmented
          label={t('explorer.labels')}
          value={labelMode}
          onChange={setLabelMode}
          options={[
            { value: 'note', label: t('labels.note') },
            { value: 'interval', label: t('labels.interval') },
            { value: 'solfege', label: t('labels.solfege') },
          ]}
        />
        {view !== 'piano' && (
          <>
            <Select label={t('explorer.tuning')} value={tuningId} onChange={setTuningId} options={TUNINGS.map((tu) => ({ value: tu.id, label: tu.name[locale] }))} />
            <Select
              label={t('explorer.frets')}
              value={String(fretCount)}
              onChange={(v) => setFretCount(Number(v))}
              options={FRET_COUNTS.map((n) => ({ value: n, label: t('explorer.fretsOption', { n }) }))}
            />
          </>
        )}
      </section>

      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>
          {kind === 'scale' && <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-300">{scale.type.description[locale]}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePlay}
            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
          >
            {playing ? t('common.stop') : t('common.play')}
          </button>
          {kind === 'chord' && !playing && (
            <button
              type="button"
              onClick={handleChordOnly}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
            >
              {t('explorer.playChord')}
            </button>
          )}
        </div>
      </section>

      <section aria-label={t('explorer.notesRegion')} className="overflow-x-auto">
        <table className="text-center text-sm">
          <tbody>
            <tr>
              <th scope="row" className="pr-3 text-left text-xs font-medium text-stone-500">{t('explorer.rowNotes')}</th>
              {info.notes.map((n, i) => (
                <td key={n} className="px-1 py-1">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-semibold text-white ${i === 0 ? 'bg-rose-500' : 'bg-sky-600 dark:bg-sky-500'}`}>
                    {displayNote(n)}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="pr-3 text-left text-xs font-medium text-stone-500">{t('explorer.rowIntervals')}</th>
              {info.labels.map((l, i) => (
                <td key={i} className="px-1 font-mono text-stone-700 dark:text-stone-300" title={intervalName(info.intervals[i], locale)}>
                  {l}
                </td>
              ))}
            </tr>
            {kind === 'scale' && (
              <tr>
                <th scope="row" className="pr-3 text-left text-xs font-medium text-stone-500">{t('explorer.rowSteps')}</th>
                {stepPattern(info.intervals).map((s, i) => (
                  <td key={i} className="px-1 text-xs text-stone-500">
                    → {stepLabel(s)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {view !== 'piano' && (
        <section aria-label="Guitar" className="overflow-x-auto rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
          <Fretboard tuning={tuning} fretCount={fretCount} highlights={highlights} activeMidis={activeMidis} onNoteClick={(p) => playNote(p.midi)} />
        </section>
      )}
      {view !== 'guitar' && (
        <section aria-label="Piano" className="overflow-x-auto rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
          <Piano startMidi={48} endMidi={83} highlights={highlights} activeMidis={activeMidis} onKeyClick={playNote} />
        </section>
      )}

      <p className="text-xs text-stone-500">
        {t('explorer.hint')} <span className="text-rose-500">●</span> {t('legend.root')} · <span className="text-sky-600">●</span> {t('legend.others')}.
      </p>
    </div>
  )
}

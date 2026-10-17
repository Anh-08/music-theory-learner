import { useMemo } from 'react'
import { arpeggioThenChord, chordEvents, sequenceEvents } from '../../audio/events'
import { PLAY_RANGE, type InstrumentId } from '../../audio/instruments'
import { usePlayer } from '../../audio/usePlayer'
import { Fretboard } from '../../components/Fretboard/Fretboard'
import { Piano } from '../../components/Piano/Piano'
import { Segmented } from '../../components/ui/Segmented'
import { Select } from '../../components/ui/Select'
import { usePersistentState } from '../../store/usePersistentState'
import {
  CHORD_TYPES,
  CHROMAS,
  SCALE_TYPES,
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

  const instrument: InstrumentId = view === 'piano' ? 'piano' : 'guitar'
  const { playing, activeMidis, play, stop, playNote } = usePlayer(instrument)

  const scale = useMemo(() => getScale(rootChroma, scaleId), [rootChroma, scaleId])
  const chord = useMemo(() => getChord(rootChroma, chordId), [rootChroma, chordId])
  const info = kind === 'scale' ? scale : chord
  const highlights = useMemo(() => makeHighlights(info.notes, info.labels, labelMode), [info, labelMode])
  const tuning = getTuning(tuningId)

  const title = kind === 'scale' ? `${displayNote(scale.root)} ${scale.type.nameVi}` : `${displayNote(chord.root)}${chord.type.suffix}`
  const subtitle = kind === 'scale' ? scale.type.name : `Hợp âm ${chord.type.nameVi.toLowerCase()}`

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
          label="Nhạc cụ"
          value={view}
          onChange={setView}
          options={[
            { value: 'guitar', label: 'Guitar' },
            { value: 'piano', label: 'Piano' },
            { value: 'both', label: 'Cả hai' },
          ]}
        />
        <Segmented
          label="Xem"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'scale', label: 'Scale' },
            { value: 'chord', label: 'Hợp âm' },
          ]}
        />
        <Select
          label="Chủ âm"
          value={String(rootChroma)}
          onChange={(v) => setRootChroma(Number(v))}
          options={CHROMAS.map((c) => ({ value: String(c), label: rootLabel(c) }))}
        />
        {kind === 'scale' ? (
          <Select
            label="Loại scale"
            value={scaleId}
            onChange={setScaleId}
            options={SCALE_TYPES.map((s) => ({ value: s.id, label: s.nameVi === s.name ? s.name : `${s.nameVi} (${s.name})` }))}
          />
        ) : (
          <Select
            label="Loại hợp âm"
            value={chordId}
            onChange={setChordId}
            options={CHORD_TYPES.map((c) => ({ value: c.id, label: `${displayNote(getChord(rootChroma, c.id).root)}${c.suffix} — ${c.nameVi}`, group: c.group }))}
          />
        )}
        <Segmented
          label="Nhãn trên nốt"
          value={labelMode}
          onChange={setLabelMode}
          options={[
            { value: 'note', label: 'Tên nốt' },
            { value: 'interval', label: 'Quãng' },
            { value: 'solfege', label: 'Đô Rê Mi' },
          ]}
        />
        {view !== 'piano' && (
          <>
            <Select label="Tuning" value={tuningId} onChange={setTuningId} options={TUNINGS.map((t) => ({ value: t.id, label: t.name }))} />
            <Select
              label="Số phím"
              value={String(fretCount)}
              onChange={(v) => setFretCount(Number(v))}
              options={FRET_COUNTS.map((n) => ({ value: n, label: `${n} phím` }))}
            />
          </>
        )}
      </section>

      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>
          {kind === 'scale' && <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-300">{scale.type.description}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePlay}
            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
          >
            {playing ? '■ Dừng' : '▶ Nghe'}
          </button>
          {kind === 'chord' && !playing && (
            <button
              type="button"
              onClick={handleChordOnly}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
            >
              Đánh hợp âm
            </button>
          )}
        </div>
      </section>

      <section aria-label="Các nốt" className="overflow-x-auto">
        <table className="text-center text-sm">
          <tbody>
            <tr>
              <th scope="row" className="pr-3 text-left text-xs font-medium text-stone-500">Nốt</th>
              {info.notes.map((n, i) => (
                <td key={n} className="px-1 py-1">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-semibold text-white ${i === 0 ? 'bg-rose-500' : 'bg-sky-600 dark:bg-sky-500'}`}>
                    {displayNote(n)}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="pr-3 text-left text-xs font-medium text-stone-500">Quãng</th>
              {info.labels.map((l, i) => (
                <td key={i} className="px-1 font-mono text-stone-700 dark:text-stone-300" title={intervalName(info.intervals[i])}>
                  {l}
                </td>
              ))}
            </tr>
            {kind === 'scale' && (
              <tr>
                <th scope="row" className="pr-3 text-left text-xs font-medium text-stone-500">Khoảng cách (cung)</th>
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
        Bấm vào nốt bất kỳ trên đàn để nghe. <span className="text-rose-500">●</span> chủ âm · <span className="text-sky-600">●</span> các nốt còn lại.
      </p>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { chordEvents } from '../../audio/events'
import { usePlayer } from '../../audio/usePlayer'
import { InstrumentView } from '../../components/lesson/InstrumentView'
import { useT } from '../../i18n/useT'
import { useLiveInput, useLiveNote } from '../../input/useLiveInput'
import { useSettings } from '../../store/settingsContext'
import { chroma, chromaOfMidi, displayNote, identifyChord, noteFromMidi, positionForMidi, tuning, type FretPosition, type HighlightMap, type StringFret } from '../../theory'

export function ChordIdentifier() {
  const { t } = useT()
  const { instrument } = useSettings()
  const { play, playNote, activeMidis } = usePlayer(instrument)
  // Guitar: mỗi dây tối đa một nốt (như bấm thật). Piano: tập phím bất kỳ.
  const [frets, setFrets] = useState<Map<number, { fret: number; midi: number }>>(new Map())
  const [keys, setKeys] = useState<Set<number>>(new Set())

  // Đàn MIDI: các phím đang giữ thay cho lựa chọn bằng chuột (nhận được cả hợp âm).
  const live = useLiveInput()
  const liveChord = live.source === 'midi' && live.held.length ? live.held : null
  const selectedMidis = useMemo(
    () => (instrument === 'guitar' ? [...frets.values()].map((f) => f.midi) : [...keys]).sort((a, b) => a - b),
    [instrument, frets, keys],
  )
  const midis = liveChord ?? selectedMidis
  const matches = useMemo(() => identifyChord(midis), [midis])
  const distinct = new Set(midis.map(chromaOfMidi)).size

  // Cập nhật dạng hàm để hai lần bấm liên tiếp thật nhanh không làm mất nốt.
  const onPick = (m: number, p?: FretPosition) => {
    playNote(m)
    if (instrument === 'guitar' && p) {
      setFrets((prev) => {
        const next = new Map(prev)
        if (next.get(p.string)?.fret === p.fret) next.delete(p.string)
        else next.set(p.string, { fret: p.fret, midi: m })
        return next
      })
    } else {
      setKeys((prev) => {
        const next = new Set(prev)
        if (next.has(m)) next.delete(m)
        else next.add(m)
        return next
      })
    }
  }

  // Micro chỉ nghe nốt đơn: mỗi nốt nghe được thêm vào lựa chọn.
  useLiveNote((m) => {
    if (instrument === 'guitar') {
      const p = positionForMidi(tuning('standard'), m, 12)
      if (p) setFrets((prev) => new Map(prev).set(p.string, { fret: p.fret, midi: p.midi }))
    } else setKeys((prev) => new Set(prev).add(m))
  }, live.source === 'mic' && live.status === 'on')

  const clear = () => {
    setFrets(new Map())
    setKeys(new Set())
  }

  const best = matches[0]
  const highlights: HighlightMap = new Map()
  for (const m of midis) {
    const c = chromaOfMidi(m)
    highlights.set(c, { label: displayNote(noteFromMidi(m).replace(/\d+$/, '')), isRoot: best ? chroma(best.root) === c : false })
  }
  const only: StringFret[] = [...frets.entries()].map(([string, f]) => ({ string, fret: f.fret }))

  return (
    <div className="space-y-5">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{t('identify.title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">{t('identify.intro')}</p>
      </header>

      <InstrumentView
        highlights={highlights}
        activeMidis={activeMidis}
        only={instrument === 'guitar' && !liveChord ? only : undefined}
        onlyMidis={instrument === 'piano' ? new Set(midis) : undefined}
        fretCount={12}
        pianoRange={[48, 83]}
        onPick={onPick}
      />

      <section aria-live="polite" className="space-y-2 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        {midis.length === 0 ? (
          <p className="text-stone-500">{t('identify.empty')}</p>
        ) : (
          <>
            <p className="text-sm text-stone-500">
              {t('identify.notes')}: <span className="font-medium text-stone-800 dark:text-stone-200">{midis.map((m) => displayNote(noteFromMidi(m).replace(/\d+$/, ''))).join(' – ')}</span>
            </p>
            {distinct < 3 ? (
              <p>{t('identify.needMore')}</p>
            ) : matches.length === 0 ? (
              <p>{t('identify.none')}</p>
            ) : (
              <div>
                <p className="text-sm text-stone-500">{t('identify.result')}</p>
                <p className="text-3xl font-bold">{best.name}</p>
                <p className="text-sm text-stone-500">
                  {t('identify.formula')}: <span className="font-mono">{best.formula}</span>
                </p>
                {matches.length > 1 && <p className="mt-1 text-sm text-stone-500">{matches.slice(1).map((m) => m.name).join(' · ')}</p>}
              </div>
            )}
          </>
        )}
        <div className="flex gap-2 pt-1">
          <button type="button" disabled={!midis.length} onClick={() => void play(chordEvents(midis, instrument === 'guitar' ? 0.035 : 0))} className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50">
            {t('identify.play')}
          </button>
          <button type="button" onClick={clear} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700">
            {t('identify.clear')}
          </button>
        </div>
      </section>
    </div>
  )
}


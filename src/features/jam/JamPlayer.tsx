import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { GROOVES, groove as getGroove } from '../../audio/grooves'
import { startJam, stopJam, updateJam } from '../../audio/jam'
import type { JamTrack } from '../../audio/jamEvents'
import { useJamState } from '../../audio/jamStore'
import { usePlayer } from '../../audio/usePlayer'
import { InstrumentView } from '../../components/lesson/InstrumentView'
import { Segmented } from '../../components/ui/Segmented'
import { Select } from '../../components/ui/Select'
import { useSettings } from '../../store/settingsContext'
import { CHROMAS, keyLabel, spellingsOf } from '../../theory'
import { analyze, chordIndexAtBar, chordLabel, jamHighlights, scaleLabel, type Analysis } from './jamModel'
import { JAM_PRESETS, type JamPreset } from './presets'

export interface JamPlayerProps {
  progression: string
  /** Giọng ("C", "Am"); bỏ trống thì tự đoán. */
  songKey?: string
  groove?: string
  tempo?: number
  /** Scale gợi ý riêng cho bài (id trong SCALE_TYPES); chủ âm lấy từ `scaleRoot` hoặc giọng. */
  scale?: string
  scaleRoot?: string
  /** Trang Jam Room: cho sửa tiến trình, giọng, nhịp. Trong bài học: chỉ phát và chỉnh tempo. */
  editable?: boolean
}

// Giọng trưởng viết theo dấu giáng (D♭, E♭…), giọng thứ theo cách viết thông dụng (C♯m, F♯m…).
const KEY_OPTIONS = [
  { value: 'auto', label: 'Tự đoán', group: 'Tự động' },
  ...CHROMAS.map((c) => spellingsOf(c).at(-1)!).map((t) => ({ value: t, label: keyLabel({ tonic: t, mode: 'major' }), group: 'Giọng trưởng' })),
  ...['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'].map((t) => ({ value: `${t}m`, label: keyLabel({ tonic: t, mode: 'minor' }), group: 'Giọng thứ' })),
]

const TRACKS: { id: JamTrack; label: string }[] = [
  { id: 'drums', label: 'Trống' },
  { id: 'bass', label: 'Bass' },
  { id: 'chords', label: 'Hợp âm' },
]

function tryAnalyze(text: string, keyChoice: string): { analysis: Analysis | null; error: string | null } {
  try {
    return { analysis: analyze(text, keyChoice === 'auto' ? null : keyChoice), error: null }
  } catch (e) {
    return { analysis: null, error: e instanceof Error ? e.message : String(e) }
  }
}

export function JamPlayer({ progression, songKey, groove = 'pop', tempo: initialTempo, scale, scaleRoot, editable = false }: JamPlayerProps) {
  const id = useId()
  const { instrument } = useSettings()
  const jam = useJamState()
  const playing = jam.ownerId === id
  const { playNote, activeMidis } = usePlayer(instrument)

  const [text, setText] = useState(progression)
  const [keyChoice, setKeyChoice] = useState(songKey ?? 'auto')
  const [grooveId, setGrooveId] = useState(groove)
  const [tempo, setTempo] = useState(initialTempo ?? getGroove(groove).defaultTempo)
  const [mutes, setMutes] = useState<Record<JamTrack, boolean>>({ drums: false, bass: false, chords: false })
  const [scaleIndex, setScaleIndex] = useState(0)
  const [showScale, setShowScale] = useState(true)
  const [labels, setLabels] = useState<'note' | 'interval'>('interval')
  const [selected, setSelected] = useState(0)

  const parsed = useMemo(() => tryAnalyze(text, keyChoice), [text, keyChoice])
  // Giữ phân tích hợp lệ gần nhất để vẫn hiển thị khi người dùng đang gõ dở.
  const [lastGood, setLastGood] = useState<Analysis | null>(parsed.analysis)
  if (parsed.analysis && parsed.analysis !== lastGood) setLastGood(parsed.analysis)
  const analysis = parsed.analysis ?? lastGood
  const error = parsed.error

  const scaleOptions = useMemo(() => {
    if (!analysis) return []
    const base = analysis.suggestions
    if (!scale) return base
    const custom = { root: scaleRoot ?? analysis.key.tonic, typeId: scale, why: 'Scale gợi ý cho bài này.' }
    return [custom, ...base.filter((s) => !(s.root === custom.root && s.typeId === custom.typeId))]
  }, [analysis, scale, scaleRoot])
  const currentScale = scaleOptions[Math.min(scaleIndex, scaleOptions.length - 1)] ?? null

  const chords = analysis?.chords ?? []
  const currentIndex = playing ? chordIndexAtBar(chords, jam.bar) : Math.min(selected, chords.length - 1)
  const currentChord = chords[currentIndex]
  const highlights = useMemo(
    () => (currentChord ? jamHighlights(currentChord, showScale ? currentScale : null, labels) : new Map()),
    [currentChord, currentScale, showScale, labels],
  )

  const play = (chordsToPlay: Analysis['chords'], grooveToPlay: string) =>
    void startJam({ ownerId: id, chords: chordsToPlay, groove: getGroove(grooveToPlay), tempo, instrument, mutes })

  const start = () => {
    if (analysis) play(analysis.chords, grooveId)
  }

  // Đổi tiến trình / nhịp khi đang phát: phát lại ngay với cấu hình mới.
  const changeText = (next: string) => {
    setText(next)
    const result = tryAnalyze(next, keyChoice)
    if (playing && result.analysis) play(result.analysis.chords, grooveId)
  }

  useEffect(() => {
    if (playing) void updateJam({ tempo, mutes })
  }, [tempo, mutes, playing])

  // Rời trang / gỡ trình phát khi đang phát thì dừng nhạc.
  useEffect(() => {
    if (!playing) return
    return () => void stopJam(id)
  }, [playing, id])

  const chooseKey = (v: string) => {
    setKeyChoice(v)
    setScaleIndex(0)
  }

  const chooseGroove = (v: string) => {
    setGrooveId(v)
    setTempo(getGroove(v).defaultTempo)
    if (playing && analysis) play(analysis.chords, v)
  }

  const choosePreset = (p: JamPreset) => {
    changeText(p.progression)
    setKeyChoice(p.songKey ?? 'auto')
    setGrooveId(p.groove)
    setTempo(p.tempo ?? getGroove(p.groove).defaultTempo)
    setSelected(0)
    setScaleIndex(0)
  }

  const jamLink = `/jam?${new URLSearchParams({ p: text, ...(keyChoice !== 'auto' && { key: keyChoice }), groove: grooveId, tempo: String(tempo) })}`

  return (
    <div className="not-prose my-6 space-y-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      {editable && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Tiến trình (hợp âm hoặc số La Mã, mỗi hợp âm một ô nhịp; "C*2" = hai ô nhịp)</span>
            <input
              value={text}
              onChange={(e) => changeText(e.target.value)}
              spellCheck={false}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm dark:border-stone-700 dark:bg-stone-950"
              aria-label="Tiến trình hợp âm"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {JAM_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => choosePreset(p)}
                className="rounded-full border border-stone-300 px-2.5 py-1 text-xs hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Giọng" value={keyChoice} onChange={chooseKey} options={KEY_OPTIONS} />
            <Select label="Nhịp điệu" value={grooveId} onChange={chooseGroove} options={GROOVES.map((g) => ({ value: g.id, label: `${g.name} — ${g.description}` }))} />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          {error}
        </p>
      )}

      {analysis && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500">
            <span>
              Giọng: <strong className="text-stone-800 dark:text-stone-200">{keyLabel(analysis.key)}</strong>
              {keyChoice === 'auto' && ' (tự đoán)'}
            </span>
            {!editable && <span>Nhịp: {getGroove(grooveId).name}</span>}
          </div>

          <ol aria-label="Các hợp âm" className="flex flex-wrap gap-2">
            {chords.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-current={i === currentIndex ? 'true' : undefined}
                  className={`min-w-16 rounded-lg border px-3 py-1.5 text-center transition-colors ${
                    i === currentIndex
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60'
                      : 'border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className="block font-semibold">
                    {chordLabel(c)}
                    {c.bars > 1 && <span className="ml-1 text-xs font-normal text-stone-400">×{c.bars}</span>}
                  </span>
                  <span className="block font-mono text-xs text-stone-500">{analysis.romans[i]}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-end gap-4">
            <button
              type="button"
              onClick={() => (playing ? void stopJam(id) : start())}
              className="rounded-lg bg-rose-500 px-5 py-2 text-sm font-medium text-white hover:bg-rose-600"
            >
              {playing ? '■ Dừng' : '▶ Phát nhạc nền'}
            </button>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Tempo: {tempo} bpm</span>
              <input type="range" min={40} max={200} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} aria-label="Tempo" className="w-40 accent-rose-500" />
            </label>
            <div role="group" aria-label="Bật / tắt phần nhạc" className="flex gap-1">
              {TRACKS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={!mutes[t.id]}
                  onClick={() => setMutes((m) => ({ ...m, [t.id]: !m[t.id] }))}
                  className={`rounded-md border px-2.5 py-1 text-xs ${mutes[t.id] ? 'border-stone-300 text-stone-400 line-through dark:border-stone-700' : 'border-stone-400 bg-stone-100 dark:border-stone-600 dark:bg-stone-800'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
            <Select
              label="Scale để improvise"
              value={String(Math.min(scaleIndex, scaleOptions.length - 1))}
              onChange={(v) => setScaleIndex(Number(v))}
              options={scaleOptions.map((s, i) => ({ value: String(i), label: `${scaleLabel(s)} — ${s.why}` }))}
            />
            <Segmented
              label="Nhãn"
              value={labels}
              onChange={setLabels}
              options={[
                { value: 'interval', label: 'Quãng' },
                { value: 'note', label: 'Tên nốt' },
              ]}
            />
            <label className="flex items-center gap-2 pb-1.5 text-sm">
              <input type="checkbox" checked={showScale} onChange={(e) => setShowScale(e.target.checked)} className="accent-rose-500" />
              Hiện nốt scale
            </label>
          </div>

          <InstrumentView highlights={highlights} activeMidis={activeMidis} fretCount={15} pianoRange={[48, 83]} onPick={(m) => playNote(m)} />

          <p className="text-xs text-stone-500">
            <span className="text-rose-500">●</span> nốt gốc của hợp âm đang vang · <span className="text-sky-600">●</span> các nốt khác của hợp âm (chord tones — nốt "an toàn" nhất) · <span className="text-stone-400">●</span> nốt khác trong scale{' '}
            {labels === 'interval' && currentChord && `· nhãn là quãng tính từ ${chordLabel(currentChord).replace(/\/.*/, '')}`}
          </p>

          {!editable && (
            <Link to={jamLink} className="inline-block text-sm text-rose-600 hover:underline">
              Mở trong Jam Room để sửa tiến trình →
            </Link>
          )}
        </>
      )}
    </div>
  )
}

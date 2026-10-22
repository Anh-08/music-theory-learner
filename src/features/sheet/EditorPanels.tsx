import { useState, type ReactNode } from 'react'
import { Segmented } from '../../components/ui/Segmented'
import { Select } from '../../components/ui/Select'
import type { MessageKey } from '../../i18n/messages'
import { useT } from '../../i18n/useT'
import { TUNINGS } from '../../theory/fretboard'
import { chordShapes } from '../../theory/guitarShapes'
import { TheoryError, parseProgression } from '../../theory/progression'
import { DURATIONS, midiAt, scoreKey, type Duration, type Score, type ScoreNote, type Technique } from '../../theory/score'
import { getEvent } from '../../theory/scoreEdit'
import type { ScoreViewMode } from '../../theory/scoreLayout'
import type { EditorAction, EditorState } from './editorState'
import { keyName } from './ui'

const label = 'mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400'
const tool = (on = false) =>
  `min-w-9 rounded-md border px-2 py-1 text-sm transition-colors disabled:opacity-40 ${
    on
      ? 'border-sky-500 bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100'
      : 'border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'
  }`

const DURATION_LABEL: Record<Duration, string> = { w: '1', h: '½', q: '¼', '8': '⅛', '16': '1/16', '32': '1/32' }

const TIME_SIGS = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8']
const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <span className={label}>{title}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

/** Title, tempo, time signature, key, tuning, capo and the view switch. */
export function MetaBar({ score, view, onView, dispatch }: { score: Score; view: ScoreViewMode; onView: (v: ScoreViewMode) => void; dispatch: (a: EditorAction) => void }) {
  const { t, locale } = useT()
  const [tempo, setTempo] = useState(String(score.tempo))
  const [shownTempo, setShownTempo] = useState(score.tempo)
  if (shownTempo !== score.tempo) {
    setShownTempo(score.tempo)
    setTempo(String(score.tempo))
  }
  const commitTempo = () => {
    const n = Number(tempo)
    if (Number.isFinite(n) && n > 0) dispatch({ type: 'meta', patch: { tempo: n } })
    else setTempo(String(score.tempo))
  }
  const keys = KEYS.includes(score.keySig) ? KEYS : [score.keySig, ...KEYS]

  return (
    <div className="space-y-3">
      <input
        value={score.title}
        onChange={(e) => dispatch({ type: 'meta', patch: { title: e.target.value } })}
        placeholder={t('sheet.titlePlaceholder')}
        aria-label={t('sheet.titlePlaceholder')}
        className="w-full rounded-lg border border-transparent bg-transparent px-1 text-2xl font-bold hover:border-stone-300 focus:border-stone-400 focus:outline-none dark:hover:border-stone-700"
      />
      <p className="hidden text-sm print:block">
        {[TUNINGS.find((x) => x.id === score.tuning)?.name[locale], score.capo ? `Capo ${score.capo}` : '', score.timeSig.join('/'), `${score.tempo} BPM`].filter(Boolean).join(' · ')}
      </p>
      <div className="grid grid-cols-2 gap-3 print:hidden sm:grid-cols-3 lg:grid-cols-6">
        <label className="block">
          <span className={label}>{t('sheet.tempo')}</span>
          <input
            type="number"
            min={20}
            max={300}
            value={tempo}
            onChange={(e) => setTempo(e.target.value)}
            onBlur={commitTempo}
            onKeyDown={(e) => e.key === 'Enter' && commitTempo()}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
          />
        </label>
        <Select
          label={t('sheet.timeSig')}
          value={score.timeSig.join('/')}
          options={(TIME_SIGS.includes(score.timeSig.join('/')) ? TIME_SIGS : [score.timeSig.join('/'), ...TIME_SIGS]).map((v) => ({ value: v, label: v }))}
          onChange={(v) => dispatch({ type: 'meta', patch: { timeSig: v.split('/').map(Number) as [number, number] } })}
        />
        <Select label={t('sheet.key')} value={score.keySig} options={keys.map((k) => ({ value: k, label: keyName(k) }))} onChange={(v) => dispatch({ type: 'meta', patch: { keySig: v } })} />
        <Select
          label={t('sheet.tuning')}
          value={score.tuning}
          options={TUNINGS.map((x) => ({ value: x.id, label: x.name[locale] }))}
          onChange={(v) => dispatch({ type: 'meta', patch: { tuning: v } })}
        />
        <Select
          label={t('sheet.capo')}
          value={String(score.capo)}
          options={Array.from({ length: 13 }, (_, i) => ({ value: String(i), label: i === 0 ? t('sheet.capoNone') : String(i) }))}
          onChange={(v) => dispatch({ type: 'meta', patch: { capo: Number(v) } })}
        />
        <div className="col-span-2 sm:col-span-1">
          <Segmented
            label={t('sheet.view')}
            value={view}
            options={(['both', 'tab', 'staff'] as const).map((v) => ({ value: v, label: t(`sheet.view.${v}`) }))}
            onChange={onView}
          />
        </div>
      </div>
    </div>
  )
}

/** Duration, techniques, bars, chords, transpose, undo. */
export function Toolbar({ state, dispatch, chordMode, onChordMode }: { state: EditorState; dispatch: (a: EditorAction) => void; chordMode: boolean; onChordMode: (on: boolean) => void }) {
  const { t } = useT()
  const score = state.history.present
  const event = getEvent(score, state.cursor)
  const note = event?.notes.find((n) => n.string === state.cursor.string)
  const has = (tech: Technique) => !!note?.tech?.includes(tech)
  const m = score.measures[state.cursor.measure]
  const [chord, setChord] = useState('')
  const [chordError, setChordError] = useState('')

  const shape = () => {
    setChordError('')
    const text = chord.trim()
    if (!text) return
    if (score.tuning !== 'standard') return setChordError(t('sheet.shapeStandardOnly'))
    try {
      const c = parseProgression(text, scoreKey(score))[0]
      const s = chordShapes(c, 1)[0]
      if (!s) return setChordError(t('sheet.chordBad', { symbol: text }))
      const notes: ScoreNote[] = s.frets.flatMap((f, i) => (f === null ? [] : [{ string: 6 - i, midi: midiAt(score, 6 - i, f) }]))
      dispatch({ type: 'insertShape', symbol: c.symbol, notes })
    } catch (err) {
      if (err instanceof TheoryError) setChordError(t('sheet.chordBad', { symbol: text }))
      else throw err
    }
  }

  const writeSymbol = () => {
    setChordError('')
    const text = chord.trim()
    if (!text) return
    try {
      dispatch({ type: 'chord', symbol: parseProgression(text, scoreKey(score))[0].symbol })
    } catch {
      setChordError(t('sheet.chordBad', { symbol: text }))
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
      <Group title={t('sheet.duration')}>
        {DURATIONS.map((d) => (
          <button key={d} type="button" className={tool(state.value.duration === d)} title={t(`sheet.dur.${d}` as MessageKey)} aria-label={t(`sheet.dur.${d}` as MessageKey)} aria-pressed={state.value.duration === d} onClick={() => dispatch({ type: 'duration', duration: d })}>
            {DURATION_LABEL[d]}
          </button>
        ))}
        <button type="button" className={tool(state.value.dots > 0)} title={t('sheet.dot')} aria-label={t('sheet.dot')} aria-pressed={state.value.dots > 0} onClick={() => dispatch({ type: 'dot' })}>
          •
        </button>
        <button type="button" className={tool(!!state.value.tuplet)} title={t('sheet.triplet')} aria-label={t('sheet.triplet')} aria-pressed={!!state.value.tuplet} onClick={() => dispatch({ type: 'triplet' })}>
          3
        </button>
        <button type="button" className={tool(!!event?.rest)} title={t('sheet.rest')} aria-label={t('sheet.rest')} onClick={() => dispatch({ type: 'rest' })}>
          𝄽
        </button>
        <button type="button" className={tool(!!event?.tieToNext)} title={t('sheet.tie')} aria-label={t('sheet.tie')} onClick={() => dispatch({ type: 'tie' })}>
          ⁀
        </button>
      </Group>

      <Group title={t('sheet.techniques')}>
        {(
          [
            ['hammer', 'H'],
            ['pull', 'P'],
            ['slide', '/'],
            ['bendHalf', '↑½'],
            ['bendFull', '↑1'],
            ['vibrato', '~'],
            ['palmMute', 'PM'],
            ['dead', 'X'],
            ['letRing', 'LR'],
            ['harmonic', '◇'],
          ] as [Technique, string][]
        ).map(([tech, text]) => (
          <button key={tech} type="button" className={tool(has(tech))} disabled={!note} title={t(`sheet.tech.${tech}` as MessageKey)} aria-label={t(`sheet.tech.${tech}` as MessageKey)} aria-pressed={has(tech)} onClick={() => dispatch({ type: 'tech', tech })}>
            {text}
          </button>
        ))}
      </Group>

      <Group title={t('sheet.bars')}>
        <button type="button" className={tool()} onClick={() => dispatch({ type: 'barInsert', after: false })}>
          {t('sheet.barBefore')}
        </button>
        <button type="button" className={tool()} onClick={() => dispatch({ type: 'barInsert', after: true })}>
          {t('sheet.barAfter')}
        </button>
        <button type="button" className={tool()} onClick={() => dispatch({ type: 'barDuplicate' })}>
          {t('sheet.barDuplicate')}
        </button>
        <button type="button" className={tool()} onClick={() => dispatch({ type: 'barDelete' })}>
          {t('sheet.barDelete')}
        </button>
        <button type="button" className={tool()} onClick={() => dispatch({ type: 'copy' })}>
          {t('sheet.copy')}
        </button>
        <button type="button" className={tool()} disabled={!state.clipboard} onClick={() => dispatch({ type: 'paste' })}>
          {t('sheet.paste')}
        </button>
        <button type="button" className={tool(!!m?.repeatStart)} aria-pressed={!!m?.repeatStart} onClick={() => dispatch({ type: 'repeatStart' })}>
          {t('sheet.repeatStart')}
        </button>
        <button type="button" className={tool(!!m?.repeatEnd)} aria-pressed={!!m?.repeatEnd} onClick={() => dispatch({ type: 'repeatEnd' })}>
          {t('sheet.repeatEnd')}
        </button>
        <select
          aria-label={t('sheet.endingNone')}
          value={m?.ending?.[0] ?? 0}
          onChange={(e) => dispatch({ type: 'ending', pass: Number(e.target.value) || null })}
          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900"
        >
          <option value={0}>{t('sheet.endingNone')}</option>
          {[1, 2, 3].map((n) => (
            <option key={n} value={n}>
              {t('sheet.ending', { n })}
            </option>
          ))}
        </select>
      </Group>

      <Group title={t('sheet.chord')}>
        <input
          value={chord}
          onChange={(e) => setChord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && writeSymbol()}
          placeholder={t('sheet.chordPlaceholder')}
          aria-label={t('sheet.chord')}
          className="w-24 rounded-md border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900"
        />
        <button type="button" className={tool()} onClick={writeSymbol}>
          {t('sheet.chordSet')}
        </button>
        <button type="button" className={tool()} onClick={shape}>
          {t('sheet.chordShape')}
        </button>
        <button type="button" className={tool()} onClick={() => dispatch({ type: 'chord', symbol: null })}>
          {t('sheet.chordClear')}
        </button>
        {chordError && <span className="w-full text-xs text-red-600 dark:text-red-400">{chordError}</span>}
      </Group>

      <Group title={t('sheet.transpose')}>
        {[-12, -1, 1, 12].map((n) => (
          <button key={n} type="button" className={tool()} title={t('sheet.transposeHint')} onClick={() => dispatch({ type: 'transpose', semitones: n })}>
            {n === 12 ? '8va' : n === -12 ? '8vb' : n > 0 ? '+½' : '−½'}
          </button>
        ))}
      </Group>

      <Group title={"\u00a0"}>
        <button type="button" className={tool()} disabled={!state.history.past.length} title={t('sheet.undo')} aria-label={t('sheet.undo')} onClick={() => dispatch({ type: 'undo' })}>
          ↶
        </button>
        <button type="button" className={tool()} disabled={!state.history.future.length} title={t('sheet.redo')} aria-label={t('sheet.redo')} onClick={() => dispatch({ type: 'redo' })}>
          ↷
        </button>
        <button type="button" className={tool(chordMode)} aria-pressed={chordMode} title={t('sheet.addToChordHint')} onClick={() => onChordMode(!chordMode)}>
          {t('sheet.addToChord')}
        </button>
      </Group>
    </div>
  )
}


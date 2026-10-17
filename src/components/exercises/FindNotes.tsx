import { useMemo, useState } from 'react'
import { usePlayer } from '../../audio/usePlayer'
import { useProgress } from '../../store/progressContext'
import { useSettings } from '../../store/settingsContext'
import { chroma, displayNote, fretboardPositions, rootLabel, tuning, type FretPosition, type HighlightMap, type StringFret } from '../../theory'
import { InstrumentView } from '../lesson/InstrumentView'
import { ExerciseCard, Feedback } from './ExerciseCard'
import { buttonClass } from './styles'

interface FindNotesProps {
  id: string
  prompt: string
  /** Các nốt cần tìm, cách nhau bởi khoảng trắng: "D F A". */
  targets: string
  /** Guitar: chỉ được chọn trên dây này. */
  string?: number
  frets?: number
}

type Selection = { midi: number; position?: StringFret }

/**
 * Bài tập "bấm trên đàn": người học chọn các nốt trên đàn ảo rồi bấm Kiểm tra.
 * Chấm theo tên nốt (bấm ở quãng tám nào cũng được).
 */
export function FindNotes({ id, prompt, targets, string, frets = 12 }: FindNotesProps) {
  const { progress, recordQuiz } = useProgress()
  const { instrument } = useSettings()
  const { playNote, activeMidis } = usePlayer(instrument)
  const targetNotes = useMemo(() => targets.trim().split(/\s+/), [targets])
  const targetChromas = useMemo(() => new Set(targetNotes.map(chroma)), [targetNotes])

  const [selected, setSelected] = useState<Selection[]>([])
  const [result, setResult] = useState<'correct' | 'wrong' | 'revealed' | null>(null)

  const sameSelection = (a: Selection, b: Selection) =>
    instrument === 'guitar' ? a.position?.string === b.position?.string && a.position?.fret === b.position?.fret : a.midi === b.midi

  const onPick = (m: number, p?: FretPosition) => {
    if (instrument === 'guitar' && string !== undefined && p?.string !== string) return
    playNote(m)
    const item: Selection = { midi: m, position: p && { string: p.string, fret: p.fret } }
    setResult(null)
    setSelected((sel) => (sel.some((s) => sameSelection(s, item)) ? sel.filter((s) => !sameSelection(s, item)) : [...sel, item]))
  }

  const check = () => {
    const chosen = new Set(selected.map((s) => s.midi % 12))
    const correct = chosen.size === targetChromas.size && [...chosen].every((c) => targetChromas.has(c))
    recordQuiz(id, correct)
    setResult(correct ? 'correct' : 'wrong')
  }

  const clear = () => {
    setSelected([])
    setResult(null)
  }

  const reveal = () => {
    const all = fretboardPositions(tuning('standard'), frets).filter((p) => targetChromas.has(p.chroma) && (string === undefined || p.string === string))
    setSelected(all.map((p) => ({ midi: p.midi, position: { string: p.string, fret: p.fret } })))
    setResult('revealed')
  }

  const highlights: HighlightMap = new Map()
  for (const s of selected) {
    const c = s.midi % 12
    const target = targetNotes.find((n) => chroma(n) === c)
    const checked = result !== null
    highlights.set(c, {
      label: checked ? (target ? displayNote(target) : rootLabel(c).split(' / ')[0]) : '•',
      isRoot: false,
      color: !checked ? undefined : targetChromas.has(c) ? 'correct' : 'wrong',
    })
  }

  return (
    <ExerciseCard id={id} kind="Bấm trên đàn" done={progress.quizzes[id]?.correct}>
      <p className="mb-3 font-medium">{prompt}</p>
      <InstrumentView
        highlights={highlights}
        activeMidis={activeMidis}
        only={instrument === 'guitar' ? selected.flatMap((s) => (s.position ? [s.position] : [])) : undefined}
        onlyMidis={instrument === 'piano' ? new Set(selected.map((s) => s.midi)) : undefined}
        fretCount={frets}
        onPick={onPick}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={check} disabled={selected.length === 0} className={buttonClass.primary}>
          Kiểm tra
        </button>
        <button type="button" onClick={clear} className={buttonClass.secondary}>
          Xóa chọn
        </button>
        <button type="button" onClick={reveal} className={buttonClass.secondary}>
          Xem đáp án
        </button>
      </div>
      {result === 'correct' && <Feedback correct>Chính xác!</Feedback>}
      {result === 'wrong' && <Feedback correct={false}>Chưa đúng — nốt màu cam không thuộc đáp án, hoặc còn thiếu nốt. Bấm lại vào nốt để bỏ chọn.</Feedback>}
      {result === 'revealed' && <Feedback correct>Đáp án: {targetNotes.map(displayNote).join(', ')}.</Feedback>}
    </ExerciseCard>
  )
}

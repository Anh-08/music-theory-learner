import { Link } from 'react-router'
import { ChordShapeGrid } from '../ChordDiagram/ChordShapeGrid'
import { useT } from '../../i18n/useT'
import { chordFromRoot, chordType, displayNote } from '../../theory'

interface ChordShapesProps {
  root: string
  /** Chord type id (CHORD_TYPES), major by default. */
  type?: string
  max?: number
  labels?: 'fingers' | 'intervals'
}

/** In a lesson: every shape of a chord (diagram + listen button). */
export function ChordShapes({ root, type = 'M', max = 4, labels = 'fingers' }: ChordShapesProps) {
  const { t } = useT()
  const info = chordFromRoot(root, type)
  const name = displayNote(root) + chordType(type).suffix
  return (
    <div className="not-prose my-6 space-y-2">
      <ChordShapeGrid root={root} intervals={info.intervals} name={name} symbol={root + type} labels={labels} max={max} />
      <Link to="/chords" className="inline-block text-sm text-rose-600 hover:underline">
        {t('shapes.all')}
      </Link>
    </div>
  )
}

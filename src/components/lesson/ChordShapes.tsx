import { Link } from 'react-router'
import { ChordShapeGrid } from '../ChordDiagram/ChordShapeGrid'
import { useT } from '../../i18n/useT'
import { chordFromRoot, chordType, displayNote } from '../../theory'

interface ChordShapesProps {
  root: string
  /** Id loại hợp âm (CHORD_TYPES), mặc định trưởng. */
  type?: string
  max?: number
  labels?: 'fingers' | 'intervals'
}

/** Trong bài học: các thế bấm của một hợp âm (sơ đồ + nút nghe). */
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

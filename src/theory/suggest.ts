import { isBluesLike, type KeyRef, type ProgressionChord } from './progression'
import { chroma } from './notes'

export type SuggestionReason =
  | 'bluesMinorPent'
  | 'bluesScale'
  | 'bluesMajorPent'
  | 'bluesMixolydian'
  | 'majorPent'
  | 'major'
  | 'relMinorPent'
  | 'minorPent'
  | 'aeolian'
  | 'minorBlues'
  | 'harmonicMinor'

export interface ScaleSuggestion {
  root: string
  /** Id trong SCALE_TYPES. */
  typeId: string
  /** Lý do gợi ý — giao diện dịch qua khóa "suggest.<reason>". */
  reason: SuggestionReason
  params?: Record<string, string>
}

/** Gợi ý scale để improvise trên cả tiến trình, theo thứ tự nên thử. */
export function suggestScales(chords: ProgressionChord[], key: KeyRef): ScaleSuggestion[] {
  if (isBluesLike(chords)) {
    return [
      { root: key.tonic, typeId: 'minor pentatonic', reason: 'bluesMinorPent' },
      { root: key.tonic, typeId: 'blues', reason: 'bluesScale' },
      { root: key.tonic, typeId: 'major pentatonic', reason: 'bluesMajorPent' },
      { root: key.tonic, typeId: 'mixolydian', reason: 'bluesMixolydian' },
    ]
  }
  if (key.mode === 'major') {
    const relMinor = chordsRelativeMinorRoot(key)
    return [
      { root: key.tonic, typeId: 'major pentatonic', reason: 'majorPent' },
      { root: key.tonic, typeId: 'major', reason: 'major' },
      { root: relMinor, typeId: 'minor pentatonic', reason: 'relMinorPent', params: { key: key.tonic } },
    ]
  }
  const hasMajorFive = chords.some((c) => chroma(c.root) === (chroma(key.tonic) + 7) % 12 && c.intervals.includes('3M'))
  return [
    { root: key.tonic, typeId: 'minor pentatonic', reason: 'minorPent' },
    { root: key.tonic, typeId: 'aeolian', reason: 'aeolian' },
    { root: key.tonic, typeId: 'blues', reason: 'minorBlues' },
    ...(hasMajorFive ? [{ root: key.tonic, typeId: 'harmonic minor', reason: 'harmonicMinor' as const }] : []),
  ]
}

function chordsRelativeMinorRoot(key: KeyRef): string {
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
  return names[(chroma(key.tonic) + 9) % 12]
}

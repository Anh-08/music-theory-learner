import type { Translate } from '../../i18n/useT'
import { chroma, intervalLabel, semitones, shapeMidis, type ChordShape } from '../../theory'

/** Nhãn quãng cho từng dây của thế bấm (dây 6 → 1) và dây nào là nốt gốc. */
export function shapeIntervalLabels(shape: ChordShape, root: string, intervals: string[]): { labels: (string | null)[]; roots: boolean[] } {
  const r = chroma(root)
  const byChroma = new Map<number, string>()
  for (const i of intervals) byChroma.set((r + semitones(i)) % 12, intervalLabel(i))
  const midis = shapeMidis(shape)
  return {
    labels: midis.map((m) => (m === null ? null : (byChroma.get(m % 12) ?? null))),
    roots: midis.map((m) => m !== null && m % 12 === r),
  }
}

/** "Thế mở · bass dây 5" / "Phím 8 · bass dây 6". */
export function shapeCaption(shape: ChordShape, t: Translate): string {
  return `${shape.position === 0 ? t('shapes.open') : t('shapes.fret', { n: shape.position })} · ${t('shapes.bass', { n: shape.bassString })}`
}

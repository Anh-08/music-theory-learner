import type { Localized } from '../../i18n/locale'

export interface JamPreset {
  name: Localized
  progression: string
  songKey?: string
  groove: string
  tempo?: number
}

export const JAM_PRESETS: JamPreset[] = [
  { name: { vi: 'I – V – vi – IV', en: 'I – V – vi – IV' }, progression: 'C G Am F', songKey: 'C', groove: 'pop' },
  { name: { vi: 'vi – IV – I – V', en: 'vi – IV – I – V' }, progression: 'Am F C G', songKey: 'C', groove: 'pop' },
  { name: { vi: 'I – vi – IV – V', en: 'I – vi – IV – V' }, progression: 'G Em C D', songKey: 'G', groove: 'ballad' },
  { name: { vi: 'Vòng Canon', en: 'Canon progression' }, progression: 'D A Bm F#m G D G A', songKey: 'D', groove: 'ballad' },
  { name: { vi: 'ii – V – I', en: 'ii – V – I' }, progression: 'Dm7 G7 Cmaj7*2', songKey: 'C', groove: 'bossa' },
  { name: { vi: 'Blues 12 ô nhịp', en: '12-bar blues' }, progression: 'A7*4 D7*2 A7*2 E7 D7 A7 E7', songKey: 'A', groove: 'blues', tempo: 90 },
  { name: { vi: 'Rock giọng thứ', en: 'Minor-key rock' }, progression: 'Am G F G', songKey: 'Am', groove: 'rock' },
]

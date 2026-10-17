export interface JamPreset {
  name: string
  progression: string
  songKey?: string
  groove: string
  tempo?: number
}

export const JAM_PRESETS: JamPreset[] = [
  { name: 'I – V – vi – IV', progression: 'C G Am F', songKey: 'C', groove: 'pop' },
  { name: 'vi – IV – I – V', progression: 'Am F C G', songKey: 'C', groove: 'pop' },
  { name: 'I – vi – IV – V', progression: 'G Em C D', songKey: 'G', groove: 'ballad' },
  { name: 'Vòng Canon', progression: 'D A Bm F#m G D G A', songKey: 'D', groove: 'ballad' },
  { name: 'ii – V – I', progression: 'Dm7 G7 Cmaj7*2', songKey: 'C', groove: 'bossa' },
  { name: 'Blues 12 ô nhịp', progression: 'A7*4 D7*2 A7*2 E7 D7 A7 E7', songKey: 'A', groove: 'blues', tempo: 90 },
  { name: 'Rock giọng thứ', progression: 'Am G F G', songKey: 'Am', groove: 'rock' },
]

import type { Localized } from '../i18n/locale'
import type { Groove } from './grooves'

/** Picked note: bass (B), alternate bass (B'), or a string number 1–6. */
export type PickNote = 'B' | "B'" | 1 | 2 | 3 | 4 | 5 | 6

export type Step =
  | { kind: 'rest' }
  | { kind: 'strum'; dir: 'down' | 'up'; light: boolean }
  | { kind: 'mute' }
  | { kind: 'pick'; notes: PickNote[] }

export interface Rhythm {
  id: string
  name: Localized
  kind: 'strum' | 'pick'
  beatsPerBar: 3 | 4
  /** Steps per beat: 2 (eighths), 3 (triplets), 4 (sixteenths). */
  stepsPerBeat: 2 | 3 | 4
  /**
   * One bar of pattern, steps separated by spaces:
   * D / U = down / up strum, d / u = light strum, X = muted chop, - = rest,
   * B / B' = bass / alternate bass, number = string to pick, join simultaneous notes with "+" (B+1, 123 = strings 1, 2, 3).
   */
  pattern: string
  defaultTempo: number
  /** Drum + bass groove that goes with it. */
  groove: Groove['id']
  description: Localized
}

export function parseStep(token: string): Step {
  switch (token) {
    case '-':
      return { kind: 'rest' }
    case 'D':
      return { kind: 'strum', dir: 'down', light: false }
    case 'd':
      return { kind: 'strum', dir: 'down', light: true }
    case 'U':
      return { kind: 'strum', dir: 'up', light: false }
    case 'u':
      return { kind: 'strum', dir: 'up', light: true }
    case 'X':
      return { kind: 'mute' }
  }
  const notes: PickNote[] = []
  for (const part of token.split('+')) {
    if (part === 'B' || part === "B'") notes.push(part)
    else if (/^[1-6]+$/.test(part)) for (const ch of part) notes.push(Number(ch) as PickNote)
    else throw new Error(`Invalid step in rhythm pattern: "${token}"`)
  }
  return { kind: 'pick', notes }
}

export function formatStep(step: Step): string {
  switch (step.kind) {
    case 'rest':
      return '-'
    case 'mute':
      return 'X'
    case 'strum':
      return step.dir === 'down' ? (step.light ? 'd' : 'D') : step.light ? 'u' : 'U'
    case 'pick': {
      const bass = step.notes.filter((n) => typeof n === 'string')
      const strings = step.notes.filter((n): n is Exclude<PickNote, 'B' | "B'"> => typeof n === 'number').sort((a, b) => a - b)
      return [...bass, ...(strings.length ? [strings.join('')] : [])].join('+')
    }
  }
}

export function parsePattern(pattern: string): Step[] {
  return pattern.trim().split(/\s+/).map(parseStep)
}

export function stepsPerBar(r: Pick<Rhythm, 'beatsPerBar' | 'stepsPerBeat'>): number {
  return r.beatsPerBar * r.stepsPerBeat
}

/** Checks the pattern has the right number of steps for one bar. */
export function validateRhythm(r: Rhythm): void {
  const steps = parsePattern(r.pattern)
  if (steps.length !== stepsPerBar(r)) throw new Error(`Rhythm ${r.id}: needs ${stepsPerBar(r)} steps, has ${steps.length}`)
}

const vi = (v: string, en: string): Localized => ({ vi: v, en })

/**
 * Rhythm library. These are common / simplified versions for practice — each rhythm has many variants in real life.
 */
export const RHYTHMS: Rhythm[] = [
  // ---- Strumming
  { id: 'ballad', name: vi('Ballad / Pop', 'Ballad / Pop'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 2, pattern: 'D - D U - U D U', defaultTempo: 80, groove: 'ballad', description: vi('Kiểu quạt cơ bản nhất, hợp với rất nhiều bài pop và ballad.', 'The most basic strumming pattern, fits a huge number of pop songs and ballads.') },
  { id: 'slow', name: vi('Slow', 'Slow'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 2, pattern: 'D - - U X - D U', defaultTempo: 66, groove: 'ballad', description: vi('Chậm, nhẹ, có tiếng chặn ở phách 3.', 'Slow and gentle, with a muted hit on beat 3.') },
  { id: 'slowrock', name: vi('Slow Rock', 'Slow rock (12/8)'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 3, pattern: 'D d d X d d D d d X d d', defaultTempo: 60, groove: 'slowrock', description: vi('Mỗi phách chia ba (12/8), chặn ở phách 2 và 4.', 'Each beat split in three (12/8), with mutes on beats 2 and 4.') },
  { id: 'rock', name: vi('Rock', 'Rock'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 2, pattern: 'D d D d D d D d', defaultTempo: 112, groove: 'rock', description: vi('Quạt xuống đều móc đơn, nhấn phách.', 'Steady eighth-note downstrokes, accenting the beats.') },
  { id: 'disco', name: vi('Disco', 'Disco'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 2, pattern: 'D U X U D U X U', defaultTempo: 116, groove: 'pop', description: vi('Chặn tiếng ở phách 2 và 4 — sôi động.', 'Mutes on beats 2 and 4 — upbeat and danceable.') },
  { id: 'fox', name: vi('Fox', 'Foxtrot'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 2, pattern: "B - X - B' - X -", defaultTempo: 120, groove: 'pop', description: vi('Bass xen kẽ tiếng chặn: bass – chặn – bass luân phiên – chặn.', 'Bass alternating with mutes: bass – mute – alternate bass – mute.') },
  { id: 'shuffle', name: vi('Blues / Shuffle', 'Blues shuffle'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 3, pattern: 'D - U D - U D - U D - U', defaultTempo: 90, groove: 'blues', description: vi('Cảm giác "dài – ngắn" lắc lư của blues.', 'The swaying "long – short" feel of the blues.') },
  { id: 'valse', name: vi('Valse', 'Waltz'), kind: 'strum', beatsPerBar: 3, stepsPerBeat: 2, pattern: 'B - X - X -', defaultTempo: 120, groove: 'waltz', description: vi('Nhịp 3/4: bass – chả – chả.', '3/4 time: bass – chop – chop.') },
  { id: 'boston', name: vi('Boston', 'Boston'), kind: 'strum', beatsPerBar: 3, stepsPerBeat: 2, pattern: 'B - X U X U', defaultTempo: 96, groove: 'waltz', description: vi('Valse chậm, thêm nhịp quạt lên cho mềm mại.', 'A slow waltz with added upstrokes for a softer feel.') },
  { id: 'bolero', name: vi('Bolero', 'Bolero'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 2, pattern: "B - X U B' U X U", defaultTempo: 90, groove: 'ballad', description: vi('Bass ở phách 1 và 3, chặn ở phách 2 và 4.', 'Bass on beats 1 and 3, mutes on beats 2 and 4.') },
  { id: 'chachacha', name: vi('Chachacha', 'Cha-cha'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 2, pattern: 'B - D - D - D D', defaultTempo: 120, groove: 'pop', description: vi('Ba tiếng quạt "cha – cha – cha" cuối ô nhịp.', 'The three "cha – cha – cha" strums at the end of the bar.') },
  { id: 'rumba', name: vi('Rumba', 'Rumba'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 2, pattern: 'D - - D - - D -', defaultTempo: 100, groove: 'bossa', description: vi('Nhấn lệch 3 – 3 – 2.', 'The syncopated 3 – 3 – 2 accent pattern.') },
  { id: 'tango', name: vi('Tango', 'Tango'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 2, pattern: 'X - X - X - X X', defaultTempo: 110, groove: 'pop', description: vi('Dứt khoát, tiếng chặn mạnh.', 'Crisp and sharp, with strong muted hits.') },
  { id: 'surf', name: vi('Surf', 'Surf'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 2, pattern: 'D U D U D U D U', defaultTempo: 140, groove: 'rock', description: vi('Quạt lên xuống liên tục, rất sôi động.', 'Continuous down-up strumming, very energetic.') },
  { id: 'reggae', name: vi('Reggae', 'Reggae'), kind: 'strum', beatsPerBar: 4, stepsPerBeat: 2, pattern: '- - X - - - X -', defaultTempo: 80, groove: 'pop', description: vi('Chỉ đánh chặn ở phách 2 và 4 (phách yếu).', 'Only short muted chops on beats 2 and 4 (the offbeats).') },
  // ---- Picking
  { id: 'ballad-pick', name: vi('Móc Ballad', 'Ballad picking'), kind: 'pick', beatsPerBar: 4, stepsPerBeat: 2, pattern: 'B 3 2 3 1 3 2 3', defaultTempo: 76, groove: 'ballad', description: vi('Kiểu móc cơ bản nhất: bass rồi rải các dây cao.', 'The most basic fingerpicking pattern: bass, then the treble strings.') },
  { id: 'slow-pick', name: vi('Móc Slow', 'Slow picking'), kind: 'pick', beatsPerBar: 4, stepsPerBeat: 2, pattern: "B 3 2 1 B' 3 2 1", defaultTempo: 66, groove: 'ballad', description: vi('Rải lên đều, bass luân phiên ở phách 3.', 'Even upward arpeggios, alternate bass on beat 3.') },
  { id: 'slowrock-pick', name: vi('Móc Slow Rock', 'Slow rock picking'), kind: 'pick', beatsPerBar: 4, stepsPerBeat: 3, pattern: "B 3 2 1 2 3 B' 3 2 1 2 3", defaultTempo: 60, groove: 'slowrock', description: vi('Chùm ba 12/8: rải lên rồi xuống.', 'Triplets in 12/8: arpeggio up and back down.') },
  { id: 'valse-pick', name: vi('Móc Valse', 'Waltz picking'), kind: 'pick', beatsPerBar: 3, stepsPerBeat: 2, pattern: 'B 3 2 1 2 3', defaultTempo: 108, groove: 'waltz', description: vi('Nhịp 3/4: bass rồi rải lên – xuống.', '3/4 time: bass, then up and down the treble strings.') },
  { id: 'boston-pick', name: vi('Móc Boston', 'Boston picking'), kind: 'pick', beatsPerBar: 3, stepsPerBeat: 2, pattern: "B 3 2 B' 2 3", defaultTempo: 92, groove: 'waltz', description: vi('Valse chậm với bass luân phiên giữa ô nhịp.', 'A slow waltz with an alternate bass mid-bar.') },
  { id: 'bolero-pick', name: vi('Móc Bolero', 'Bolero picking'), kind: 'pick', beatsPerBar: 4, stepsPerBeat: 2, pattern: "B 3 2 3 B' 1 2 3", defaultTempo: 84, groove: 'ballad', description: vi('Bass ở phách 1 và 3, các dây cao rải xen kẽ.', 'Bass on beats 1 and 3 with the treble strings in between.') },
  { id: 'travis', name: vi('Travis picking', 'Travis picking'), kind: 'pick', beatsPerBar: 4, stepsPerBeat: 2, pattern: "B+1 3 B' 2 B 1 B' 3", defaultTempo: 92, groove: 'pop', description: vi('Ngón cái giữ bass luân phiên đều mỗi phách, các ngón khác móc xen giữa.', 'The thumb keeps a steady alternating bass on every beat while the fingers pick in between.') },
  { id: 'arpeggio', name: vi('Rải hợp âm', 'Arpeggio'), kind: 'pick', beatsPerBar: 4, stepsPerBeat: 2, pattern: "B 4 3 2 1 2 3 4", defaultTempo: 80, groove: 'ballad', description: vi('Rải lên rồi xuống — hay dùng cho intro / outro.', 'Up and back down — great for intros and outros.') },
  { id: 'bossa-pick', name: vi('Bossa nova (ngón)', 'Bossa nova (fingerstyle)'), kind: 'pick', beatsPerBar: 4, stepsPerBeat: 2, pattern: "B+123 - - B'+123 - 123 - 123", defaultTempo: 120, groove: 'bossa', description: vi('Ngón cái chơi bass ở phách 1 và 3, các ngón kia bấm hợp âm so le.', 'The thumb plays bass on beats 1 and 3, the fingers pluck syncopated chords.') },
]

export function rhythm(id: string): Rhythm {
  const r = RHYTHMS.find((x) => x.id === id)
  if (!r) throw new Error(`Unknown rhythm: ${id}`)
  return r
}

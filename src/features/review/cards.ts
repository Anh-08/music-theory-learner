import { Note } from 'tonal'
import { arpeggioThenChord, chordEvents, sequenceEvents, type PlayEvent } from '../../audio/events'
import { progressionEvents } from '../../audio/progression'
import type { Locale } from '../../i18n/locale'
import type { MessageKey } from '../../i18n/messages'
import {
  chordFromRoot,
  chordType,
  chordTypeName,
  diatonicChords,
  displayNote,
  intervalShortName,
  keyLabel,
  keySignature,
  parseKey,
  parseProgression,
  semitones,
  stackIntervals,
} from '../../theory'

export type DeckId = 'interval-name' | 'interval-ear' | 'chord-ear' | 'chord-spell' | 'key-sig' | 'diatonic' | 'progression-ear'

export interface Deck {
  id: DeckId
  items: string[]
  /** Bộ luyện tai (cần nghe). */
  ear: boolean
}

const INTERVALS = ['2m', '2M', '3m', '3M', '4P', '4A', '5P', '6m', '6M', '7m', '7M', '8P']
const PROGRESSIONS: Record<string, string> = {
  'I-IV-V-I': 'I IV V I',
  'I-V-vi-IV': 'I V vi IV',
  'I-vi-IV-V': 'I vi IV V',
  'vi-IV-I-V': 'vi IV I V',
  'ii-V-I': 'ii7 V7 Imaj7 Imaj7',
}

export const DECKS: Deck[] = [
  { id: 'interval-name', items: INTERVALS, ear: false },
  { id: 'chord-spell', items: ['M', 'm', 'dim', 'aug', 'maj7', '7', 'm7', 'm7b5'], ear: false },
  { id: 'key-sig', items: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'], ear: false },
  { id: 'diatonic', items: ['0', '1', '2', '3', '4', '5', '6'], ear: false },
  { id: 'interval-ear', items: INTERVALS, ear: true },
  { id: 'chord-ear', items: ['M', 'm', 'dim', 'aug', 'maj7', '7', 'm7', 'm7b5', 'dim7'], ear: true },
  { id: 'progression-ear', items: Object.keys(PROGRESSIONS), ear: true },
]

export function deck(id: DeckId): Deck {
  return DECKS.find((d) => d.id === id)!
}

export function cardIds(decks: DeckId[]): string[] {
  return decks.flatMap((d) => deck(d).items.map((item) => `${d}:${item}`))
}

export interface Question {
  prompt: MessageKey
  params: Record<string, string>
  options: string[]
  answer: number
  events?: PlayEvent[]
}

type Random = () => number

function pick<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)]
}

function shuffle<T>(items: T[], random: Random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 4 lựa chọn: đáp án + 3 phương án nhiễu khác nhau, xáo trộn. */
function withDistractors(answer: string, pool: string[], random: Random): { options: string[]; answer: number } {
  const others = shuffle([...new Set(pool.filter((p) => p !== answer))], random).slice(0, 3)
  const options = shuffle([answer, ...others], random)
  return { options, answer: options.indexOf(answer) }
}

const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'Eb']

const SPELL_TYPES = ['M', 'm', 'dim', 'aug', 'maj7', '7', 'm7', 'm7b5']
const SPELL_ROOTS = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'].filter((r) =>
  SPELL_TYPES.every((id) => chordFromRoot(r, id).notes.every((n) => !/(bb|##)/.test(n))),
)
const KEYS = ['C', 'G', 'D', 'A', 'F', 'Bb', 'E', 'Eb']

function sigText(tonic: string): string {
  const s = keySignature(parseKey(tonic))
  if (s.sharps.length) return `${s.sharps.length}♯`
  if (s.flats.length) return `${s.flats.length}♭`
  return '0'
}

/** Dựng câu hỏi cho một thẻ "<bộ>:<mục>". Câu hỏi được dựng ngẫu nhiên mỗi lần (chủ âm, giọng…). */
export function buildQuestion(cardId: string, locale: Locale, random: Random = Math.random): Question {
  const [deckId, item] = cardId.split(/:(.*)/s) as [DeckId, string]
  const d = deck(deckId)
  switch (deckId) {
    case 'interval-name': {
      const root = pick(ROOTS, random)
      const other = Note.transpose(root, item)
      const { options, answer } = withDistractors(intervalShortName(item, locale), d.items.map((i) => intervalShortName(i, locale)), random)
      return { prompt: 'review.q.intervalName', params: { a: displayNote(root), b: displayNote(other) }, options, answer }
    }
    case 'interval-ear': {
      const rootMidi = 55 + Math.floor(random() * 12)
      const { options, answer } = withDistractors(intervalShortName(item, locale), d.items.map((i) => intervalShortName(i, locale)), random)
      return { prompt: 'review.q.intervalEar', params: {}, options, answer, events: sequenceEvents([rootMidi, rootMidi + semitones(item)], 0.7, 1) }
    }
    case 'chord-ear': {
      const rootMidi = 48 + Math.floor(random() * 12)
      const midis = stackIntervals(rootMidi, chordFromRoot('C', item).intervals)
      const name = (id: string) => chordTypeName(chordType(id), locale)
      const { options, answer } = withDistractors(name(item), d.items.map(name), random)
      return { prompt: 'review.q.chordEar', params: {}, options, answer, events: [...chordEvents(midis, 0, 1.4), ...arpeggioThenChord(midis, 0.3).slice(0, midis.length).map((e) => ({ ...e, at: e.at + 1.6 }))] }
    }
    case 'chord-spell': {
      // Chỉ chọn chủ âm mà mọi phương án đều không cần dấu hóa kép (E♭♭, F𝄪…) — dễ đọc với người học.
      const root = pick(SPELL_ROOTS, random)
      const spell = (id: string) => chordFromRoot(root, id).notes.map(displayNote).join(' ')
      const { options, answer } = withDistractors(spell(item), d.items.map(spell), random)
      return { prompt: 'review.q.chordSpell', params: { chord: displayNote(root) + chordType(item).suffix }, options, answer }
    }
    case 'key-sig': {
      const { options, answer } = withDistractors(sigText(item), d.items.map(sigText), random)
      return { prompt: 'review.q.keySig', params: { key: keyLabel(parseKey(item), locale) }, options, answer }
    }
    case 'diatonic': {
      const key = parseKey(pick(KEYS, random))
      const chords = diatonicChords(key)
      const target = chords[Number(item)]
      const label = (s: string) => displayNote(s.match(/^[A-G][#b]?/)![0]) + s.replace(/^[A-G][#b]?/, '')
      const { options, answer } = withDistractors(label(target.symbol), chords.map((c) => label(c.symbol)), random)
      return { prompt: 'review.q.diatonic', params: { key: keyLabel(key, locale), roman: target.roman }, options, answer }
    }
    case 'progression-ear': {
      const key = parseKey(pick(['C', 'G', 'D', 'F', 'A'], random))
      const chords = parseProgression(PROGRESSIONS[item], key)
      const label = (id: string) => id.replace(/-/g, ' – ')
      const { options, answer } = withDistractors(label(item), d.items.map(label), random)
      return {
        prompt: 'review.q.progressionEar',
        params: {},
        options,
        answer,
        events: progressionEvents(chords.map((c) => c.symbol), 48, 1.1, 0),
      }
    }
  }
}

/**
 * Chọn thẻ cho một lượt ôn: thẻ đến hạn trước (đến hạn sớm nhất trước), rồi thẻ mới chưa học,
 * tối đa `size` thẻ.
 */
export function pickSession(
  srs: Record<string, { box: number; due: number }>,
  decks: DeckId[],
  now: number,
  size = 12,
  random: Random = Math.random,
): string[] {
  const all = cardIds(decks)
  const due = all.filter((id) => srs[id] && srs[id].due <= now).sort((a, b) => srs[a].due - srs[b].due)
  const fresh = shuffle(
    all.filter((id) => !srs[id]),
    random,
  )
  return [...due, ...fresh].slice(0, size)
}

export function deckStats(srs: Record<string, { box: number; due: number }>, d: DeckId, now: number) {
  const ids = cardIds([d])
  return {
    total: ids.length,
    due: ids.filter((id) => srs[id] && srs[id].due <= now).length,
    fresh: ids.filter((id) => !srs[id]).length,
    learned: ids.filter((id) => (srs[id]?.box ?? 0) >= 4).length,
  }
}

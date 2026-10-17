import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlayEvent } from './events'
import type { InstrumentId } from './instruments'
import { playEvents, playNote, stopPlayback } from './player'

/** Trạng thái phát nhạc cho component: đang phát hay không và các nốt đang vang (để tô sáng). */
export function usePlayer(instrument: InstrumentId) {
  const [playing, setPlaying] = useState(false)
  const [activeMidis, setActiveMidis] = useState<ReadonlySet<number>>(new Set())
  const clearTimer = useRef<number | undefined>(undefined)

  const play = useCallback(
    async (events: PlayEvent[]) => {
      setPlaying(true)
      try {
        await playEvents(instrument, events, (midis) => setActiveMidis(new Set(midis ?? [])))
      } finally {
        setPlaying(false)
      }
    },
    [instrument],
  )

  const stop = useCallback(() => stopPlayback(), [])

  const note = useCallback(
    (midi: number) => {
      void playNote(instrument, midi)
      setActiveMidis(new Set([midi]))
      window.clearTimeout(clearTimer.current)
      clearTimer.current = window.setTimeout(() => setActiveMidis(new Set()), 600)
    },
    [instrument],
  )

  useEffect(
    () => () => {
      window.clearTimeout(clearTimer.current)
      void stopPlayback()
    },
    [],
  )

  return { playing, activeMidis, play, stop, playNote: note }
}

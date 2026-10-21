import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlayEvent } from './events'
import type { InstrumentId } from './instruments'
import { playEvents, playNote, stopPlayback } from './player'

/** Playback state for a component: whether it is playing and which notes are sounding (for highlighting). */
export function usePlayer(instrument: InstrumentId) {
  const [playing, setPlaying] = useState(false)
  const [activeMidis, setActiveMidis] = useState<ReadonlySet<number>>(new Set())
  /** Index of the sounding event in the list passed to `play` (null when nothing from it is sounding). */
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const clearTimer = useRef<number | undefined>(undefined)

  const play = useCallback(
    async (events: PlayEvent[]) => {
      setPlaying(true)
      try {
        await playEvents(instrument, events, (midis, index) => {
          setActiveMidis(new Set(midis ?? []))
          setActiveStep(midis ? (index ?? null) : null)
        })
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
      setActiveStep(null)
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

  return { playing, activeMidis, activeStep, play, stop, playNote: note }
}

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { liveStore, onLiveNote, type LiveState } from './liveInput'

export function useLiveInput(): LiveState {
  return useSyncExternalStore(liveStore.subscribe, liveStore.get)
}

/** Calls `handler` whenever a new note is played on a real instrument (always uses the latest handler). */
export function useLiveNote(handler: (midi: number) => void, enabled = true) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    if (!enabled) return
    return onLiveNote((m) => ref.current(m))
  }, [enabled])
}

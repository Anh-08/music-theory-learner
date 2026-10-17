import { useEffect, useRef, useSyncExternalStore } from 'react'
import { liveStore, onLiveNote, type LiveState } from './liveInput'

export function useLiveInput(): LiveState {
  return useSyncExternalStore(liveStore.subscribe, liveStore.get)
}

/** Gọi `handler` mỗi khi một nốt mới được chơi trên đàn thật (handler mới nhất luôn được dùng). */
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

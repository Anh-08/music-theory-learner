import { useSyncExternalStore } from 'react'

export interface JamState {
  /** Id của JamPlayer đang phát, hoặc null khi không phát. */
  ownerId: string | null
  /** Ô nhịp đang phát (tính từ 0 trong vòng lặp). */
  bar: number
  /** Bước đang phát trong điệu guitar (nếu có). */
  step: number
  /** Tempo hiện tại (thay đổi khi bật "tăng tempo dần"). */
  tempo: number
}

let state: JamState = { ownerId: null, bar: 0, step: -1, tempo: 0 }
const listeners = new Set<() => void>()

export const jamStore = {
  get: () => state,
  set(next: Partial<JamState>) {
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useJamState(): JamState {
  return useSyncExternalStore(jamStore.subscribe, jamStore.get)
}

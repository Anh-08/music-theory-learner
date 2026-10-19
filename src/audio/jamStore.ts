import { useSyncExternalStore } from 'react'

export interface JamState {
  /** Id of the JamPlayer that is playing, or null when stopped. */
  ownerId: string | null
  /** Bar being played (from 0 within the loop). */
  bar: number
  /** Step being played in the guitar rhythm (if any). */
  step: number
  /** Current tempo (changes when "gradual tempo increase" is on). */
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

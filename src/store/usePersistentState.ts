import { useEffect, useState } from 'react'

const PREFIX = 'mtl:'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/** useState persisted to localStorage (ignores errors when the browser blocks storage). */
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback))
  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // If it cannot be saved, never mind — settings are only a convenience.
    }
  }, [key, value])
  return [value, setValue] as const
}

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

/** useState có lưu vào localStorage (bỏ qua lỗi nếu trình duyệt chặn bộ nhớ). */
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback))
  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // Không lưu được thì thôi — cài đặt chỉ là tiện ích.
    }
  }, [key, value])
  return [value, setValue] as const
}

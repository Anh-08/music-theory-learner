import { readScore } from '../../theory/scoreIO'
import type { Score } from '../../theory/score'

/**
 * Scores saved in this browser: an index (for the library list) plus one localStorage entry per score,
 * so opening the library never parses every score.
 */

const INDEX_KEY = 'mtl:sheets:index'
const PREFIX = 'mtl:sheet:'

export interface SheetSummary {
  id: string
  title: string
  keySig: string
  tempo: number
  bars: number
  updated: number
}

function readIndex(): SheetSummary[] {
  try {
    const raw = JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((x): x is SheetSummary => typeof x?.id === 'string') : []
  } catch {
    return []
  }
}

function writeIndex(list: SheetSummary[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list))
  listeners.forEach((l) => l())
}

const listeners = new Set<() => void>()

export function subscribeSheets(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

let cache: { raw: string | null | undefined; list: SheetSummary[] } = { raw: undefined, list: [] }

/** Stable list for `useSyncExternalStore`: recomputed only when the stored index text changes. */
export function sheetsSnapshot(): SheetSummary[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(INDEX_KEY)
  } catch {
    raw = null
  }
  if (raw !== cache.raw) cache = { raw, list: listSheets() }
  return cache.list
}

/** Scores, most recently edited first. */
export function listSheets(): SheetSummary[] {
  return readIndex().sort((a, b) => b.updated - a.updated)
}

export function loadSheet(id: string): Score | null {
  try {
    const raw = localStorage.getItem(PREFIX + id)
    return raw ? readScore(JSON.parse(raw), id) : null
  } catch {
    return null
  }
}

let saveFailed = false

/** Whether the last save failed (for `useSyncExternalStore`). */
export function lastSaveFailed(): boolean {
  return saveFailed
}

function setSaveFailed(v: boolean) {
  if (v === saveFailed) return
  saveFailed = v
  listeners.forEach((l) => l())
}

/** Saves a score; false when the browser refuses (storage full or blocked). */
export function saveSheet(score: Score, now = Date.now()): boolean {
  const ok = writeSheet(score, now)
  setSaveFailed(!ok)
  return ok
}

function writeSheet(score: Score, now: number): boolean {
  try {
    localStorage.setItem(PREFIX + score.id, JSON.stringify(score))
    const summary: SheetSummary = {
      id: score.id,
      title: score.title,
      keySig: score.keySig,
      tempo: score.tempo,
      bars: score.measures.length,
      updated: now,
    }
    writeIndex([summary, ...readIndex().filter((s) => s.id !== score.id)])
    return true
  } catch {
    return false
  }
}

export function deleteSheet(id: string) {
  try {
    localStorage.removeItem(PREFIX + id)
    writeIndex(readIndex().filter((s) => s.id !== id))
  } catch {
    // Storage blocked: nothing to delete.
  }
}

export function newSheetId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/** Every saved score (for the progress backup file). */
export function exportAllSheets(): Score[] {
  return readIndex()
    .map((s) => loadSheet(s.id))
    .filter((s): s is Score => s !== null)
}

/** Restores scores from a backup; existing scores with the same id are replaced. Returns how many were read. */
export function importSheets(list: unknown): number {
  if (!Array.isArray(list)) return 0
  let n = 0
  for (const raw of list) {
    const score = readScore(raw)
    if (score && saveSheet(score)) n++
  }
  return n
}

/** Rough share of the ~5 MB localStorage quota in use (0–1). */
export function storageUsage(): number {
  try {
    let bytes = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? ''
      bytes += (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2
    }
    return bytes / (5 * 1024 * 1024)
  } catch {
    return 0
  }
}

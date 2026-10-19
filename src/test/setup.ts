import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Vitest does not enable `globals`, so Testing Library does not clean up the DOM after each test on its own.
afterEach(() => cleanup())

// jsdom has no Web Audio: replace playback with no-ops so tests never touch Tone.js.
vi.mock('../audio/player', () => ({
  playNote: vi.fn(async () => {}),
  playEvents: vi.fn(async () => {}),
  stopPlayback: vi.fn(async () => {}),
}))

vi.mock('../audio/jam', async () => {
  const { jamStore } = await import('../audio/jamStore')
  return {
    startJam: vi.fn(async (opts: { ownerId: string }) => jamStore.set({ ownerId: opts.ownerId, bar: 0 })),
    updateJam: vi.fn(async () => {}),
    onRhythmHit: vi.fn(() => () => {}),
    stopJam: vi.fn(async (ownerId?: string) => {
      if (ownerId === undefined || jamStore.get().ownerId === ownerId) jamStore.set({ ownerId: null, bar: 0 })
    }),
  }
})

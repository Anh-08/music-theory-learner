import type { Vex } from './drawScore'

let vexPromise: Promise<Vex> | null = null

/** Loads VexFlow (with only the Bravura music font) the first time a score is shown. */
export function loadVex(): Promise<Vex> {
  vexPromise ??= import('vexflow/bravura')
    .then(async (mod) => {
      // Glyph metrics need the fonts; VexFlow registers them on import, wait until the browser has them.
      await Promise.all([document.fonts?.load('30px Bravura'), document.fonts?.load('12px Academico')]).catch(() => undefined)
      return mod as unknown as Vex
    })
    .catch((err) => {
      vexPromise = null
      throw err
    })
  return vexPromise
}

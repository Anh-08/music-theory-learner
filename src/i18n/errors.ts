import { TheoryError } from '../theory'
import type { Translate } from './useT'

/** Error message in the current language: input errors (TheoryError) are translated, other errors are shown as is. */
export function errorMessage(error: unknown, t: Translate): string {
  if (error instanceof TheoryError) return t(`error.${error.code}`, error.params)
  return error instanceof Error ? error.message : String(error)
}

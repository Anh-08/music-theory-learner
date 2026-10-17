import { TheoryError } from '../theory'
import type { Translate } from './useT'

/** Thông báo lỗi theo ngôn ngữ: lỗi nhập liệu (TheoryError) được dịch, lỗi khác giữ nguyên. */
export function errorMessage(error: unknown, t: Translate): string {
  if (error instanceof TheoryError) return t(`error.${error.code}`, error.params)
  return error instanceof Error ? error.message : String(error)
}

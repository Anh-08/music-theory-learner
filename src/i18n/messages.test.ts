import { describe, expect, it } from 'vitest'
import { en, format, vi } from './messages'

describe('messages', () => {
  it('bản tiếng Anh có đủ khóa và không bỏ trống', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort())
    for (const [k, v] of Object.entries(en)) expect(v.trim(), k).not.toBe('')
  })

  it('hai bản dùng cùng bộ tham số', () => {
    const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const k of Object.keys(vi) as (keyof typeof vi)[]) expect(params(en[k]), k).toEqual(params(vi[k]))
  })

  it('điền tham số', () => {
    expect(format('Đã học {done}/{total} bài', { done: 2, total: 22 })).toBe('Đã học 2/22 bài')
    expect(format('Giữ {missing}', {})).toBe('Giữ {missing}')
  })
})

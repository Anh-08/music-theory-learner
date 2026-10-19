import { describe, expect, it } from 'vitest'
import { browserLocale } from './locale'
import { en, format, vi } from './messages'

describe('messages', () => {
  it('the English version has every key and none are empty', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort())
    for (const [k, v] of Object.entries(en)) expect(v.trim(), k).not.toBe('')
  })

  it('both versions use the same parameters', () => {
    const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const k of Object.keys(vi) as (keyof typeof vi)[]) expect(params(en[k]), k).toEqual(params(vi[k]))
  })

  it('fills in parameters', () => {
    expect(format('Đã học {done}/{total} bài', { done: 2, total: 22 })).toBe('Đã học 2/22 bài')
    expect(format('Giữ {missing}', {})).toBe('Giữ {missing}')
  })
})

describe('browserLocale', () => {
  it('picks the first Vietnamese or English browser language, English otherwise', () => {
    expect(browserLocale(['vi-VN', 'en-US'])).toBe('vi')
    expect(browserLocale(['en-US', 'vi'])).toBe('en')
    expect(browserLocale(['fr-FR', 'vi'])).toBe('vi')
    expect(browserLocale(['ja-JP'])).toBe('en')
    expect(browserLocale([])).toBe('en')
  })
})

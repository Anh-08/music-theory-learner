import type { Score } from '../../theory/score'
import { readScore } from '../../theory/scoreIO'

/**
 * Share links carry the whole score in the URL (`#/sheet/shared?d=…`): JSON, deflate-compressed when the browser
 * can, then base64url. Nothing is uploaded anywhere. The first character says which: "1" compressed, "0" plain.
 */

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter()
  // Errors (damaged data) surface on the reading side; the writing side's rejection is not needed twice.
  const written = writer.write(bytes as Uint8Array<ArrayBuffer>).then(() => writer.close()).catch(() => undefined)
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  await written
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

export async function encodeScore(score: Score): Promise<string> {
  const { id: _id, ...rest } = score
  void _id
  const bytes = new TextEncoder().encode(JSON.stringify(rest))
  if (typeof CompressionStream !== 'undefined') {
    try {
      return '1' + toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')))
    } catch {
      // Fall through to the plain form.
    }
  }
  return '0' + toBase64Url(bytes)
}

/** The score inside a share code, or null when the code is damaged. */
export async function decodeScore(code: string, id: string): Promise<Score | null> {
  try {
    const kind = code[0]
    let bytes = fromBase64Url(code.slice(1))
    if (kind === '1') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'))
    else if (kind !== '0') return null
    return readScore({ ...JSON.parse(new TextDecoder().decode(bytes)), id }, id)
  } catch {
    return null
  }
}

export function shareUrl(code: string): string {
  return `${location.origin}${location.pathname}#/sheet/shared?d=${code}`
}

/** Saves text as a file through the browser's download. */
export function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** A file name from the score title: "Lick #1 (Am)" → "lick-1-am". */
export function fileBase(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug.slice(0, 60) || 'score'
}

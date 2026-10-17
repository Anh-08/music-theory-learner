/**
 * Tone.Transport chỉ có một: lúc nào cũng chỉ một "chủ" dùng nó (chuỗi nốt của bài học, hoặc Jam).
 * Chủ mới nhận quyền thì chủ cũ được báo để tự dọn trạng thái (nút "Dừng" về "Nghe"…).
 */
type Release = () => void

let owner: Release | null = null

export function claimTransport(release: Release): void {
  const prev = owner
  owner = release
  if (prev && prev !== release) prev()
}

export function releaseTransport(release: Release): void {
  if (owner === release) owner = null
}

export function ownsTransport(release: Release): boolean {
  return owner === release
}

/**
 * There is only one Tone.Transport: at any time a single "owner" uses it (a lesson's note sequence, or the Jam).
 * When a new owner takes over, the previous one is notified so it can reset its state (the "Stop" button back to "Listen"…).
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

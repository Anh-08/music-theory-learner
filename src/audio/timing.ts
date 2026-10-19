export interface TimingStats {
  /** Number of strums matched to a beat of the rhythm. */
  matched: number
  /** Mean offset (ms): positive = late, negative = early. */
  meanMs: number
  /** Percentage of strums within ±`tolerance`. */
  onTimePct: number
}

/**
 * Compares detected strums (`onsets`) with the rhythm's beat times (`expected`), both in seconds.
 * Each strum matches the nearest beat within ±`window`; each beat matches only once.
 */
export function scoreTiming(expected: number[], onsets: number[], window = 0.15, tolerance = 0.05): TimingStats {
  const used = new Set<number>()
  const deviations: number[] = []
  for (const t of onsets) {
    let best = -1
    let bestDist = Infinity
    expected.forEach((e, i) => {
      const d = Math.abs(t - e)
      if (!used.has(i) && d <= window && d < bestDist) {
        best = i
        bestDist = d
      }
    })
    if (best >= 0) {
      used.add(best)
      deviations.push(t - expected[best])
    }
  }
  if (!deviations.length) return { matched: 0, meanMs: 0, onTimePct: 0 }
  const mean = deviations.reduce((a, b) => a + b, 0) / deviations.length
  const onTime = deviations.filter((d) => Math.abs(d) <= tolerance).length
  return { matched: deviations.length, meanMs: Math.round(mean * 1000), onTimePct: Math.round((onTime / deviations.length) * 100) }
}

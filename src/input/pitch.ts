/**
 * Nhận diện cao độ một nốt đơn bằng phương pháp McLeod (NSDF — normalized square difference function).
 * Trả về tần số (Hz) và độ rõ (0–1); null nếu không tìm được chu kỳ rõ ràng.
 */
export function detectPitch(buf: Float32Array, sampleRate: number, minFreq = 40, maxFreq = 1500): { freq: number; clarity: number } | null {
  const n = buf.length
  const maxLag = Math.min(n - 1, Math.floor(sampleRate / minFreq))
  const minLag = Math.max(2, Math.floor(sampleRate / maxFreq))
  const nsdf = new Float32Array(maxLag + 1)
  for (let tau = 0; tau <= maxLag; tau++) {
    let acf = 0
    let m = 0
    for (let i = 0; i < n - tau; i++) {
      acf += buf[i] * buf[i + tau]
      m += buf[i] * buf[i] + buf[i + tau] * buf[i + tau]
    }
    nsdf[tau] = m > 0 ? (2 * acf) / m : 0
  }

  // Tìm các đỉnh dương giữa các lần cắt 0 đi xuống; chọn đỉnh đầu tiên đạt ≥ 90% đỉnh cao nhất.
  const peaks: number[] = []
  let tau = minLag
  while (tau < maxLag && nsdf[tau] > 0) tau++ // bỏ đoạn dương đầu (quanh lag 0)
  while (tau < maxLag) {
    while (tau < maxLag && nsdf[tau] <= 0) tau++
    let best = tau
    while (tau < maxLag && nsdf[tau] > 0) {
      if (nsdf[tau] > nsdf[best]) best = tau
      tau++
    }
    if (best < maxLag && nsdf[best] > 0) peaks.push(best)
  }
  if (!peaks.length) return null
  const highest = Math.max(...peaks.map((p) => nsdf[p]))
  const chosen = peaks.find((p) => nsdf[p] >= 0.9 * highest)!

  // Nội suy parabol quanh đỉnh để có chu kỳ lẻ.
  const a = nsdf[chosen - 1] ?? nsdf[chosen]
  const b = nsdf[chosen]
  const c = nsdf[chosen + 1] ?? nsdf[chosen]
  const denom = a - 2 * b + c
  const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0
  const period = chosen + shift
  return { freq: sampleRate / period, clarity: b }
}

/** Tần số → số midi gần nhất và độ lệch cent. */
export function freqToMidi(freq: number): { midi: number; cents: number } {
  const exact = 69 + 12 * Math.log2(freq / 440)
  const midi = Math.round(exact)
  return { midi, cents: Math.round((exact - midi) * 100) }
}

export function rms(buf: Float32Array): number {
  let s = 0
  for (const x of buf) s += x * x
  return Math.sqrt(s / buf.length)
}

/**
 * Bộ dò "nốt mới bắt đầu" (onset) theo năng lượng: báo khi âm lượng tăng vọt so với mức trung bình gần đây.
 * Gọi `push(level, time)` cho mỗi khung phân tích; trả về true nếu khung này là một onset.
 */
export function createOnsetDetector({ ratio = 1.8, minLevel = 0.02, minGap = 0.09 } = {}) {
  let avg = 0
  let prev = 0
  let last = -Infinity
  return (level: number, time: number): boolean => {
    // Phải đang tăng so với khung trước — tránh báo nhầm khi một nốt đang tắt dần.
    const onset = level > minLevel && level > avg * ratio && level > prev * 1.3 && time - last >= minGap
    avg = avg * 0.85 + level * 0.15
    prev = level
    if (onset) last = time
    return onset
  }
}

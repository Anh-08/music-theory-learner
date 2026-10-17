import { existingVoices, getTone, getVoice, isToneLoaded, type InstrumentId } from './instruments'
import { totalDuration, type PlayEvent } from './events'
import { claimTransport, ownsTransport, releaseTransport } from './transportOwner'

export type StepListener = (midis: number[] | null) => void

let session = 0
let stopCurrent: (() => void) | null = null

/** Được gọi khi chủ khác (chuỗi nốt mới, hoặc Jam) lấy Transport: kết thúc chuỗi đang phát. */
function release() {
  stopCurrent?.()
  stopCurrent = null
}

/** Phát ngay một nốt (khi bấm vào đàn ảo); không làm dừng chuỗi đang phát. */
export async function playNote(instrument: InstrumentId, midi: number, duration = 1.2): Promise<void> {
  const [T, voice] = await Promise.all([getTone(), getVoice(instrument)])
  voice.play([midi], T.now(), duration)
}

/**
 * Phát một chuỗi sự kiện qua Transport (dừng được giữa chừng).
 * `onStep` được gọi đúng lúc từng nhóm nốt vang lên — dùng để tô sáng trên đàn — và với `null` khi kết thúc.
 * Promise hoàn thành khi phát xong hoặc khi bị dừng.
 */
export async function playEvents(instrument: InstrumentId, events: PlayEvent[], onStep?: StepListener): Promise<void> {
  const id = ++session
  const [T, voice] = await Promise.all([getTone(), getVoice(instrument)])
  if (id !== session) return
  // Chuỗi trước (hoặc Jam) bị thay thế: báo cho nó kết thúc.
  release()
  claimTransport(release)
  const transport = T.getTransport()
  const draw = T.getDraw()
  transport.stop()
  transport.cancel()
  transport.position = 0

  for (const e of events) {
    transport.schedule((time) => {
      voice.play(e.midis, time, e.duration)
      if (onStep) draw.schedule(() => onStep(e.midis), time)
    }, e.at)
  }

  await new Promise<void>((resolve) => {
    const end = totalDuration(events)
    transport.schedule((time) => {
      // Không dùng Draw ở đây: Draw chạy theo requestAnimationFrame, bị dừng khi tab bị ẩn.
      setTimeout(
        () => {
          if (id === session && ownsTransport(release)) {
            transport.stop()
            releaseTransport(release)
            stopCurrent = null
            onStep?.(null)
          }
          resolve()
        },
        Math.max(0, (time - T.now()) * 1000),
      )
    }, end)
    stopCurrent = () => {
      onStep?.(null)
      resolve()
    }
    transport.start('+0.05')
  })
}

export async function stopPlayback(): Promise<void> {
  session++
  // Không đụng tới Transport nếu nó đang thuộc về Jam.
  if (!isToneLoaded() || !ownsTransport(release)) return
  const T = await getTone()
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  const voices = await Promise.all(existingVoices())
  voices.forEach((v) => v.releaseAll())
  releaseTransport(release)
  release()
}

import { existingVoices, getTone, getVoice, isToneLoaded, type InstrumentId } from './instruments'
import { totalDuration, type PlayEvent } from './events'
import { claimTransport, ownsTransport, releaseTransport } from './transportOwner'

export type StepListener = (midis: number[] | null) => void

let session = 0
let stopCurrent: (() => void) | null = null

/** Called when another owner (a new note sequence, or the Jam) takes the Transport: ends the current sequence. */
function release() {
  stopCurrent?.()
  stopCurrent = null
}

/** Plays one note immediately (when clicking the virtual instrument); does not stop the current sequence. */
export async function playNote(instrument: InstrumentId, midi: number, duration = 1.2): Promise<void> {
  const [T, voice] = await Promise.all([getTone(), getVoice(instrument)])
  voice.play([midi], T.now(), duration)
}

/**
 * Plays a sequence of events through the Transport (can be stopped midway).
 * `onStep` fires exactly when each group of notes sounds — used for highlighting on the instrument — and with `null` at the end.
 * The promise resolves when playback finishes or is stopped.
 */
export async function playEvents(instrument: InstrumentId, events: PlayEvent[], onStep?: StepListener): Promise<void> {
  const id = ++session
  const [T, voice] = await Promise.all([getTone(), getVoice(instrument)])
  if (id !== session) return
  // The previous sequence (or the Jam) is replaced: tell it to finish.
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
      // No Draw here: Draw runs on requestAnimationFrame, which stops when the tab is hidden.
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
  // Leave the Transport alone if it belongs to the Jam.
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

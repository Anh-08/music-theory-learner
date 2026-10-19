import type * as ToneNs from 'tone'

export type InstrumentId = 'piano' | 'guitar'

/** Lowest note (midi) to start from when playing a scale / chord: guitar sits an octave below piano, as in real life. */
export const PLAY_RANGE: Record<InstrumentId, { scale: number; chord: number }> = {
  guitar: { scale: 48, chord: 40 },
  piano: { scale: 60, chord: 48 },
}

export interface Voice {
  /** Play notes at `time` (AudioContext time) for `duration` seconds, velocity 0–1. */
  play(midis: number[], time: number, duration: number, velocity?: number): void
  /** Release every sounding note (at `time` if given — used for muted strums). */
  releaseAll(time?: number): void
}

type Tone = typeof ToneNs

// Salamander Grand Piano samples (CC-BY 3.0) hosted by Tone.js; loaded at runtime, not bundled in the repo.
const SALAMANDER_URL = 'https://tonejs.github.io/audio/salamander/'

function salamanderUrls(): Record<string, string> {
  const urls: Record<string, string> = {}
  for (let oct = 1; oct <= 7; oct++) {
    for (const [note, file] of [['C', 'C'], ['D#', 'Ds'], ['F#', 'Fs'], ['A', 'A']]) {
      urls[`${note}${oct}`] = `${file}${oct}.mp3`
    }
  }
  return urls
}

async function createPiano(T: Tone): Promise<Voice> {
  try {
    const sampler = await new Promise<ToneNs.Sampler>((resolve, reject) => {
      const s: ToneNs.Sampler = new T.Sampler({
        urls: salamanderUrls(),
        baseUrl: SALAMANDER_URL,
        release: 1,
        onload: () => resolve(s),
        onerror: reject,
      }).toDestination()
    })
    return {
      play: (midis, time, duration, velocity = 0.8) => sampler.triggerAttackRelease(midis.map(toFreq(T)), duration, time, velocity),
      releaseAll: (time) => sampler.releaseAll(time),
    }
  } catch {
    // Samples failed to load (offline…): fall back to a synth so there is still sound.
    const synth = new T.PolySynth(T.Synth, { envelope: { attack: 0.005, decay: 0.3, sustain: 0.3, release: 1 } }).toDestination()
    synth.volume.value = -8
    return {
      play: (midis, time, duration, velocity = 0.8) => synth.triggerAttackRelease(midis.map(toFreq(T)), duration, time, velocity),
      releaseAll: (time) => synth.releaseAll(time),
    }
  }
}

/** Guitar modelled with the Karplus-Strong algorithm (PluckSynth) — no samples needed. */
function createGuitar(T: Tone): Voice {
  // Enough for a 6-string strum layered over the ringing tail of the previous one.
  const POLYPHONY = 12
  const filter = new T.Filter(3500, 'lowpass').toDestination()
  const voices = Array.from({ length: POLYPHONY }, () => {
    const p = new T.PluckSynth({ attackNoise: 1.2, dampening: 3800, resonance: 0.97, release: 0.8 }).connect(filter)
    p.volume.value = 2
    return p
  })
  let next = 0
  return {
    play: (midis, time, duration, velocity = 0.8) => {
      for (const m of midis) {
        const v = voices[next]
        next = (next + 1) % POLYPHONY
        // PluckSynth ignores velocity: set this voice's volume right before plucking.
        v.volume.setValueAtTime(2 + 20 * Math.log10(Math.max(0.05, velocity)), time)
        v.triggerAttack(toFreq(T)(m), time)
        v.triggerRelease(time + duration)
      }
    },
    releaseAll: (time) => voices.forEach((v) => v.triggerRelease(time)),
  }
}

function toFreq(T: Tone) {
  return (m: number) => T.Frequency(m, 'midi').toFrequency()
}

let tonePromise: Promise<Tone> | null = null
const voices = new Map<InstrumentId, Promise<Voice>>()

/** Load Tone.js on demand (keeps the initial bundle small) and start the AudioContext — must follow a user gesture. */
export async function getTone(): Promise<Tone> {
  tonePromise ??= import('tone')
  const T = await tonePromise
  await T.start()
  return T
}

/** Voices created so far (creates nothing, does not start the AudioContext). */
export function existingVoices(): Promise<Voice>[] {
  return [...voices.values()]
}

export function isToneLoaded(): boolean {
  return tonePromise !== null
}

export async function getVoice(id: InstrumentId): Promise<Voice> {
  let v = voices.get(id)
  if (!v) {
    v = getTone().then((T) => (id === 'piano' ? createPiano(T) : createGuitar(T)))
    voices.set(id, v)
  }
  return v
}

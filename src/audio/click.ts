import { useSyncExternalStore } from 'react'
import type * as ToneNs from 'tone'
import { getTone, isToneLoaded } from './instruments'

/**
 * The metronome click shared by every feature (Jam Room, guitar comping, reflex drills).
 * The old click was a square wave at C6/G5: its strong odd harmonics land around 3–5 kHz, where the ear is most
 * sensitive, so it sounded harsh in headphones. The default is now a soft sine tick, and the sound and volume
 * are user settings (remembered, applied live).
 */
export type ClickSound = 'soft' | 'wood' | 'sharp'

export interface ClickSettings {
  sound: ClickSound
  /** 0–`MAX_CLICK_VOLUME` (0 = silent, 1 = normal, above 1 = boosted). */
  volume: number
}

export const CLICK_SOUNDS: ClickSound[] = ['soft', 'wood', 'sharp']
/** Up to +6 dB of boost: a sine tick is easy to lose under a guitar, especially through laptop speakers. */
export const MAX_CLICK_VOLUME = 2
export const DEFAULT_CLICK: ClickSettings = { sound: 'soft', volume: 1 }

const KEY = 'mtl:click'

/** Parses stored settings, falling back to the defaults for anything missing or invalid. */
export function parseClickSettings(raw: string | null): ClickSettings {
  try {
    const v = raw === null ? {} : (JSON.parse(raw) as Partial<ClickSettings>)
    return {
      sound: CLICK_SOUNDS.includes(v.sound as ClickSound) ? (v.sound as ClickSound) : DEFAULT_CLICK.sound,
      volume: typeof v.volume === 'number' && v.volume >= 0 && v.volume <= MAX_CLICK_VOLUME ? v.volume : DEFAULT_CLICK.volume,
    }
  } catch {
    return DEFAULT_CLICK
  }
}

/** Gain in dB for the volume slider (linear amplitude, so the slider feels even; 2 = +6 dB). */
export function volumeToDb(volume: number): number {
  return volume <= 0 ? -Infinity : 20 * Math.log10(volume)
}

function load(): ClickSettings {
  try {
    return parseClickSettings(localStorage.getItem(KEY))
  } catch {
    return DEFAULT_CLICK
  }
}

let settings = load()
const listeners = new Set<() => void>()

export const clickSettingsStore = {
  get: () => settings,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export function useClickSettings(): ClickSettings {
  return useSyncExternalStore(clickSettingsStore.subscribe, clickSettingsStore.get)
}

export function setClickSettings(patch: Partial<ClickSettings>): void {
  settings = { ...settings, ...patch }
  settings.volume = Math.min(MAX_CLICK_VOLUME, Math.max(0, Math.round(settings.volume * 100) / 100))
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Storage blocked: the setting still applies for this visit.
  }
  applyVolume()
  listeners.forEach((l) => l())
}

interface ClickVoice {
  synth: ToneNs.Synth | ToneNs.MembraneSynth
  /** Pitch of the accented / normal click. */
  notes: [string, string]
  /** Level at volume 1, so the three sounds are about equally loud. */
  baseDb: number
}

type Tone = typeof ToneNs

function createVoices(T: Tone): Record<ClickSound, ClickVoice> {
  // Boosted clicks (and clicks on top of a full band) could push the output past full scale and crackle; the limiter
  // keeps peaks just under it.
  const out = new T.Limiter(-1).toDestination()
  return {
    // Pure sine, short decay: no harmonics at all — the gentlest in headphones.
    soft: {
      synth: new T.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.002, decay: 0.05, sustain: 0, release: 0.02 } }).connect(out),
      notes: ['A5', 'E5'],
      baseDb: -3,
    },
    // A falling-pitch sine "tok", like a wood block.
    wood: {
      synth: new T.MembraneSynth({ pitchDecay: 0.012, octaves: 1.5, envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.01 } }).connect(out),
      notes: ['C5', 'G4'],
      baseDb: -1,
    },
    // The original square-wave beep, for those who want a click that cuts through a loud mix.
    sharp: {
      synth: new T.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 } }).connect(out),
      notes: ['C6', 'G5'],
      baseDb: -9,
    },
  }
}

let voices: Record<ClickSound, ClickVoice> | null = null

function applyVolume() {
  if (!voices) return
  for (const v of Object.values(voices)) v.synth.volume.value = v.baseDb + volumeToDb(settings.volume)
}

export interface Click {
  /** One click at `time` (AudioContext time); `level` (0–1) scales it, e.g. to sit lower inside a full band. */
  tick(time: number, accent: boolean, level?: number): void
}

export async function getClick(): Promise<Click> {
  const T = await getTone()
  if (!voices) {
    voices = createVoices(T)
    applyVolume()
  }
  const vs = voices
  return {
    tick(time, accent, level = 1) {
      if (settings.volume <= 0) return
      const v = vs[settings.sound]
      v.synth.triggerAttackRelease(v.notes[accent ? 0 : 1], 0.03, time, (accent ? 1 : 0.6) * level)
    },
  }
}

let lastPreview = 0

/**
 * Plays one accented click so the user hears a settings change. Skipped until audio has been used once, and while
 * the Transport is playing (the change is already audible, and an extra note between scheduled clicks would go back
 * in time on these monophonic synths).
 */
export async function previewClick(): Promise<void> {
  if (!isToneLoaded()) return
  const T = await getTone()
  if (T.getTransport().state === 'started') return
  const c = await getClick()
  lastPreview = Math.max(T.now() + 0.02, lastPreview + 0.06)
  try {
    c.tick(lastPreview, true)
  } catch {
    // Right after stopping, a click scheduled slightly ahead can still be pending; skipping one preview is fine.
  }
}

/** Changes the volume by `delta` and plays a click (reads the store, so quick repeated presses all count). */
export function nudgeClickVolume(delta: number): void {
  setClickSettings({ volume: settings.volume + delta })
  void previewClick()
}

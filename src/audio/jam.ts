import type * as ToneNs from 'tone'
import type { ProgressionChord } from '../theory'
import type { Groove } from './grooves'
import { getTone, getVoice, type InstrumentId } from './instruments'
import { buildJamEvents, loopBeats, type JamEvent, type JamTrack } from './jamEvents'
import { jamStore } from './jamStore'
import { claimTransport, ownsTransport, releaseTransport } from './transportOwner'

type Tone = typeof ToneNs

export interface JamOptions {
  ownerId: string
  chords: ProgressionChord[]
  groove: Groove
  tempo: number
  instrument: InstrumentId
  mutes: Record<JamTrack, boolean>
}

interface Kit {
  kick: ToneNs.MembraneSynth
  snare: ToneNs.NoiseSynth
  hat: ToneNs.NoiseSynth
  bass: ToneNs.MonoSynth
}

let kitPromise: Promise<Kit> | null = null

function createKit(T: Tone): Kit {
  const kick = new T.MembraneSynth({ pitchDecay: 0.03, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } }).toDestination()
  kick.volume.value = -4
  const snareFilter = new T.Filter(1800, 'highpass').toDestination()
  const snare = new T.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.14, sustain: 0 } }).connect(snareFilter)
  snare.volume.value = -14
  const hatFilter = new T.Filter(8000, 'highpass').toDestination()
  const hat = new T.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.035, sustain: 0 } }).connect(hatFilter)
  hat.volume.value = -22
  const bass = new T.MonoSynth({
    oscillator: { type: 'sawtooth' },
    filter: { type: 'lowpass', Q: 1 },
    filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.3, baseFrequency: 110, octaves: 2.2 },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.7, release: 0.15 },
  }).toDestination()
  bass.volume.value = -9
  return { kick, snare, hat, bass }
}

let part: ToneNs.Part | null = null
let mutes: Record<JamTrack, boolean> = { drums: false, bass: false, chords: false }

function release() {
  part?.dispose()
  part = null
  jamStore.set({ ownerId: null, bar: 0 })
}

/** Phát vòng lặp tiến trình với trống, bass và đệm hợp âm. Gọi lại khi đang phát sẽ phát lại từ đầu với cấu hình mới. */
export async function startJam(opts: JamOptions): Promise<void> {
  const T = await getTone()
  kitPromise ??= Promise.resolve(createKit(T))
  const [kit, voice] = await Promise.all([kitPromise, getVoice(opts.instrument)])

  claimTransport(release)
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  part?.dispose()
  transport.position = 0
  transport.bpm.value = opts.tempo
  mutes = { ...opts.mutes }

  const ppq = transport.PPQ
  const ticks = (beats: number) => `${Math.round(beats * ppq)}i`
  const seconds = (beats: number) => (beats * 60) / transport.bpm.value
  const roll = opts.instrument === 'guitar' ? 0.012 : 0

  const events = buildJamEvents(opts.chords, opts.groove, opts.instrument)
  const thisPart: ToneNs.Part = new T.Part<JamEvent & { time: string }>(
    (time, ev) => {
      switch (ev.kind) {
        case 'bar':
          // Hẹn giờ thay vì Draw: Draw chạy theo requestAnimationFrame, bị dừng khi tab bị ẩn.
          setTimeout(() => {
            if (part === thisPart) jamStore.set({ bar: ev.bar })
          }, Math.max(0, (time - T.now()) * 1000))
          break
        case 'kick':
          if (!mutes.drums) kit.kick.triggerAttackRelease('C1', '8n', time, ev.accent ? 1 : 0.8)
          break
        case 'snare':
          if (!mutes.drums) kit.snare.triggerAttackRelease('16n', time)
          break
        case 'hat':
          if (!mutes.drums) kit.hat.triggerAttackRelease('32n', time, ev.accent ? 0.9 : 0.5)
          break
        case 'bass':
          if (!mutes.bass) kit.bass.triggerAttackRelease(T.Frequency(ev.midi, 'midi').toFrequency(), seconds(ev.beats) * 0.92, time)
          break
        case 'chord':
          if (!mutes.chords) ev.midis.forEach((m, i) => voice.play([m], time + i * roll, seconds(ev.beats) * 0.95))
          break
      }
    },
    events.map((e) => ({ ...e, time: ticks(e.beat) })),
  )
  part = thisPart
  part.loop = true
  part.loopStart = 0
  part.loopEnd = ticks(loopBeats(opts.chords))
  part.start(0)
  jamStore.set({ ownerId: opts.ownerId, bar: 0 })
  transport.start('+0.1')
}

/** Đổi tempo / tắt bật từng phần mà không dừng nhạc. */
export async function updateJam(next: { tempo?: number; mutes?: Record<JamTrack, boolean> }): Promise<void> {
  if (next.mutes) mutes = { ...next.mutes }
  if (next.tempo !== undefined && part) {
    const T = await getTone()
    T.getTransport().bpm.rampTo(next.tempo, 0.1)
  }
}

/** Dừng Jam. Có `ownerId` thì chỉ dừng nếu đúng trình phát đó đang phát. */
export async function stopJam(ownerId?: string): Promise<void> {
  if (!ownsTransport(release)) return
  if (ownerId !== undefined && jamStore.get().ownerId !== ownerId) return
  const T = await getTone()
  const transport = T.getTransport()
  transport.stop()
  transport.cancel()
  releaseTransport(release)
  release()
}

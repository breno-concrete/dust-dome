// Owner: Dev C. Sound feedback for the scene and the repair QTE (US4, FR-011).
// Files live in public/audio/. Every call is safe: if the browser has no audio, blocks
// autoplay or a file is missing, the game goes on in silence. Loop lengths are not set
// here: a loop plays for as long as the game state says (alarm, storm), so the timings
// in src/config/*.json stay the only source.
import type { GameState, SeasonId } from '../../engine/types'

export type SoundId =
  | 'place-structure'
  | 'select-structure'
  | 'radiation-alarm'
  | 'dust-storm-loop'
  | 'radiation-storm-loop'
  | 'bolt-click'
  | 'repair-success'
  | 'repair-fail'
  | 'season-spring'
  | 'season-summer'
  | 'season-autumn'
  | 'season-winter'

export type LoopId = Extract<
  SoundId,
  'radiation-alarm' | 'dust-storm-loop' | 'radiation-storm-loop'
>

export type SeasonTrackId = Extract<
  SoundId,
  'season-spring' | 'season-summer' | 'season-autumn' | 'season-winter'
>

const EXT = '.ogg'
const ids: SoundId[] = [
  'place-structure',
  'select-structure',
  'radiation-alarm',
  'dust-storm-loop',
  'radiation-storm-loop',
  'bolt-click',
  'repair-success',
  'repair-fail',
  'season-spring',
  'season-summer',
  'season-autumn',
  'season-winter',
]
export const SOUND_FILES = Object.fromEntries(
  ids.map((id) => [id, `/audio/${id}${EXT}`]),
) as Record<SoundId, string>

export const SOUND_VOLUMES: Record<SoundId, number> = {
  'place-structure': 1.7,
  'select-structure': 1,
  'radiation-alarm': 1.5,
  'dust-storm-loop': 1.35,
  'radiation-storm-loop': 0.75,
  'bolt-click': 1,
  'repair-success': 1,
  'repair-fail': 1,
  'season-spring': 0.35,
  'season-summer': 0.35,
  'season-autumn': 0.35,
  'season-winter': 0.35,
}

const SEASON_TRACKS: Record<SeasonId, SeasonTrackId> = {
  spring: 'season-spring',
  summer: 'season-summer',
  autumn: 'season-autumn',
  winter: 'season-winter',
}

/** Maps a Mars season to its background music track id. */
export function seasonMusic(season: SeasonId): SeasonTrackId {
  return SEASON_TRACKS[season]
}

/** The part of HTMLAudioElement we use, so tests can pass a fake. */
export interface AudioLike {
  loop: boolean
  volume: number
  playbackRate: number
  currentTime: number
  preservesPitch?: boolean
  play: () => Promise<void> | void
  pause: () => void
}

/** Which background loop the base should hear right now (null = none). */
export function soundscape(
  game: Pick<GameState, 'radiationStorm' | 'activeEvents'>,
): LoopId | null {
  if (game.radiationStorm?.phase === 'warning') return 'radiation-alarm'
  if (game.radiationStorm?.phase === 'active') return 'radiation-storm-loop'
  const dusty = game.activeEvents.some(
    (e) => e.kind === 'dust_storm' || e.kind === 'global_dust_storm',
  )
  return dusty ? 'dust-storm-loop' : null
}

export interface SoundPlayer {
  /** One-shot sound. `rate` > 1 plays it faster and higher (rising bolt clicks). */
  play: (id: SoundId, options?: { rate?: number }) => void
  /** Keeps one loop playing; null stops it. Asking again for the same loop changes nothing. */
  loop: (id: LoopId | null) => void
  /** Keeps one season music track playing in its own channel; null stops it. */
  music: (id: SeasonTrackId | null) => void
  setMuted: (muted: boolean) => void
  isMuted: () => boolean
}

const MUTE_KEY = 'mars-outpost:muted'

function readMuted(): boolean {
  try {
    return globalThis.localStorage?.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function saveMuted(muted: boolean) {
  try {
    globalThis.localStorage?.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // Private window or blocked storage: the choice just is not remembered.
  }
}

function safePlay(audio: AudioLike) {
  try {
    const result = audio.play()
    if (result && typeof result.catch === 'function') result.catch(() => {})
  } catch {
    // Autoplay blocked or no audio device.
  }
}

function safeStop(audio: AudioLike | null) {
  try {
    audio?.pause()
  } catch {
    // Nothing to stop.
  }
}

function safeSetVolume(audio: AudioLike, volume: number) {
  try {
    audio.volume = volume
  } catch {
    // HTMLAudioElement throws IndexSizeError when volume > 1; clamp for the fallback.
    try {
      audio.volume = Math.min(1, Math.max(0, volume))
    } catch {
      // Ignore if volume is read-only.
    }
  }
}

export function createSoundPlayer(
  makeAudio: (src: string) => AudioLike,
  startMuted = false,
): SoundPlayer {
  let muted = startMuted
  let current: { id: LoopId; audio: AudioLike | null } | null = null
  let currentMusic: { id: SeasonTrackId; audio: AudioLike | null } | null = null

  const make = (id: SoundId): AudioLike | null => {
    try {
      return makeAudio(SOUND_FILES[id])
    } catch {
      return null
    }
  }

  const stopLoop = () => {
    safeStop(current?.audio ?? null)
    current = null
  }

  const stopMusic = () => {
    safeStop(currentMusic?.audio ?? null)
    currentMusic = null
  }

  return {
    play(id, options) {
      if (muted) return
      const audio = make(id)
      if (!audio) return
      safeSetVolume(audio, SOUND_VOLUMES[id])
      if (options?.rate) {
        audio.preservesPitch = false
        audio.playbackRate = options.rate
      }
      safePlay(audio)
    },
    loop(id) {
      if (current?.id === id) return
      stopLoop()
      if (!id || muted) return
      const audio = make(id)
      current = { id, audio }
      if (!audio) return
      audio.loop = true
      safeSetVolume(audio, SOUND_VOLUMES[id])
      safePlay(audio)
    },
    music(id) {
      if (currentMusic?.id === id) return
      stopMusic()
      if (!id || muted) return
      const audio = make(id)
      currentMusic = { id, audio }
      if (!audio) return
      audio.loop = true
      safeSetVolume(audio, SOUND_VOLUMES[id])
      safePlay(audio)
    },
    setMuted(next) {
      muted = next
      saveMuted(next)
      if (next) {
        stopLoop()
        stopMusic()
      }
    },
    isMuted: () => muted,
  }
}

/**
 * Web Audio backend: downloads and decodes every sound once, then plays it from memory,
 * so a click sounds right away. Until a file is ready it falls back to an <audio> element.
 */
export function webAudioFactory(
  ctx: AudioContext,
  load: (src: string) => Promise<ArrayBuffer>,
  fallback: (src: string) => AudioLike,
): (src: string) => AudioLike {
  const buffers = new Map<string, AudioBuffer>()
  for (const src of Object.values(SOUND_FILES)) {
    load(src)
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => buffers.set(src, buffer))
      .catch(() => {})
  }

  return (src) => {
    const buffer = buffers.get(src)
    if (!buffer) return fallback(src)
    let source: AudioBufferSourceNode | null = null
    const handle: AudioLike = {
      loop: false,
      volume: 1,
      playbackRate: 1,
      currentTime: 0,
      play() {
        if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
        const gain = ctx.createGain()
        gain.gain.value = handle.volume
        source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = handle.loop
        source.playbackRate.value = handle.playbackRate
        source.connect(gain).connect(ctx.destination)
        source.start()
      },
      pause() {
        source?.stop()
        source = null
      },
    }
    return handle
  }
}

function browserAudio(): (src: string) => AudioLike {
  const htmlAudio = (src: string) => new Audio(src)
  try {
    if (typeof AudioContext === 'undefined' || typeof fetch === 'undefined') return htmlAudio
    const load = (src: string) =>
      fetch(src).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(src))))
    return webAudioFactory(new AudioContext(), load, htmlAudio)
  } catch {
    return htmlAudio
  }
}

/** The one player the game uses (real browser audio). */
export const sound = createSoundPlayer(browserAudio(), readMuted())

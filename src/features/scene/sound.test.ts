// US4 (Dev C) — FR-011: sound feedback that never breaks the game when audio is blocked.
import { describe, expect, it, vi } from 'vitest'
import type { GameState } from '../../engine/types'
import {
  createSoundPlayer,
  seasonMusic,
  soundscape,
  SOUND_FILES,
  SOUND_VOLUMES,
  webAudioFactory,
  type AudioLike,
} from './sound'

/** Fake AudioContext: records which buffers start playing. */
function fakeContext() {
  const started: unknown[] = []
  const ctx = {
    state: 'running',
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    decodeAudioData: vi.fn((data: ArrayBuffer) => Promise.resolve({ decodedFrom: data })),
    createGain: () => ({ gain: { value: 1 }, connect: (node: unknown) => node }),
    createBufferSource: () => {
      const source = {
        buffer: null as unknown,
        loop: false,
        playbackRate: { value: 1 },
        connect: (node: unknown) => node,
        start: vi.fn(() => started.push(source.buffer)),
        stop: vi.fn(),
      }
      return source
    },
  }
  return { ctx: ctx as unknown as AudioContext, started }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

function fakeAudio(play: () => Promise<void> = () => Promise.resolve()) {
  const made: Array<AudioLike & { src: string }> = []
  const make = (src: string) => {
    const a = {
      src,
      loop: false,
      volume: 1,
      playbackRate: 1,
      currentTime: 0,
      play: vi.fn(play),
      pause: vi.fn(),
    }
    made.push(a)
    return a
  }
  return { make, made }
}

const quiet = { radiationStorm: null, activeEvents: [] } as unknown as GameState

describe('sound player', () => {
  it('does not throw when the browser has no audio at all', () => {
    const player = createSoundPlayer(() => {
      throw new Error('Audio is not defined')
    })
    expect(() => player.play('place-structure')).not.toThrow()
    expect(() => player.loop('radiation-alarm')).not.toThrow()
    expect(() => player.loop(null)).not.toThrow()
  })

  it('swallows a play() blocked by the browser autoplay policy', async () => {
    const audio = fakeAudio(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')))
    const player = createSoundPlayer(audio.make)
    expect(() => player.play('bolt-click')).not.toThrow()
    // Let the rejected promise settle: it must not become an unhandled rejection.
    await Promise.resolve()
    expect(audio.made[0]!.play).toHaveBeenCalled()
  })

  it('plays the file named for each sound', () => {
    const audio = fakeAudio()
    const player = createSoundPlayer(audio.make)
    player.play('repair-success')
    expect(audio.made[0]!.src).toBe(SOUND_FILES['repair-success'])
    expect(SOUND_FILES['repair-success']).toMatch(/^\/audio\/repair-success\./)
  })

  it('stays silent while muted and keeps the choice', () => {
    const audio = fakeAudio()
    const player = createSoundPlayer(audio.make)
    player.setMuted(true)
    player.play('select-structure')
    player.loop('dust-storm-loop')
    expect(
      audio.made.every((a) => (a.play as ReturnType<typeof vi.fn>).mock.calls.length === 0),
    ).toBe(true)
    expect(player.isMuted()).toBe(true)
  })

  it('muting stops a loop that is already playing', () => {
    const audio = fakeAudio()
    const player = createSoundPlayer(audio.make)
    player.loop('radiation-alarm')
    player.setMuted(true)
    expect(audio.made[0]!.pause).toHaveBeenCalled()
  })

  it('keeps one loop at a time: a new loop stops the old one', () => {
    const audio = fakeAudio()
    const player = createSoundPlayer(audio.make)
    player.loop('radiation-alarm')
    player.loop('radiation-storm-loop')
    expect(audio.made[0]!.pause).toHaveBeenCalled()
    expect(audio.made[1]!.loop).toBe(true)
    player.loop(null)
    expect(audio.made[1]!.pause).toHaveBeenCalled()
  })

  it('asking for the loop that is already playing does not restart it', () => {
    const audio = fakeAudio()
    const player = createSoundPlayer(audio.make)
    player.loop('dust-storm-loop')
    player.loop('dust-storm-loop')
    expect(audio.made).toHaveLength(1)
    expect(audio.made[0]!.play).toHaveBeenCalledTimes(1)
  })
})

describe('soundscape (which loop the base should hear)', () => {
  it('is silent on a calm day', () => {
    expect(soundscape(quiet)).toBeNull()
  })

  it('plays the alarm during the radiation warning', () => {
    const game = { ...quiet, radiationStorm: { phase: 'warning', phaseEndsAt: 10, basedOn: null } }
    expect(soundscape(game as GameState)).toBe('radiation-alarm')
  })

  it('plays the radiation storm while it hits', () => {
    const game = { ...quiet, radiationStorm: { phase: 'active', phaseEndsAt: 30, basedOn: null } }
    expect(soundscape(game as GameState)).toBe('radiation-storm-loop')
  })

  it('plays the wind during a local or global dust storm', () => {
    for (const kind of ['dust_storm', 'global_dust_storm']) {
      const game = { ...quiet, activeEvents: [{ kind }] }
      expect(soundscape(game as unknown as GameState)).toBe('dust-storm-loop')
    }
  })

  it('a radiation storm is louder than the dust: it wins', () => {
    const game = {
      ...quiet,
      activeEvents: [{ kind: 'dust_storm' }],
      radiationStorm: { phase: 'warning', phaseEndsAt: 10, basedOn: null },
    }
    expect(soundscape(game as unknown as GameState)).toBe('radiation-alarm')
  })

  it('ignores events that are not storms', () => {
    const game = { ...quiet, activeEvents: [{ kind: 'cold' }, { kind: 'dust_devil' }] }
    expect(soundscape(game as unknown as GameState)).toBeNull()
  })
})

describe('web audio backend (starts without delay)', () => {
  it('plays a preloaded sound from memory, without creating an <audio> element', async () => {
    const { ctx, started } = fakeContext()
    const fallback = vi.fn()
    const make = webAudioFactory(ctx, () => Promise.resolve(new ArrayBuffer(8)), fallback)
    await settle()
    make(SOUND_FILES['select-structure']).play()
    expect(started).toHaveLength(1)
    expect(fallback).not.toHaveBeenCalled()
  })

  it('uses an <audio> element while the file is still loading', () => {
    const { ctx } = fakeContext()
    const fallback = vi.fn(() => ({ play: vi.fn(), pause: vi.fn() }) as unknown as AudioLike)
    const make = webAudioFactory(ctx, () => new Promise(() => {}), fallback)
    make(SOUND_FILES['select-structure'])
    expect(fallback).toHaveBeenCalledWith(SOUND_FILES['select-structure'])
  })

  it('a file that fails to load does not break anything', async () => {
    const { ctx } = fakeContext()
    const fallback = vi.fn(() => ({ play: vi.fn(), pause: vi.fn() }) as unknown as AudioLike)
    const make = webAudioFactory(ctx, () => Promise.reject(new Error('404')), fallback)
    await settle()
    expect(() => make(SOUND_FILES['bolt-click']).play()).not.toThrow()
  })

  it('a loop can be stopped', async () => {
    const { ctx } = fakeContext()
    const make = webAudioFactory(ctx, () => Promise.resolve(new ArrayBuffer(8)), vi.fn())
    await settle()
    const alarm = make(SOUND_FILES['radiation-alarm'])
    alarm.loop = true
    alarm.play()
    expect(() => alarm.pause()).not.toThrow()
  })
})

describe('season music', () => {
  it('maps each Mars season to its /audio/season-*.ogg file', () => {
    expect(seasonMusic('spring')).toBe('season-spring')
    expect(seasonMusic('summer')).toBe('season-summer')
    expect(seasonMusic('autumn')).toBe('season-autumn')
    expect(seasonMusic('winter')).toBe('season-winter')
    expect(SOUND_FILES['season-spring']).toBe('/audio/season-spring.ogg')
    expect(SOUND_FILES['season-summer']).toBe('/audio/season-summer.ogg')
    expect(SOUND_FILES['season-autumn']).toBe('/audio/season-autumn.ogg')
    expect(SOUND_FILES['season-winter']).toBe('/audio/season-winter.ogg')
  })

  it('switches tracks on season change and does not restart the same track', () => {
    const audio = fakeAudio()
    const player = createSoundPlayer(audio.make)
    player.music('season-spring')
    player.music('season-spring')
    expect(audio.made).toHaveLength(1)
    expect(audio.made[0]!.loop).toBe(true)
    expect(audio.made[0]!.play).toHaveBeenCalledTimes(1)

    player.music('season-summer')
    expect(audio.made[0]!.pause).toHaveBeenCalledTimes(1)
    expect(audio.made).toHaveLength(2)
    expect(audio.made[1]!.src).toBe('/audio/season-summer.ogg')
    expect(audio.made[1]!.loop).toBe(true)

    player.music(null)
    expect(audio.made[1]!.pause).toHaveBeenCalledTimes(1)
  })

  it('coexists with weather/alarm loops and stops both when muted', () => {
    const audio = fakeAudio()
    const player = createSoundPlayer(audio.make)
    player.music('season-autumn')
    player.loop('radiation-alarm')
    expect(audio.made).toHaveLength(2)
    expect(audio.made[0]!.pause).not.toHaveBeenCalled()
    expect(audio.made[1]!.pause).not.toHaveBeenCalled()

    player.setMuted(true)
    expect(audio.made[0]!.pause).toHaveBeenCalledTimes(1)
    expect(audio.made[1]!.pause).toHaveBeenCalledTimes(1)

    player.music('season-winter')
    expect(audio.made).toHaveLength(2)
  })
})

describe('sound volumes', () => {
  it('defines boosted volumes for build, alarm, dust storm, moderate boost for radiation storm, and balanced music', () => {
    expect(SOUND_VOLUMES['place-structure']).toBe(1.7)
    expect(SOUND_VOLUMES['radiation-alarm']).toBe(1.5)
    expect(SOUND_VOLUMES['dust-storm-loop']).toBe(1.35)
    expect(SOUND_VOLUMES['radiation-storm-loop']).toBe(0.75)
    expect(SOUND_VOLUMES['season-spring']).toBe(0.35)
    expect(SOUND_VOLUMES['season-summer']).toBe(0.35)
    expect(SOUND_VOLUMES['season-autumn']).toBe(0.35)
    expect(SOUND_VOLUMES['season-winter']).toBe(0.35)
    expect(SOUND_VOLUMES['select-structure']).toBe(1)
  })

  it('applies full gain in Web Audio and never throws on HTMLAudioElement when gain > 1', async () => {
    const gains: number[] = []
    const { ctx } = fakeContext()
    const origCreateGain = ctx.createGain.bind(ctx)
    ctx.createGain = () => {
      const g = origCreateGain()
      return new Proxy(g, {
        set(target, prop, value) {
          if (prop === 'value') gains.push(value)
          return Reflect.set(target, prop, value)
        },
        get(target, prop) {
          if (prop === 'gain') {
            return new Proxy(target.gain, {
              set(t, p, v) {
                if (p === 'value') gains.push(v)
                return Reflect.set(t, p, v)
              },
            })
          }
          return Reflect.get(target, prop)
        },
      })
    }

    const webPlayer = createSoundPlayer(
      webAudioFactory(ctx, () => Promise.resolve(new ArrayBuffer(8)), vi.fn()),
    )
    await settle()
    webPlayer.play('place-structure')
    webPlayer.loop('radiation-alarm')
    webPlayer.music('season-spring')
    expect(gains).toEqual([1.7, 1.5, 0.35])

    // HTMLAudioElement throws IndexSizeError if volume > 1; verify clamping
    const strictMake = (src: string): AudioLike => {
      let vol = 1
      return {
        src,
        loop: false,
        playbackRate: 1,
        currentTime: 0,
        get volume() {
          return vol
        },
        set volume(v: number) {
          if (v < 0 || v > 1) throw new DOMException('volume out of range', 'IndexSizeError')
          vol = v
        },
        play: vi.fn(),
        pause: vi.fn(),
      } as AudioLike & { src: string }
    }
    const htmlPlayer = createSoundPlayer(strictMake)
    expect(() => htmlPlayer.play('place-structure')).not.toThrow()
    expect(() => htmlPlayer.loop('dust-storm-loop')).not.toThrow()
  })
})

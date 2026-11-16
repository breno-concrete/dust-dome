// CONTRACT FILE. Owner: Breno (backups: Dev B, Dev C).
// The only bridge between React (2D UI, 3D scene) and the engine.
// - 2D UI (Dev B), debrief/sources (Dev A) read state and call the game actions.
// - 3D scene and QTE (Dev C) may only call: hoverAt, placeAt, selectStructure, finishQte.
// Components never import src/engine or src/data directly.
import { create } from 'zustand'
import { config } from '../config/loadConfig'
import * as actions from '../engine/actions'
import { createGame, tick } from '../engine/game'
import type {
  ActionError,
  ActionResult,
  GameState,
  PowerMode,
  StructureTypeId,
  Tile,
  UpgradeId,
} from '../engine/types'

export type Screen = 'title' | 'game' | 'end' | 'sources'
export type Speed = 0 | 1 | 2 | 4

export interface GameStore {
  screen: Screen
  game: GameState | null
  /** 0 = paused. Game seconds per real second. */
  speed: Speed
  /** Structure type being placed on the grid (build menu -> scene). */
  placing: StructureTypeId | null
  hoverTile: Tile | null
  selectedStructureId: string | null
  /** Structure whose repair QTE is open. */
  qteFor: string | null
  lastError: ActionError | null

  start: (seed?: number) => void
  /** Called by the loop with real seconds elapsed. */
  advance: (realSeconds: number) => void
  setSpeed: (speed: Speed) => void
  goTo: (screen: Screen) => void

  beginPlacement: (type: StructureTypeId | null) => void
  hoverAt: (tile: Tile | null) => void
  placeAt: (tile: Tile) => void
  selectStructure: (id: string | null) => void

  setPowerMode: (type: StructureTypeId, mode: PowerMode) => void
  installUpgrade: (structureId: string, upgradeId: UpgradeId) => void
  openQte: (structureId: string) => void
  finishQte: (success: boolean) => void
  clean: (structureId: string) => void
  /** Demolish a structure or cancel its construction (refund when the job ends). */
  demolish: (structureId: string) => void
  /** Crew panel: bring one astronaut inside. */
  bringInside: (astronautId: string) => void
  /** Crew panel "everyone inside" and the radiation alarm's "Take shelter". */
  bringAllInside: () => void
  /** "Resume" on a structure whose jobs were paused by bringInside / bringAllInside. */
  resumeJobs: (structureId: string) => void
  /** @deprecated Same as bringAllInside; kept so the UI built on contract v1 keeps working. */
  shelterAll: () => void
  dismissBriefing: () => void
}

export const useGameStore = create<GameStore>((set, get) => {
  /** Applies an ActionResult: new state, last error, end screen when the mission ends. */
  const apply = (result: ActionResult) =>
    set({
      game: result.state,
      lastError: result.ok ? null : result.reason,
      screen: result.state.status === 'running' ? get().screen : 'end',
    })

  const withGame = (fn: (game: GameState) => ActionResult) => {
    const game = get().game
    if (game) apply(fn(game))
  }

  return {
    screen: 'title',
    game: null,
    speed: 1,
    placing: null,
    hoverTile: null,
    selectedStructureId: null,
    qteFor: null,
    lastError: null,

    start: (seed = Date.now()) =>
      set({
        screen: 'game',
        game: createGame(config, seed),
        speed: 1,
        placing: null,
        hoverTile: null,
        selectedStructureId: null,
        qteFor: null,
        lastError: null,
      }),

    advance: (realSeconds) => {
      const { game, speed, screen } = get()
      if (!game || speed === 0 || screen !== 'game') return
      const next = tick(game, config, realSeconds * speed)
      if (next === game) return
      // The radiation alarm gives 10 game seconds: when it starts, a fast game drops to 1× so the
      // player has all of them (constitution VI). The player may speed up again.
      const alarmStarted = !game.radiationStorm && next.radiationStorm !== null
      set({
        game: next,
        screen: next.status === 'running' ? 'game' : 'end',
        speed: alarmStarted && speed > 1 ? 1 : speed,
      })
    },

    setSpeed: (speed) => set({ speed }),
    goTo: (screen) => set({ screen }),

    beginPlacement: (type) => set({ placing: type, selectedStructureId: null, lastError: null }),
    hoverAt: (tile) => set({ hoverTile: tile }),
    placeAt: (tile) => {
      const type = get().placing
      if (!type) return
      withGame((g) => actions.build(g, config, type, tile))
      if (!get().lastError) set({ placing: null })
    },
    selectStructure: (id) => {
      // A click on a structure while placing is a click on a taken tile: the placement goes on.
      if (id && get().placing) set({ lastError: 'tile_blocked' })
      else set({ selectedStructureId: id, placing: null, lastError: null })
    },

    setPowerMode: (type, mode) => withGame((g) => actions.setPowerMode(g, config, type, mode)),
    installUpgrade: (structureId, upgradeId) =>
      withGame((g) => actions.installUpgrade(g, config, structureId, upgradeId)),
    openQte: (structureId) => set({ qteFor: structureId }),
    finishQte: (success) => {
      const id = get().qteFor
      set({ qteFor: null })
      if (!id) return
      withGame((g) => actions.startRepair(g, config, id, success))
      // A lost repair game costs the parts (II.10): say so instead of failing in silence.
      if (!success && !get().lastError) set({ lastError: 'repair_failed' })
    },
    clean: (structureId) => withGame((g) => actions.clean(g, config, structureId)),
    demolish: (structureId) => withGame((g) => actions.demolish(g, config, structureId)),
    bringInside: (astronautId) => withGame((g) => actions.bringInside(g, config, astronautId)),
    bringAllInside: () => withGame((g) => actions.bringAllInside(g, config)),
    resumeJobs: (structureId) => withGame((g) => actions.resumeJobs(g, config, structureId)),
    shelterAll: () => get().bringAllInside(),
    dismissBriefing: () => withGame((g) => actions.dismissBriefing(g)),
  }
})

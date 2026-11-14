// Owner: Breno. Loads the POs' JSON files and validates them once at startup.
import { GameConfigSchema, type GameConfig } from './schema'
import resources from './resources.json'
import structures from './structures.json'
import upgrades from './upgrades.json'
import seasons from './seasons.json'
import events from './events.json'
import mission from './mission.json'
import narrator from './narrator.json'

export const config: GameConfig = GameConfigSchema.parse({
  resources,
  structures,
  upgrades,
  seasons,
  events,
  mission,
  narrator,
})

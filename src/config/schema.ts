// CONTRACT FILE. Owner: Breno (backup: Dev A). Constitution Part II.15.
// Shape of every JSON file in src/config/. The POs edit the JSON; this schema and
// config.test.ts make CI fail when an edit breaks the game.
import { z } from 'zod'

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
export const SeasonIdSchema = z.enum(SEASONS)
export type SeasonId = z.infer<typeof SeasonIdSchema>

/** English is mandatory (Space Apps rule); Portuguese is optional. */
export const LocalizedTextSchema = z.object({
  en: z.string().min(1),
  pt: z.string().optional(),
})

export const DataSourceSchema = z.object({
  label: z.string().min(1),
  url: z.url(),
  /** real = a real value; scaled = real value scaled to game time; simplification = game rule. */
  kind: z.enum(['real', 'scaled', 'simplification', 'game_value']),
})

/** A per-season amount, e.g. { "hematite": 25, "regolith": 20 }. */
const AmountsSchema = z.record(z.string(), z.number().nonnegative())

/** kW by season, one row per cycle ("1".."4"). */
const SeasonKwSchema = z.object({
  spring: z.number().nonnegative(),
  summer: z.number().nonnegative(),
  autumn: z.number().nonnegative(),
  winter: z.number().nonnegative(),
})
const CycleSeasonTableSchema = z.object({
  '1': SeasonKwSchema,
  '2': SeasonKwSchema,
  '3': SeasonKwSchema,
  '4': SeasonKwSchema,
})

// ---------- resources.json ----------
export const ResourceDefSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['material', 'vital']),
  name: LocalizedTextSchema,
  explain: LocalizedTextSchema,
  icon: z.string().min(1),
  start: z.number().nonnegative(),
})

// ---------- structures.json ----------
export const PowerSchema = z.discriminatedUnion('kind', [
  /** Draws minKw in "min" mode and maxKw in "max" mode (before heating). */
  z.object({ kind: z.literal('consumer'), minKw: z.number(), maxKw: z.number() }),
  /** Produces kW by season (0 in winter darkness, see seasons.json). */
  z.object({ kind: z.literal('solar'), kwBySeason: SeasonKwSchema }),
  /** Produces a constant kW, unaffected by anything. */
  z.object({ kind: z.literal('constant'), kw: z.number() }),
  /** Stores energy units (1 EU = 1 kW for 1 game second). */
  z.object({ kind: z.literal('storage'), capacityEu: z.number().positive() }),
])

export const StructureDefSchema = z.object({
  id: z.string().min(1),
  name: LocalizedTextSchema,
  /** Educational fact sheet shown in the build menu. */
  explain: LocalizedTextSchema,
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  cost: AmountsSchema,
  /** Tiles per side: 1 = 1x1, 2 = 2x2. */
  size: z.union([z.literal(1), z.literal(2)]),
  power: PowerSchema,
  /** Has an Off/Min/Max switch (per structure type). */
  switchable: z.boolean(),
  /** Per season, by power mode. */
  outputs: z.object({ min: AmountsSchema, max: AmountsSchema }).optional(),
  inputs: z.object({ min: AmountsSchema, max: AmountsSchema }).optional(),
  /** Heating demand in "min" mode by cycle and season; replaces power.minKw. */
  heatingKw: CycleSeasonTableSchema.optional(),
  /** Same table when the thermal insulation upgrade is installed. */
  insulatedHeatingKw: CycleSeasonTableSchema.optional(),
  /** People it houses. */
  capacity: z.number().int().nonnegative().optional(),
  upgrades: z.array(z.string()).default([]),
  source: DataSourceSchema.optional(),
})

// ---------- upgrades.json ----------
export const UpgradeDefSchema = z.object({
  id: z.string().min(1),
  name: LocalizedTextSchema,
  explain: LocalizedTextSchema,
  effect: z.enum(['insulation', 'radiation_shelter', 'dust_filters']),
  cost: AmountsSchema,
  source: DataSourceSchema.optional(),
})

// ---------- seasons.json ----------
export const SeasonDefSchema = z.object({
  id: SeasonIdSchema,
  name: LocalizedTextSchema,
  explain: LocalizedTextSchema,
  /** Real length in sols (southern hemisphere). */
  sols: z.number().positive(),
  /** Duration at 1x speed. */
  durationSeconds: z.number().positive(),
})

export const SeasonsConfigSchema = z.object({
  cycles: z.number().int().positive(),
  seasons: z.array(SeasonDefSchema).length(4),
  /** From this cycle on, winter is in total darkness (solar = 0). */
  winterDarknessFromCycle: z.number().int().positive(),
  source: DataSourceSchema,
})

// ---------- events.json ----------
export const EventEffectsSchema = z.object({
  /** Number of solar panels damaged per occurrence. */
  damagePanels: z.number().int().nonnegative().optional(),
  /** Multiplies solar output while active (0.6 = -40%). */
  solarFactor: z.number().min(0).max(1).optional(),
  /** Structure types clogged per occurrence. */
  clog: z.array(z.string()).optional(),
  /** Chance (0..1) that the clog happens on each occurrence. */
  clogChance: z.number().min(0).max(1).optional(),
  /** While active, every N seconds one of these types short-circuits. */
  shortCircuitEverySeconds: z.number().positive().optional(),
  shortCircuit: z.array(z.string()).optional(),
  /** External jobs are blocked while active. */
  blocksExternalJobs: z.boolean().optional(),
})

export const EventRuleSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['dust_devil', 'dust_storm', 'global_dust_storm', 'cold', 'darkness']),
  cycles: z.array(z.number().int().positive()).min(1),
  season: SeasonIdSchema,
  /** Seconds between occurrences [min, max]; absent = lasts the whole season. */
  intervalSeconds: z.tuple([z.number().positive(), z.number().positive()]).optional(),
  /** Seconds each occurrence stays active; absent = instantaneous (or whole season). */
  durationSeconds: z.number().positive().optional(),
  effects: EventEffectsSchema,
  name: LocalizedTextSchema,
  explain: LocalizedTextSchema,
  source: DataSourceSchema,
})

// ---------- mission.json ----------
export const MissionConfigSchema = z.object({
  crew: z.number().int().positive(),
  colonists: z.number().int().nonnegative(),
  /** Per person per season. */
  needs: z.object({ oxygen: z.number(), water: z.number(), food: z.number() }),
  grid: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  startingStructures: z.array(
    z.object({ type: z.string(), tile: z.tuple([z.number().int(), z.number().int()]) }),
  ),
  jobs: z.object({
    buildSeconds: z.number().positive(),
    upgradeSeconds: z.number().positive(),
    repairSeconds: z.number().positive(),
    cleanSeconds: z.number().positive(),
  }),
  exposure: z.object({
    /** 100% exposure after this share of the current season spent outside. */
    maxShareOfSeason: z.number().positive(),
    /** Recovery inside, relative to the accrual speed. */
    recoveryRate: z.number().positive(),
    warnAt: z.number().min(0).max(1),
  }),
  emptyReserve: z.object({
    graceSeconds: z.number().nonnegative(),
    deathEverySeconds: z.number().positive(),
  }),
  damage: z.object({
    damagedFactor: z.number().min(0).max(1),
    cloggedFactor: z.number().min(0).max(1),
  }),
  repair: z.object({
    parts: z.number().int().nonnegative(),
    qteBolts: z.number().int().positive(),
    qteSeconds: z.number().positive(),
  }),
  /** Structure types switched off first when power runs out. */
  brownoutOrder: z.array(z.string()),
  insulationRequiredFromCycle: z.number().int().positive(),
  /** Cycle 4 = cycle 3 with intervals multiplied by this factor. */
  finalCycleIntervalFactor: z.number().positive(),
  radiationStorm: z.object({
    fromCycle: z.number().int().positive(),
    perCycle: z.number().int().nonnegative(),
    seasons: z.array(SeasonIdSchema),
    warningSeconds: z.number().positive(),
    durationSeconds: z.number().positive(),
    source: DataSourceSchema,
  }),
})

export const GameConfigSchema = z.object({
  resources: z.array(ResourceDefSchema),
  structures: z.array(StructureDefSchema),
  upgrades: z.array(UpgradeDefSchema),
  seasons: SeasonsConfigSchema,
  events: z.array(EventRuleSchema),
  mission: MissionConfigSchema,
})

export type LocalizedText = z.infer<typeof LocalizedTextSchema>
export type DataSource = z.infer<typeof DataSourceSchema>
export type ResourceDef = z.infer<typeof ResourceDefSchema>
export type StructureDef = z.infer<typeof StructureDefSchema>
export type UpgradeDef = z.infer<typeof UpgradeDefSchema>
export type SeasonDef = z.infer<typeof SeasonDefSchema>
export type EventRule = z.infer<typeof EventRuleSchema>
export type MissionConfig = z.infer<typeof MissionConfigSchema>
export type GameConfig = z.infer<typeof GameConfigSchema>

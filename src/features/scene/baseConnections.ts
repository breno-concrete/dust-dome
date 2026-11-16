// Owner: Dev C. Pure geometry layout computation for modular habitat corridors
// and trail-side power + oxygen utility conduits.
import type { GameConfig, StructureInstance } from '../../engine/types'
import { tileCenter, type Grid } from './iso'

export interface TrailStripSpec {
  x: number
  z: number
  lenX: number
  lenZ: number
  axis: 'x' | 'z'
  length: number
}

export interface JunctionNodeSpec {
  x: number
  z: number
}

export interface HabitatCorridorSpec {
  id: string
  x: number
  z: number
  axis: 'x' | 'z'
  length: number
  /** 'seal' when habitats touch directly (gap 0); 'bridge' for pressurized 1-tile corridor. */
  kind: 'seal' | 'bridge'
}

export interface ConduitLineSpec {
  kind: 'power' | 'oxygen'
  x: number
  z: number
  lenX: number
  lenZ: number
  axis: 'x' | 'z'
  active: boolean
}

export interface ConduitNodeSpec {
  x: number
  z: number
  hasPower: boolean
  hasOxygen: boolean
}

const MAX_HABITAT_CORRIDOR_GAP = 1.05
const MAX_CORRIDOR_AXIS_OFFSET = 0.55

/**
 * Find nearby structure pairs configured via `connectsTo` (habitats) that sit
 * edge-to-edge (`gap === 0`) or across a clear 1-tile gap (`gap <= 1`) on X or Z.
 */
export function computeHabitatCorridors(
  structures: ReadonlyArray<StructureInstance>,
  config: Pick<GameConfig, 'structures'>,
  grid: Grid,
): HabitatCorridorSpec[] {
  const defById = new Map(config.structures.map((d) => [d.id, d]))

  const rects = structures.map((s) => {
    const def = defById.get(s.type)
    const size = def?.size ?? 1
    const [cx, , cz] = tileCenter(s.tile, size, grid)
    return {
      instance: s,
      size,
      half: size * 0.5,
      cx,
      cz,
      connectsTo: new Set(def?.connectsTo ?? []),
    }
  })

  const corridors: HabitatCorridorSpec[] = []
  const seenPairs = new Set<string>()

  for (let i = 0; i < rects.length; i++) {
    const a = rects[i]!
    if (a.connectsTo.size === 0) continue

    for (let j = i + 1; j < rects.length; j++) {
      const b = rects[j]!
      if (!a.connectsTo.has(b.instance.type) || !b.connectsTo.has(a.instance.type)) continue

      const pairKey =
        a.instance.id < b.instance.id
          ? `${a.instance.id}::${b.instance.id}`
          : `${b.instance.id}::${a.instance.id}`
      if (seenPairs.has(pairKey)) continue

      const dx = Math.abs(a.cx - b.cx)
      const dz = Math.abs(a.cz - b.cz)
      const gapX = dx - (a.half + b.half)
      const gapZ = dz - (a.half + b.half)

      let axis: 'x' | 'z' | null = null
      let gap = Infinity
      if (gapX >= -0.05 && gapX <= MAX_HABITAT_CORRIDOR_GAP && dz <= MAX_CORRIDOR_AXIS_OFFSET) {
        axis = 'x'
        gap = Math.max(0, gapX)
      } else if (
        gapZ >= -0.05 &&
        gapZ <= MAX_HABITAT_CORRIDOR_GAP &&
        dx <= MAX_CORRIDOR_AXIS_OFFSET
      ) {
        axis = 'z'
        gap = Math.max(0, gapZ)
      }
      if (!axis) continue

      const midX = (a.cx + b.cx) * 0.5
      const midZ = (a.cz + b.cz) * 0.5
      // Ensure no third structure occupies the gap corridor between a and b
      const blocked = rects.some((other) => {
        if (other === a || other === b) return false
        const spanX = axis === 'x' ? Math.max(0.2, gap * 0.5) : 0.45
        const spanZ = axis === 'z' ? Math.max(0.2, gap * 0.5) : 0.45
        return (
          Math.abs(other.cx - midX) < other.half + spanX - 0.05 &&
          Math.abs(other.cz - midZ) < other.half + spanZ - 0.05
        )
      })
      if (blocked) continue

      seenPairs.add(pairKey)
      const kind: 'seal' | 'bridge' = gap < 0.15 ? 'seal' : 'bridge'
      // Habitat octagonal dome walls sit ~0.46 inward from the 2x2 footprint boundary (~0.54 from center),
      // so span across gap + both hull setbacks (0.48 each side) to seat cleanly into both domes.
      const span = gap + 0.96
      const anchorX =
        axis === 'x'
          ? a.cx < b.cx
            ? (a.cx + a.half + (b.cx - b.half)) * 0.5
            : (b.cx + b.half + (a.cx - a.half)) * 0.5
          : midX
      const anchorZ =
        axis === 'z'
          ? a.cz < b.cz
            ? (a.cz + a.half + (b.cz - b.half)) * 0.5
            : (b.cz + b.half + (a.cz - a.half)) * 0.5
          : midZ

      corridors.push({
        id: pairKey,
        x: anchorX,
        z: anchorZ,
        axis,
        length: span,
        kind,
      })
    }
  }

  return corridors
}

const CONDUIT_SHOULDER_OFFSET = 0.145
const CABLE_THICKNESS = 0.024
const PIPE_THICKNESS = 0.032

/**
 * Compute trail-side power cable (shoulder +) and oxygen conduit pipe (shoulder -)
 * specifications tracking every base pathway strip and intersection hub.
 */
export function computeConduitRuns(
  strips: ReadonlyArray<TrailStripSpec>,
  junctions: ReadonlyArray<JunctionNodeSpec>,
  structures: ReadonlyArray<StructureInstance>,
  config: Pick<GameConfig, 'structures'>,
): { lines: ConduitLineSpec[]; nodes: ConduitNodeSpec[] } {
  const defById = new Map(config.structures.map((d) => [d.id, d]))
  const hasPower = structures.some((s) => {
    const kind = defById.get(s.type)?.power.kind
    return (
      s.status !== 'building' && (kind === 'solar' || kind === 'constant' || kind === 'storage')
    )
  })
  const hasOxygen = structures.some(
    (s) => s.status !== 'building' && (s.type === 'oxygen_generator' || s.type === 'habitat'),
  )

  const lines: ConduitLineSpec[] = []
  for (const strip of strips) {
    if (strip.length < 0.08) continue
    const span = strip.length + 0.08

    if (strip.axis === 'x') {
      lines.push({
        kind: 'power',
        x: strip.x,
        z: strip.z + CONDUIT_SHOULDER_OFFSET,
        lenX: span,
        lenZ: CABLE_THICKNESS,
        axis: 'x',
        active: hasPower,
      })
      lines.push({
        kind: 'oxygen',
        x: strip.x,
        z: strip.z - CONDUIT_SHOULDER_OFFSET,
        lenX: span,
        lenZ: PIPE_THICKNESS,
        axis: 'x',
        active: hasOxygen,
      })
    } else {
      lines.push({
        kind: 'power',
        x: strip.x + CONDUIT_SHOULDER_OFFSET,
        z: strip.z,
        lenX: CABLE_THICKNESS,
        lenZ: span,
        axis: 'z',
        active: hasPower,
      })
      lines.push({
        kind: 'oxygen',
        x: strip.x - CONDUIT_SHOULDER_OFFSET,
        z: strip.z,
        lenX: PIPE_THICKNESS,
        lenZ: span,
        axis: 'z',
        active: hasOxygen,
      })
    }
  }

  const nodes: ConduitNodeSpec[] = junctions.map((j) => ({
    x: j.x,
    z: j.z,
    hasPower,
    hasOxygen,
  }))

  return { lines, nodes }
}

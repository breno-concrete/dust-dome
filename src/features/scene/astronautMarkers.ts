// Owner: Dev C. Pure straight-line astronaut EVA waypoint & interpolation math (US4).
// Keeps all filtering, color assignment, and coordinate math testable outside R3F.
import type { GameConfig, GameState, JobKind, StructureInstance } from '../../engine/types'
import { tileCenter, type Grid } from './iso'

/** Game-palette accent colors so each EVA astronaut is distinctly identifiable. */
export const ASTRONAUT_ACCENT_PALETTE = [
  '#ff7a29', // Safety orange (primary colonial accent)
  '#63c5da', // Water cyan
  '#5bd6a0', // Hydroponic mint green
  '#ffb347', // Solar amber gold
  '#e86f92', // Medical telemetry rose
  '#9fa8ff', // Orbital indigo
] as const

export type WorldPoint = readonly [x: number, y: number, z: number]

export interface AstronautWaypoint {
  id: string
  name: string
  color: string
  from: WorldPoint
  to: WorldPoint
  path: ReadonlyArray<WorldPoint>
  jobKind: JobKind | null
  phaseOffset: number
}

/** Deterministically pick a game-palette accent color per astronaut. */
export function astronautAccentColor(astronautId: string, index: number): string {
  const suffixMatch = /(\d+)$/.exec(astronautId)
  const slot = suffixMatch ? Number(suffixMatch[1]) - 1 : index
  const idx =
    ((slot % ASTRONAUT_ACCENT_PALETTE.length) + ASTRONAUT_ACCENT_PALETTE.length) %
    ASTRONAUT_ACCENT_PALETTE.length
  return ASTRONAUT_ACCENT_PALETTE[idx]!
}

function resolveStructureEdge(
  from: WorldPoint,
  target: StructureInstance,
  targetSize: number,
  grid: Grid,
  lateralSlot: number,
): WorldPoint {
  const [tx, , tz] = tileCenter(target.tile, targetSize, grid)
  const dx = from[0] - tx
  const dz = from[2] - tz
  const dist = Math.hypot(dx, dz)
  const standOff = targetSize * 0.48 + 0.14
  if (dist < 1e-4) {
    return [tx + standOff, 0, tz + lateralSlot * 0.2]
  }
  const nx = dx / dist
  const nz = dz / dist
  // Small perpendicular slot offset so workers on the same target do not overlap
  const px = -nz * lateralSlot * 0.18
  const pz = nx * lateralSlot * 0.18
  return [tx + nx * standOff + px, 0, tz + nz * standOff + pz]
}

interface BlockedBox {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

function buildBlockedBoxes(
  structures: ReadonlyArray<StructureInstance>,
  config: Pick<GameConfig, 'structures'>,
  grid: Grid,
): BlockedBox[] {
  const sizeOf = (type: string) => config.structures.find((d) => d.id === type)?.size ?? 1
  return structures.map((s) => {
    const size = sizeOf(s.type)
    const [cx, , cz] = tileCenter(s.tile, size, grid)
    const half = size * 0.42
    return { minX: cx - half, maxX: cx + half, minZ: cz - half, maxZ: cz + half }
  })
}

function pointBlocked(x: number, z: number, boxes: ReadonlyArray<BlockedBox>): boolean {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i]!
    if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true
  }
  return false
}

function segmentBlocked(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  boxes: ReadonlyArray<BlockedBox>,
): boolean {
  const dist = Math.hypot(bx - ax, bz - az)
  const steps = Math.max(2, Math.ceil(dist / 0.16))
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    if (pointBlocked(ax + (bx - ax) * t, az + (bz - az) * t, boxes)) return true
  }
  return false
}

/**
 * Find an obstacle-avoiding EVA path over a 0.5-unit subgrid around structures,
 * smoothed with line-of-sight string pulling so astronauts follow sensible corridors.
 */
export function findAstronautPath(
  from: WorldPoint,
  to: WorldPoint,
  structures: ReadonlyArray<StructureInstance>,
  config: Pick<GameConfig, 'structures'>,
  grid: Grid,
): WorldPoint[] {
  const boxes = buildBlockedBoxes(structures, config, grid)
  if (!segmentBlocked(from[0], from[2], to[0], to[2], boxes)) {
    return [from, to]
  }

  const step = 0.5
  const cols = grid.width * 2 + 3
  const rows = grid.height * 2 + 3
  const originX = -grid.width / 2 - step
  const originZ = -grid.height / 2 - step
  const total = cols * rows

  const toCell = (wx: number, wz: number): [number, number] => [
    Math.max(0, Math.min(cols - 1, Math.round((wx - originX) / step))),
    Math.max(0, Math.min(rows - 1, Math.round((wz - originZ) / step))),
  ]
  const cellWorld = (c: number, r: number): [number, number] => [
    originX + c * step,
    originZ + r * step,
  ]

  const blocked = new Uint8Array(total)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [wx, wz] = cellWorld(c, r)
      if (pointBlocked(wx, wz, boxes)) blocked[r * cols + c] = 1
    }
  }

  const nearestWalkable = (wx: number, wz: number): number => {
    const [sc, sr] = toCell(wx, wz)
    const startIdx = sr * cols + sc
    if (!blocked[startIdx]) return startIdx
    let bestIdx = startIdx
    let bestDist = Infinity
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nc = sc + dc
        const nr = sr + dr
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue
        const idx = nr * cols + nc
        if (blocked[idx]) continue
        const [cx, cz] = cellWorld(nc, nr)
        const d = Math.hypot(cx - wx, cz - wz)
        if (d < bestDist) {
          bestDist = d
          bestIdx = idx
        }
      }
    }
    blocked[bestIdx] = 0
    return bestIdx
  }

  const start = nearestWalkable(from[0], from[2])
  const goal = nearestWalkable(to[0], to[2])

  const gScore = new Float32Array(total).fill(Infinity)
  const parent = new Int32Array(total).fill(-1)
  const closed = new Uint8Array(total)
  const open: number[] = [start]
  gScore[start] = 0

  const gc = goal % cols
  const gr = Math.floor(goal / cols)
  const [goalWx, goalWz] = cellWorld(gc, gr)

  const DIRS = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ] as const

  let found = false
  while (open.length > 0) {
    let bestPos = 0
    let bestF = Infinity
    for (let i = 0; i < open.length; i++) {
      const idx = open[i]!
      const c = idx % cols
      const r = Math.floor(idx / cols)
      const [wx, wz] = cellWorld(c, r)
      const f = gScore[idx]! + Math.hypot(wx - goalWx, wz - goalWz)
      if (f < bestF) {
        bestF = f
        bestPos = i
      }
    }
    const cur = open.splice(bestPos, 1)[0]!
    if (cur === goal) {
      found = true
      break
    }
    closed[cur] = 1
    const cc = cur % cols
    const cr = Math.floor(cur / cols)

    for (const [dc, dr, cost] of DIRS) {
      const nc = cc + dc
      const nr = cr + dr
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue
      const nIdx = nr * cols + nc
      if (closed[nIdx] || blocked[nIdx]) continue
      if (dc !== 0 && dr !== 0) {
        if (blocked[cr * cols + nc] || blocked[nr * cols + cc]) continue
      }
      const nextG = gScore[cur]! + cost * step
      if (nextG < gScore[nIdx]!) {
        gScore[nIdx] = nextG
        parent[nIdx] = cur
        if (!open.includes(nIdx)) open.push(nIdx)
      }
    }
  }

  if (!found) return [from, to]

  const raw: WorldPoint[] = []
  let trace = goal
  while (trace !== -1) {
    const [wx, wz] = cellWorld(trace % cols, Math.floor(trace / cols))
    raw.push([wx, 0, wz])
    if (trace === start) break
    trace = parent[trace]!
  }
  raw.reverse()

  const full: WorldPoint[] = [from, ...raw, to]
  // String-pulling line-of-sight smoothing
  const smoothed: WorldPoint[] = [full[0]!]
  let anchor = 0
  while (anchor < full.length - 1) {
    let furthest = anchor + 1
    for (let candidate = full.length - 1; candidate > anchor + 1; candidate--) {
      if (
        !segmentBlocked(
          full[anchor]![0],
          full[anchor]![2],
          full[candidate]![0],
          full[candidate]![2],
          boxes,
        )
      ) {
        furthest = candidate
        break
      }
    }
    smoothed.push(full[furthest]!)
    anchor = furthest
  }
  return smoothed
}

/** Compute obstacle-avoiding EVA waypoints for all alive astronauts currently outside. */
export function astronautWaypoints(
  game: Pick<GameState, 'crew' | 'jobs' | 'structures'>,
  config: Pick<GameConfig, 'structures'>,
  grid: Grid,
): AstronautWaypoint[] {
  const structById = new Map(game.structures.map((s) => [s.id, s]))
  const jobById = new Map(game.jobs.map((j) => [j.id, j]))
  const sizeOf = (type: string) => config.structures.find((d) => d.id === type)?.size ?? 1
  const fallbackHab = game.structures.find((s) => s.type === 'habitat') ?? game.structures[0]

  const result: AstronautWaypoint[] = []
  const targetWorkers = new Map<string, number>()

  game.crew.forEach((astronaut, idx) => {
    if (!astronaut.alive || astronaut.location !== 'outside') return

    const home =
      (astronaut.habitatId ? structById.get(astronaut.habitatId) : undefined) ?? fallbackHab
    const homeSize = home ? sizeOf(home.type) : 1
    const homePos: WorldPoint = home ? tileCenter(home.tile, homeSize, grid) : [0, 0, 0]

    const job = astronaut.jobId ? jobById.get(astronaut.jobId) : undefined
    const target = job ? structById.get(job.structureId) : undefined

    // Exit directly at the habitat's +X airlock apron with a small lateral spread
    const lateralExit = ((idx % 3) - 1) * 0.14
    const from: WorldPoint = home
      ? [homePos[0] + homeSize * 0.48 + 0.14, 0, homePos[2] + lateralExit]
      : homePos

    let to: WorldPoint
    if (target) {
      const slotCount = targetWorkers.get(target.id) ?? 0
      targetWorkers.set(target.id, slotCount + 1)
      const centeredSlot =
        slotCount === 0 ? 0 : slotCount % 2 === 1 ? (slotCount + 1) / 2 : -slotCount / 2
      to = resolveStructureEdge(from, target, sizeOf(target.type), grid, centeredSlot)
    } else {
      to = [from[0] + 0.55, 0, from[2] + 0.35]
    }

    const path = findAstronautPath(from, to, game.structures, config, grid)

    result.push({
      id: astronaut.id,
      name: astronaut.name,
      color: astronautAccentColor(astronaut.id, idx),
      from,
      to,
      path,
      jobKind: job?.kind ?? null,
      phaseOffset: idx * 1.15,
    })
  })

  return result
}

/** Pure piecewise-linear interpolation along a waypoint's path with `t` clamped to `[0, 1]`. */
export function astronautPositionAt(
  waypoint: Pick<AstronautWaypoint, 'from' | 'to'> & { path?: ReadonlyArray<WorldPoint> },
  t: number,
): WorldPoint {
  const pts =
    waypoint.path && waypoint.path.length >= 2 ? waypoint.path : [waypoint.from, waypoint.to]
  if (t <= 0) return pts[0]!
  if (t >= 1) return pts[pts.length - 1]!

  let totalLen = 0
  for (let i = 1; i < pts.length; i++) {
    totalLen += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![2] - pts[i - 1]![2])
  }
  if (totalLen < 1e-6) return pts[0]!

  let targetDist = t * totalLen
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    const segLen = Math.hypot(b[0] - a[0], b[2] - a[2])
    if (targetDist <= segLen || i === pts.length - 1) {
      const localT = segLen > 1e-6 ? targetDist / segLen : 1
      return [
        a[0] + (b[0] - a[0]) * localT,
        a[1] + (b[1] - a[1]) * localT,
        a[2] + (b[2] - a[2]) * localT,
      ]
    }
    targetDist -= segLen
  }
  return pts[pts.length - 1]!
}

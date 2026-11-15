import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
  Vector3,
} from 'three'

// Radial warp + high subdivision gives ~0.28-0.55m crisp facets around the 12x12 outpost grid
// and ~1.1-2.0m mountain facets out past the panned zoom=25 horizon (+-128m corners).
const WARP_BASE_SCALE = 18
const WARP_OUTER_SCALE = 56
const MESH_SEGMENTS = 172

const CRATER_SHADOW = '#732c14'
const DEEP_RUST = '#873519'
const CLIFF_SHADOW = '#9c4322'
const PAD_MATCH_GROUND = '#b5532f'
const SUNLIT_SAND = '#c66338'
const RIDGE_OCHRE = '#da7d4c'
const PEAK_LIGHT = '#eea87a'

export interface TerrainProps {
  /** Width of the central buildable outpost grid (default 12). */
  gridWidth?: number
  /** Depth of the central buildable outpost grid (default 12). */
  gridHeight?: number
}

function hash2d(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123
  return s - Math.floor(s)
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** 2D quintic value noise for organic ridge deflection and canyon strata. */
function valueNoise2d(x: number, z: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
  const uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10)

  const a = hash2d(ix, iz)
  const b = hash2d(ix + 1, iz)
  const c = hash2d(ix, iz + 1)
  const d = hash2d(ix + 1, iz + 1)

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz
}

function fbm2d(x: number, z: number, octaves = 3): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2d(x * freq, z * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.05
  }
  return sum / norm
}

function ridgedNoise2d(x: number, z: number, octaves = 2): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(valueNoise2d(x * freq, z * freq) * 2 - 1)
    sum += n * n * amp
    norm += amp
    amp *= 0.5
    freq *= 2.05
  }
  return sum / norm
}

/** Crisp stepped canyon terrace quantizer creating flat shelves and steep cliff risers. */
function terraceQuantize(val: number, step: number, flatRatio = 0.72): number {
  const scaled = val / step
  const base = Math.floor(scaled)
  const frac = scaled - base
  return (base + smoothstep(flatRatio, 1, frac)) * step
}

function warpRadial(ux: number, uz: number): readonly [number, number] {
  const rNorm = Math.min(1.45, Math.hypot(ux, uz))
  const scale = WARP_BASE_SCALE + Math.pow(rNorm, 1.95) * WARP_OUTER_SCALE
  return [ux * scale, uz * scale]
}

interface CraterFeature {
  x: number
  z: number
  radius: number
  depth: number
  rim: number
}

// Cleanly sculpted impact craters with flat-bowled floors and beveled polygonal rims
const CRATERS: readonly CraterFeature[] = [
  // Immediate grid perimeter (rich detail at default zoom 42)
  { x: -8.3, z: 3.1, radius: 1.45, depth: 0.42, rim: 0.28 },
  { x: -7.9, z: -7.5, radius: 1.65, depth: 0.48, rim: 0.32 },
  { x: 3.6, z: 8.4, radius: 1.35, depth: 0.38, rim: 0.25 },
  { x: 8.5, z: -2.6, radius: 1.5, depth: 0.44, rim: 0.3 },
  { x: -2.1, z: -8.5, radius: 1.35, depth: 0.38, rim: 0.26 },
  { x: 8.2, z: 7.7, radius: 1.8, depth: 0.5, rim: 0.34 },
  // Mid-field (zoom 25..42)
  { x: -13.6, z: 9.4, radius: 3.0, depth: 0.78, rim: 0.5 },
  { x: 14.0, z: -10.5, radius: 3.3, depth: 0.85, rim: 0.54 },
  { x: -13.5, z: -13.2, radius: 2.6, depth: 0.68, rim: 0.44 },
  { x: 11.4, z: 13.8, radius: 3.5, depth: 0.9, rim: 0.58 },
  { x: 1.4, z: -15.4, radius: 2.7, depth: 0.7, rim: 0.46 },
  { x: -16.4, z: -1.8, radius: 2.5, depth: 0.65, rim: 0.42 },
  // Outer basin (panned min zoom 25)
  { x: -27, z: 21, radius: 5.2, depth: 1.25, rim: 0.8 },
  { x: 30, z: -23, radius: 5.6, depth: 1.35, rim: 0.86 },
  { x: 23, z: 28, radius: 5.0, depth: 1.2, rim: 0.76 },
  { x: -32, z: -26, radius: 5.8, depth: 1.4, rim: 0.92 },
  { x: 42, z: 9, radius: 6.0, depth: 1.45, rim: 0.94 },
  { x: -41, z: 38, radius: 6.4, depth: 1.5, rim: 0.98 },
  { x: 39, z: -42, radius: 6.6, depth: 1.55, rim: 1.02 },
]

interface PeakFeature {
  x: number
  z: number
  radius: number
  height: number
  ribs: number
  phase: number
  sharpness: number
  stretchX: number
  stretchZ: number
  rot: number
}

// Clustered jagged mountain spires and crag ridges radiating outward from the mesa rim
const PEAKS: readonly PeakFeature[] = [
  // Close rocky crag spires framing default zoom=42 right outside the terraced shelves
  {
    x: -11.6,
    z: -3.4,
    radius: 5.0,
    height: 4.1,
    ribs: 5,
    phase: 0.4,
    sharpness: 1.26,
    stretchX: 1.0,
    stretchZ: 1.35,
    rot: 0.3,
  },
  {
    x: -5.6,
    z: -12.8,
    radius: 5.6,
    height: 4.8,
    ribs: 6,
    phase: 1.2,
    sharpness: 1.24,
    stretchX: 1.3,
    stretchZ: 0.92,
    rot: -0.25,
  },
  {
    x: 12.8,
    z: -4.6,
    radius: 5.0,
    height: 3.9,
    ribs: 5,
    phase: 2.1,
    sharpness: 1.28,
    stretchX: 0.95,
    stretchZ: 1.3,
    rot: 0.45,
  },
  {
    x: 2.4,
    z: 13.2,
    radius: 4.9,
    height: 3.4,
    ribs: 5,
    phase: 0.9,
    sharpness: 1.3,
    stretchX: 1.3,
    stretchZ: 0.88,
    rot: -0.4,
  },
  // Mid-ring dramatic mountain clusters (clearly towering in zoom 25 & zoom 42 corners)
  {
    x: -22,
    z: -19,
    radius: 12.5,
    height: 13.8,
    ribs: 6,
    phase: 0.3,
    sharpness: 1.22,
    stretchX: 1.22,
    stretchZ: 0.92,
    rot: 0.55,
  },
  {
    x: -16,
    z: -24,
    radius: 9.8,
    height: 10.6,
    ribs: 5,
    phase: 1.5,
    sharpness: 1.26,
    stretchX: 0.95,
    stretchZ: 1.2,
    rot: -0.2,
  },
  {
    x: -10,
    z: -26,
    radius: 11.2,
    height: 11.8,
    ribs: 6,
    phase: 2.1,
    sharpness: 1.24,
    stretchX: 1.25,
    stretchZ: 0.9,
    rot: 0.25,
  },
  {
    x: 21,
    z: -22,
    radius: 12.2,
    height: 12.6,
    ribs: 6,
    phase: 2.4,
    sharpness: 1.22,
    stretchX: 1.3,
    stretchZ: 0.88,
    rot: 0.7,
  },
  {
    x: 25,
    z: -13,
    radius: 9.6,
    height: 9.8,
    ribs: 5,
    phase: 0.8,
    sharpness: 1.26,
    stretchX: 0.92,
    stretchZ: 1.28,
    rot: -0.45,
  },
  {
    x: -25,
    z: 8,
    radius: 11.8,
    height: 11.4,
    ribs: 6,
    phase: 1.1,
    sharpness: 1.25,
    stretchX: 1.05,
    stretchZ: 1.25,
    rot: 0.25,
  },
  {
    x: 19,
    z: 20,
    radius: 10.8,
    height: 9.6,
    ribs: 6,
    phase: 2.9,
    sharpness: 1.26,
    stretchX: 1.2,
    stretchZ: 0.95,
    rot: -0.65,
  },
  {
    x: -10,
    z: 23,
    radius: 11.2,
    height: 10.2,
    ribs: 6,
    phase: 0.5,
    sharpness: 1.25,
    stretchX: 1.3,
    stretchZ: 0.92,
    rot: 0.4,
  },
  // Towering outer massif ranges filling panned minimum-zoom horizons in every direction
  {
    x: -44,
    z: -40,
    radius: 19,
    height: 22.5,
    ribs: 7,
    phase: 0.2,
    sharpness: 1.2,
    stretchX: 1.25,
    stretchZ: 0.95,
    rot: 0.7,
  },
  {
    x: -36,
    z: -48,
    radius: 15,
    height: 17.5,
    ribs: 6,
    phase: 1.7,
    sharpness: 1.24,
    stretchX: 0.95,
    stretchZ: 1.25,
    rot: 0.1,
  },
  {
    x: 42,
    z: -42,
    radius: 18,
    height: 20.5,
    ribs: 7,
    phase: 1.5,
    sharpness: 1.22,
    stretchX: 1.18,
    stretchZ: 1.22,
    rot: -0.5,
  },
  {
    x: 48,
    z: -32,
    radius: 14.5,
    height: 16.0,
    ribs: 6,
    phase: 2.8,
    sharpness: 1.25,
    stretchX: 1.25,
    stretchZ: 0.92,
    rot: 0.4,
  },
  {
    x: -46,
    z: 38,
    radius: 18.5,
    height: 19.2,
    ribs: 7,
    phase: 2.3,
    sharpness: 1.22,
    stretchX: 1.25,
    stretchZ: 1.0,
    rot: 0.4,
  },
  {
    x: 44,
    z: 41,
    radius: 18.0,
    height: 18.4,
    ribs: 7,
    phase: 0.9,
    sharpness: 1.22,
    stretchX: 1.1,
    stretchZ: 1.25,
    rot: -0.35,
  },
  {
    x: 3,
    z: -50,
    radius: 19.5,
    height: 21.8,
    ribs: 7,
    phase: 1.9,
    sharpness: 1.2,
    stretchX: 1.38,
    stretchZ: 0.9,
    rot: 0.15,
  },
  {
    x: 52,
    z: 4,
    radius: 17.5,
    height: 18.0,
    ribs: 6,
    phase: 0.6,
    sharpness: 1.22,
    stretchX: 0.92,
    stretchZ: 1.35,
    rot: 0.2,
  },
  {
    x: -52,
    z: -5,
    radius: 17.5,
    height: 18.6,
    ribs: 6,
    phase: 2.6,
    sharpness: 1.22,
    stretchX: 0.95,
    stretchZ: 1.32,
    rot: -0.2,
  },
  {
    x: -5,
    z: 49,
    radius: 18.0,
    height: 17.2,
    ribs: 6,
    phase: 1.3,
    sharpness: 1.24,
    stretchX: 1.35,
    stretchZ: 0.92,
    rot: -0.1,
  },
]

/**
 * Unified Hellas Planitia heightfield:
 * - Strictly flat (-0.035) across the 12x12 playable grid + 0.68m seam-free collar
 * - Crisp stepped rock terraces and incised canyon drops right outside the pad perimeter
 * - Sharp fluted pointed mountain spires and crisp-rimmed impact craters blended into the crust
 */
function sampleHellasHeight(x: number, z: number, halfW: number, halfH: number): number {
  const edgeDist = Math.max(Math.abs(x) - halfW, Math.abs(z) - halfH)
  if (edgeDist <= 0.68) {
    return -0.035
  }

  const padBlend = smoothstep(0.68, 3.8, edgeDist)
  const shelfReach = smoothstep(1.8, 6.2, edgeDist)
  const rDist = Math.hypot(x, z)
  const fineWeight = 1 - smoothstep(14, 34, rDist)

  // 1. Abrupt stepped Martian rock shelves & recessed canyon channels right outside the base pad
  const macro = fbm2d(x * 0.044 + 4.2, z * 0.044 - 3.7, 3)
  const shelfBand = (ridgedNoise2d(x * 0.056 + 2.1, z * 0.056 - 5.4, 2) - 0.5) * 0.9
  const canyonWave = Math.sin(x * 0.12 - z * 0.1 + 0.7) * 0.5 + 0.5
  const canyonBand = smoothstep(2.4, 5.8, edgeDist) * (1 - smoothstep(10.0, 19.0, edgeDist))
  const canyonTrough = canyonBand * smoothstep(0.54, 0.86, canyonWave) * -1.75
  const strataRaw = ((macro - 0.48) * 3.1 + shelfBand) * shelfReach + canyonTrough
  const terraced = terraceQuantize(strataRaw, 0.88, 0.48)
  // Keep terrace bench tops crisp with gentle low-poly facet variation
  const microFacet = (fbm2d(x * 0.2, z * 0.2, 2) - 0.5) * 0.07 * fineWeight

  const dirBias = smoothstep(-8, 14, -x * 0.5 - z * 0.5) * 0.48 * shelfReach
  let height = -0.035 + padBlend * (terraced * 0.88 + microFacet + dirBias)

  // 2. Sharp fluted pointed mountain spires with clean polygonal ribs blended into terrain
  for (const p of PEAKS) {
    const dx = x - p.x
    const dz = z - p.z
    const cosR = Math.cos(p.rot)
    const sinR = Math.sin(p.rot)
    const lx = (dx * cosR - dz * sinR) / p.stretchX
    const lz = (dx * sinR + dz * cosR) / p.stretchZ
    const dist = Math.hypot(lx, lz)
    if (dist >= p.radius) continue

    const u = 1 - dist / p.radius
    // Gentle apron at foot (0..24% radius) rising steeply into a sculpted pointed summit
    const spire = smoothstep(0, 0.24, u) * Math.pow(u, p.sharpness)
    const ang = Math.atan2(lz, lx)
    const ridgeTwist =
      Math.sin(u * 2.4 + p.phase) * 0.22 + (fbm2d(x * 0.048, z * 0.048, 2) - 0.5) * 0.34
    // Crisp sculpted rib flutes without sub-triangle needle spikes
    const ribCos = 0.5 + 0.5 * Math.cos(ang * p.ribs + p.phase + ridgeTwist)
    const flute = 0.56 + 0.44 * Math.pow(ribCos, 0.85)
    const foothillCrag =
      1 + fineWeight * 0.1 * (ridgedNoise2d(x * 0.12 + p.phase, z * 0.12 - p.phase, 2) - 0.5)

    height += padBlend * p.height * spire * flute * foothillCrag
  }

  // 3. Crisp-rimmed flat-bowled impact craters sculpted directly into the unified terrain
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z)
    const outer = c.radius * 1.46
    if (d >= outer) continue

    const rNorm = d / c.radius
    if (rNorm < 0.7) {
      const pitT = rNorm / 0.7
      const bowl = -c.depth * (1 - Math.pow(pitT, 2.3))
      const rim = c.rim * smoothstep(0.45, 0.7, rNorm)
      height += padBlend * (bowl + rim)
    } else if (rNorm < 1.0) {
      const crestT = (rNorm - 0.7) / 0.3
      height += padBlend * c.rim * (1 - smoothstep(0, 1, crestT) * 0.45)
    } else {
      const apronT = (d - c.radius) / (outer - c.radius)
      height += padBlend * c.rim * 0.55 * (1 - smoothstep(0, 1, apronT))
    }
  }

  return height
}

/** Builds a unified organic-jittered non-indexed terrain mesh with strata & mountain shading. */
function buildUnifiedTerrainGeometry(halfW: number, halfH: number): BufferGeometry {
  const grid = new PlaneGeometry(2, 2, MESH_SEGMENTS, MESH_SEGMENTS)
  grid.rotateX(-Math.PI / 2)

  const pos = grid.attributes.position
  const cols = MESH_SEGMENTS + 1
  const du = 2 / MESH_SEGMENTS
  for (let i = 0; i < pos.count; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols
    let ux = pos.getX(i)
    const uz = pos.getZ(i)

    // Hexagonal half-cell row stagger turns square quads into organic low-poly equilateral facets
    if (row % 2 === 1 && col > 0 && col < MESH_SEGMENTS) {
      ux = Math.min(0.995, ux + du * 0.5)
    }

    const [baseX, baseZ] = warpRadial(ux, uz)

    let wx = baseX
    let wz = baseZ
    const edgeDist = Math.max(Math.abs(baseX) - halfW, Math.abs(baseZ) - halfH)
    // Gentle organic jitter outside the outpost pad without skinny needle triangles
    if (edgeDist > 0.72 && Math.abs(ux) < 0.995 && Math.abs(uz) < 0.995) {
      const [nx, nz] = warpRadial(ux + du, uz)
      const spacing = Math.hypot(nx - baseX, nz - baseZ)
      const jitterWeight = smoothstep(0.72, 1.8, edgeDist) * 0.12 * spacing
      wx += (hash2d(ux * 91.7 + 3.1, uz * 91.7 - 5.3) - 0.5) * jitterWeight
      wz += (hash2d(ux * 91.7 - 7.9, uz * 91.7 + 4.7) - 0.5) * jitterWeight
    }

    const wy = sampleHellasHeight(wx, wz, halfW, halfH)
    pos.setXYZ(i, wx, wy, wz)
  }

  const faceted = grid.toNonIndexed()
  grid.dispose()
  faceted.computeVertexNormals()

  const fPos = faceted.attributes.position
  const fNorm = faceted.attributes.normal
  const colors = new Float32Array(fPos.count * 3)

  const cPit = new Color(CRATER_SHADOW)
  const cDeep = new Color(DEEP_RUST)
  const cCliff = new Color(CLIFF_SHADOW)
  const cBase = new Color(PAD_MATCH_GROUND)
  const cSand = new Color(SUNLIT_SAND)
  const cRidge = new Color(RIDGE_OCHRE)
  const cPeak = new Color(PEAK_LIGHT)
  const tmp = new Color()
  const scratch = new Color()

  for (let i = 0; i < fPos.count; i += 3) {
    const cy = (fPos.getY(i) + fPos.getY(i + 1) + fPos.getY(i + 2)) / 3
    const cx = (fPos.getX(i) + fPos.getX(i + 1) + fPos.getX(i + 2)) / 3
    const cz = (fPos.getZ(i) + fPos.getZ(i + 1) + fPos.getZ(i + 2)) / 3
    const ny = fNorm.getY(i)

    const edgeDist = Math.max(Math.abs(cx) - halfW, Math.abs(cz) - halfH)
    const padColorBlend = smoothstep(0.55, 1.85, edgeDist)
    const steepness = 1 - Math.max(0, Math.min(1, ny))
    const sunDot = fNorm.getX(i) * 0.58 + fNorm.getZ(i) * 0.28 + ny * 0.76
    const microHue = (hash2d(cx * 1.4 + cy, cz * 1.4 - cy) - 0.5) * 0.048

    tmp.copy(cBase)

    // Elevation progression: shadowed canyon/crater beds -> sunlit terrace tops -> bright mountain spires
    if (cy < -0.05) {
      const pitT = smoothstep(-1.7, -0.05, cy)
      scratch.lerpColors(cPit, cBase, pitT)
      tmp.lerp(scratch, 0.78)
    } else if (cy > 1.8) {
      const highT = smoothstep(1.8, 15.0, cy)
      scratch.lerpColors(cSand, cPeak, highT)
      tmp.lerp(scratch, smoothstep(0.8, 3.8, cy))
    } else {
      const shelfT = smoothstep(0, 1.8, cy)
      tmp.lerp(cSand, shelfT * 0.52)
    }

    // Subtle strata shading — let Three.js directional lighting & shadows define crisp facet planes cleanly
    const cliffFactor = smoothstep(0.26, 0.72, steepness)
    const cliffTarget = cy > 2.4 ? cCliff : cDeep
    tmp.lerp(cliffTarget, cliffFactor * 0.28)

    // Sunlit ochre highlights on elevated mountain ridges & summits
    if (cy > 2.2 && sunDot > 0.65) {
      tmp.lerp(cRidge, smoothstep(2.2, 8.5, cy) * smoothstep(0.65, 0.95, sunDot) * 0.38)
    }

    // Match immediate grid collar seamlessly to #b5532f
    tmp.lerp(cBase, (1 - padColorBlend) * 0.88)
    tmp.offsetHSL(0, 0, microHue * padColorBlend)

    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = tmp.r
      colors[(i + k) * 3 + 1] = tmp.g
      colors[(i + k) * 3 + 2] = tmp.b
    }
  }

  faceted.setAttribute('color', new BufferAttribute(colors, 3))
  return faceted
}

/** Angular low-poly fractured rock slab geometry with wide flared base for natural seating. */
function buildJaggedRockGeometry(): CylinderGeometry {
  const geo = new CylinderGeometry(0.42, 1.0, 1.0, 6, 2)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const r = Math.hypot(x, z)
    if (r < 0.001) {
      pos.setY(i, y + (y > 0 ? 0.14 : 0))
      continue
    }
    const ang = Math.atan2(z, x)
    const s = 0.78 + hash2d(Math.round(ang * 4), Math.round(y * 3) + 17) * 0.44
    pos.setXYZ(i, x * s, y + (y > 0.1 ? (hash2d(x, z) - 0.4) * 0.16 : 0), z * s)
  }
  geo.computeVertexNormals()
  return geo
}

interface RockPlacement {
  x: number
  y: number
  z: number
  scale: readonly [number, number, number]
  rotX: number
  rotY: number
  rotZ: number
  colorHex: string
}

const ROCK_PALETTE = [DEEP_RUST, CLIFF_SHADOW, PAD_MATCH_GROUND, SUNLIT_SAND, RIDGE_OCHRE] as const

function approxTerrainNormal(x: number, z: number, halfW: number, halfH: number): Vector3 {
  const eps = 0.45
  const hL = sampleHellasHeight(x - eps, z, halfW, halfH)
  const hR = sampleHellasHeight(x + eps, z, halfW, halfH)
  const hD = sampleHellasHeight(x, z - eps, halfW, halfH)
  const hU = sampleHellasHeight(x, z + eps, halfW, halfH)
  return new Vector3(hL - hR, 2 * eps, hD - hU).normalize()
}

function generateRootedRocks(halfW: number, halfH: number, count = 400): RockPlacement[] {
  const rocks: RockPlacement[] = []
  let attempt = 0
  const up = new Vector3(0, 1, 0)
  const tmpDummy = new Object3D()

  while (rocks.length < count && attempt < count * 5) {
    attempt += 1
    // Concentrate boulder clusters along canyon rims & close perimeter (r = 7.3..17), fading out to r = 68
    const angle = attempt * 2.39996323 + hash2d(attempt, 19) * 0.42
    const band = hash2d(attempt * 1.37, 43)
    const radius = band < 0.48 ? 7.3 + band * 19.5 : 16 + Math.pow((band - 0.48) / 0.52, 1.3) * 52
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    if (Math.abs(x) < halfW + 1.1 && Math.abs(z) < halfH + 1.1) continue

    const slopeNormal = approxTerrainNormal(x, z, halfW, halfH)
    if (slopeNormal.y < 0.6) continue

    const groundY = sampleHellasHeight(x, z, halfW, halfH)
    const baseSize = 0.2 + Math.pow(hash2d(attempt, 71), 1.8) * 0.68
    const sx = baseSize * (0.95 + hash2d(attempt, 3) * 0.65)
    const sy = baseSize * (0.5 + hash2d(attempt, 5) * 0.58)
    const sz = baseSize * (0.95 + hash2d(attempt, 7) * 0.65)

    // Align flared rock base with local terrain normal and sink ~44% into terrain for seamless rooting
    tmpDummy.quaternion.setFromUnitVectors(up, slopeNormal)
    tmpDummy.rotateY(hash2d(attempt, 13) * Math.PI * 2)

    rocks.push({
      x,
      y: groundY + sy * 0.05,
      z,
      scale: [sx, sy, sz],
      rotX: tmpDummy.rotation.x,
      rotY: tmpDummy.rotation.y,
      rotZ: tmpDummy.rotation.z,
      colorHex: ROCK_PALETTE[Math.floor(hash2d(attempt, 29) * ROCK_PALETTE.length)],
    })
  }

  return rocks
}

/**
 * Hellas Planitia low-poly Martian terrain surrounding the buildable outpost pad:
 * organic-jittered unified crust with stepped canyon shelves, sculpted impact craters,
 * sharp fluted pointed mountain ranges, and slope-embedded rock outcrops.
 */
export function Terrain({ gridWidth = 12, gridHeight = 12 }: TerrainProps) {
  const halfW = gridWidth / 2
  const halfH = gridHeight / 2

  const terrainGeo = useMemo(() => buildUnifiedTerrainGeometry(halfW, halfH), [halfW, halfH])
  const rockGeo = useMemo(() => buildJaggedRockGeometry(), [])
  const rocks = useMemo(() => generateRootedRocks(halfW, halfH, 400), [halfW, halfH])
  const rockMeshRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const inst = rockMeshRef.current
    if (!inst) return
    const dummy = new Object3D()
    const color = new Color()

    for (let i = 0; i < rocks.length; i++) {
      const r = rocks[i]
      dummy.position.set(r.x, r.y, r.z)
      dummy.rotation.set(r.rotX, r.rotY, r.rotZ)
      dummy.scale.set(r.scale[0], r.scale[1], r.scale[2])
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
      color.set(r.colorHex)
      inst.setColorAt(i, color)
    }

    inst.instanceMatrix.needsUpdate = true
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true
  }, [rocks])

  return (
    <group>
      {/* Unified continuous Hellas Planitia terrain, stepped canyon cliffs, craters & spires */}
      <mesh geometry={terrainGeo} receiveShadow castShadow raycast={() => null}>
        <meshStandardMaterial vertexColors flatShading />
      </mesh>

      {/* Slope-aligned angular regolith outcrops deeply embedded into terrain (1 draw call) */}
      <instancedMesh
        ref={rockMeshRef}
        args={[rockGeo, undefined, rocks.length]}
        castShadow
        receiveShadow
        raycast={() => null}
      >
        <meshStandardMaterial flatShading />
      </instancedMesh>
    </group>
  )
}

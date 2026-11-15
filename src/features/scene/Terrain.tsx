import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
} from 'three'

const PAD_HALF_EXTENT = 6.5
const TERRAIN_SPAN = 180
const TERRAIN_SEGMENTS = 72

const BASE_OCHRE = '#944222'
const DEEP_RUST = '#783219'
const CRATER_SHADOW = '#5b2210'
const SUNLIT_SAND = '#b0542c'
const CLIFF_OCHRE = '#c76538'
const MESA_CAP = '#d47848'
const BASALT_DARK = '#592e20'

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

/** Deterministic base desert floor height (before crater bowl carving). */
function sampleDuneBaseHeight(x: number, z: number, halfW: number, halfH: number): number {
  const edgeDist = Math.max(Math.abs(x) - halfW, Math.abs(z) - halfH)
  // Keep every triangle crossing the playable 12x12 perimeter strictly below y = 0
  if (edgeDist <= 3.0) {
    return -0.05
  }

  const blend = Math.min(1, (edgeDist - 3.0) / 4.0)
  const smooth = blend * blend * (3 - 2 * blend)

  // Broad wind-carved Martian dunes + subtle crater basin undulations
  const duneA = Math.sin(x * 0.14 + z * 0.08) * 0.45
  const duneB = Math.cos(x * 0.07 - z * 0.16) * 0.35
  const ridge = Math.sin((x + z) * 0.28) * 0.14
  const distFromCenter = Math.hypot(x, z)
  const basinRise = Math.max(0, (distFromCenter - 18) * 0.045)

  return -0.05 + smooth * (duneA + duneB + ridge + Math.min(2.6, basinRise))
}

/** Sample desert floor height including carved depressions under crater bowls. */
function sampleDesertHeight(x: number, z: number, halfW: number, halfH: number): number {
  let h = sampleDuneBaseHeight(x, z, halfW, halfH)
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.position[0], z - c.position[2])
    if (d < c.outerRadius * 0.92) {
      const t = 1 - d / (c.outerRadius * 0.92)
      h -= t * (c.bowlDepth + 0.65)
    }
  }
  return h
}

function buildDesertFloorGeometry(halfW: number, halfH: number): PlaneGeometry {
  const geo = new PlaneGeometry(TERRAIN_SPAN, TERRAIN_SPAN, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS)
  geo.rotateX(-Math.PI / 2)

  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const cDeep = new Color(DEEP_RUST)
  const cMid = new Color(BASE_OCHRE)
  const cHigh = new Color(SUNLIT_SAND)
  const tmp = new Color()

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const h = sampleDesertHeight(x, z, halfW, halfH)
    pos.setY(i, h)

    // Keep immediate outpost border uniform so grid edges match cleanly
    const distEdge = Math.max(Math.abs(x) - halfW, Math.abs(z) - halfH)
    const t =
      distEdge <= 3.0
        ? 0.45
        : Math.max(0, Math.min(1, (h + 0.65) / 2.2 + (hash2d(x * 0.3, z * 0.3) - 0.5) * 0.16))
    if (t < 0.5) {
      tmp.lerpColors(cDeep, cMid, t * 2)
    } else {
      tmp.lerpColors(cMid, cHigh, (t - 0.5) * 2)
    }
    colors[i * 3] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b
  }

  geo.setAttribute('color', new BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

/** Builds a vertex-colored multi-ring impact crater with shadowed bowl, rim crest & buried skirt. */
function buildCraterGeometry(
  outerRadius: number,
  rimHeight: number,
  bowlDepth: number,
  sides: number,
  seed: number,
): PlaneGeometry {
  const rings = 4
  const geo = new PlaneGeometry(1, 1, sides, rings)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)

  const ringRadii = [0.001, 0.38, 0.62, 0.78, 1.04]
  const ringHeights = [-bowlDepth, -bowlDepth * 0.82, rimHeight, rimHeight * 0.68, -0.7]
  const ringColors = [
    new Color(CRATER_SHADOW),
    new Color(DEEP_RUST),
    new Color(CLIFF_OCHRE),
    new Color(SUNLIT_SAND),
    new Color(BASE_OCHRE),
  ]

  for (let iy = 0; iy <= rings; iy++) {
    const rRatio = ringRadii[iy]
    const hBase = ringHeights[iy]
    const ringCol = ringColors[iy]

    for (let ix = 0; ix <= sides; ix++) {
      const idx = iy * (sides + 1) + ix
      const segIdx = ix % sides
      const angle = -(segIdx / sides) * Math.PI * 2
      const jitterR = iy === 0 ? 1 : 0.9 + hash2d(segIdx + seed, iy * 7 + seed) * 0.22
      const jitterY =
        iy === 0 || iy === rings ? 0 : (hash2d(segIdx * 3 + seed, iy + seed) - 0.5) * 0.14
      const r = outerRadius * rRatio * jitterR

      pos.setXYZ(idx, Math.cos(angle) * r, hBase + jitterY, Math.sin(angle) * r)
      colors[idx * 3] = ringCol.r
      colors[idx * 3 + 1] = ringCol.g
      colors[idx * 3 + 2] = ringCol.b
    }
  }

  geo.setAttribute('color', new BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

function buildMesaStratumGeometry(
  topRadius: number,
  bottomRadius: number,
  height: number,
  sides: number,
  seed: number,
): CylinderGeometry {
  const geo = new CylinderGeometry(topRadius, bottomRadius, height, sides, 1)
  const pos = geo.attributes.position

  // Apply consistent per-angle radial jitter so top and bottom vertices shear cleanly together
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const r = Math.hypot(x, z)
    if (r < 0.001) continue
    const ang = Math.atan2(z, x)
    const sector = Math.round(((ang + Math.PI) / (Math.PI * 2)) * sides) % sides
    const scale = 0.84 + hash2d(sector + seed, seed * 3) * 0.32
    pos.setX(i, x * scale)
    pos.setZ(i, z * scale)
  }

  geo.computeVertexNormals()
  return geo
}

interface CraterSpec {
  id: string
  position: readonly [number, number, number]
  outerRadius: number
  rimHeight: number
  bowlDepth: number
  sides: number
  seed: number
}

const CRATERS: readonly CraterSpec[] = [
  {
    id: 'crater-nw',
    position: [-10.8, 0, -9.8],
    outerRadius: 3.1,
    rimHeight: 0.42,
    bowlDepth: 0.36,
    sides: 11,
    seed: 11,
  },
  {
    id: 'crater-ne',
    position: [12.4, 0, -11.2],
    outerRadius: 2.6,
    rimHeight: 0.36,
    bowlDepth: 0.3,
    sides: 10,
    seed: 23,
  },
  {
    id: 'crater-sw',
    position: [-12.2, 0, 10.6],
    outerRadius: 2.8,
    rimHeight: 0.38,
    bowlDepth: 0.32,
    sides: 10,
    seed: 37,
  },
  {
    id: 'crater-se',
    position: [11.6, 0, 11.4],
    outerRadius: 3.4,
    rimHeight: 0.46,
    bowlDepth: 0.4,
    sides: 12,
    seed: 51,
  },
  {
    id: 'crater-far-n',
    position: [1.8, 0, -18.5],
    outerRadius: 4.4,
    rimHeight: 0.58,
    bowlDepth: 0.48,
    sides: 12,
    seed: 67,
  },
]

interface MesaSpec {
  id: string
  position: readonly [number, number]
  rotationY: number
  tiers: ReadonlyArray<{
    topR: number
    botR: number
    height: number
    sides: number
    color: string
  }>
  seed: number
}

const MESAS: readonly MesaSpec[] = [
  {
    id: 'mesa-west',
    position: [-15.5, -2.2],
    rotationY: 0.4,
    seed: 101,
    tiers: [
      { topR: 3.1, botR: 4.1, height: 1.15, sides: 7, color: BASE_OCHRE },
      { topR: 2.1, botR: 2.8, height: 1.05, sides: 7, color: CLIFF_OCHRE },
      { topR: 1.35, botR: 1.75, height: 0.72, sides: 6, color: MESA_CAP },
    ],
  },
  {
    id: 'mesa-north',
    position: [-8.2, -16.8],
    rotationY: 1.1,
    seed: 205,
    tiers: [
      { topR: 3.4, botR: 4.5, height: 1.35, sides: 7, color: BASE_OCHRE },
      { topR: 2.3, botR: 3.0, height: 1.15, sides: 7, color: CLIFF_OCHRE },
      { topR: 1.45, botR: 1.9, height: 0.8, sides: 6, color: MESA_CAP },
    ],
  },
  {
    id: 'mesa-east',
    position: [16.2, -3.5],
    rotationY: -0.7,
    seed: 317,
    tiers: [
      { topR: 2.7, botR: 3.6, height: 1.0, sides: 6, color: BASE_OCHRE },
      { topR: 1.7, botR: 2.35, height: 0.85, sides: 6, color: CLIFF_OCHRE },
    ],
  },
  {
    id: 'mesa-south',
    position: [3.2, 16.5],
    rotationY: 2.1,
    seed: 409,
    tiers: [
      { topR: 2.8, botR: 3.8, height: 0.9, sides: 7, color: BASE_OCHRE },
      { topR: 1.8, botR: 2.45, height: 0.72, sides: 7, color: CLIFF_OCHRE },
    ],
  },
  {
    id: 'mesa-far-nw',
    position: [-23.0, -20.5],
    rotationY: 0.85,
    seed: 523,
    tiers: [
      { topR: 4.8, botR: 6.2, height: 1.9, sides: 7, color: DEEP_RUST },
      { topR: 3.2, botR: 4.2, height: 1.5, sides: 7, color: CLIFF_OCHRE },
      { topR: 2.0, botR: 2.6, height: 1.0, sides: 6, color: MESA_CAP },
    ],
  },
]

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

const ROCK_PALETTE = [DEEP_RUST, BASE_OCHRE, SUNLIT_SAND, CLIFF_OCHRE, BASALT_DARK] as const

function generateRockPlacements(halfW: number, halfH: number, count = 160): RockPlacement[] {
  const rocks: RockPlacement[] = []
  let attempt = 0

  while (rocks.length < count && attempt < count * 5) {
    attempt += 1
    const angle = attempt * 2.39996323 + hash2d(attempt, 19) * 0.4
    const radialBand = hash2d(attempt * 1.7, 43)
    const radius = 8.4 + Math.pow(radialBand, 0.85) * 34
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    // Keep rock boulders strictly outside the central outpost apron, craters, and mesas
    if (Math.abs(x) < halfW + 1.1 && Math.abs(z) < halfH + 1.1) continue
    if (
      CRATERS.some((c) => Math.hypot(x - c.position[0], z - c.position[2]) < c.outerRadius * 0.82)
    )
      continue
    if (
      MESAS.some((m) => Math.hypot(x - m.position[0], z - m.position[1]) < m.tiers[0].botR * 0.96)
    )
      continue

    const baseScale = 0.18 + Math.pow(hash2d(attempt, 71), 1.6) * 0.52
    const sx = baseScale * (0.85 + hash2d(attempt, 3) * 0.55)
    const sy = baseScale * (0.55 + hash2d(attempt, 5) * 0.5)
    const sz = baseScale * (0.85 + hash2d(attempt, 7) * 0.55)
    const groundY = sampleDuneBaseHeight(x, z, halfW, halfH)

    rocks.push({
      x,
      y: groundY + sy * 0.25,
      z,
      scale: [sx, sy, sz],
      rotX: hash2d(attempt, 11) * Math.PI,
      rotY: hash2d(attempt, 13) * Math.PI * 2,
      rotZ: hash2d(attempt, 17) * Math.PI,
      colorHex: ROCK_PALETTE[Math.floor(hash2d(attempt, 29) * ROCK_PALETTE.length)],
    })
  }

  return rocks
}

/**
 * Hellas Planitia low-poly Martian terrain surrounding the buildable outpost pad:
 * continuous vertex-colored desert basin, multi-ring impact craters, terraced
 * sedimentary mesas, and instanced regolith boulders.
 */
export function Terrain({ gridWidth = 12, gridHeight = 12 }: TerrainProps) {
  const halfW = gridWidth / 2
  const halfH = gridHeight / 2
  const apronHalfW = Math.max(halfW + 0.5, PAD_HALF_EXTENT)
  const apronHalfH = Math.max(halfH + 0.5, PAD_HALF_EXTENT)

  const floorGeo = useMemo(
    () => buildDesertFloorGeometry(apronHalfW, apronHalfH),
    [apronHalfW, apronHalfH],
  )

  const craterGeos = useMemo(
    () =>
      CRATERS.map((c) => ({
        spec: c,
        groundY: sampleDuneBaseHeight(c.position[0], c.position[2], apronHalfW, apronHalfH),
        geo: buildCraterGeometry(c.outerRadius, c.rimHeight, c.bowlDepth, c.sides, c.seed),
      })),
    [apronHalfW, apronHalfH],
  )

  const mesaEntries = useMemo(
    () =>
      MESAS.map((mesa) => {
        const groundY = sampleDuneBaseHeight(
          mesa.position[0],
          mesa.position[1],
          apronHalfW,
          apronHalfH,
        )
        let yCursor = groundY - 0.35
        const tiers = mesa.tiers.map((tier) => {
          const centerY = yCursor + tier.height / 2
          yCursor += tier.height - 0.08
          return {
            geo: buildMesaStratumGeometry(tier.topR, tier.botR, tier.height, tier.sides, mesa.seed),
            centerY,
            color: tier.color,
          }
        })
        return { mesa, tiers }
      }),
    [apronHalfW, apronHalfH],
  )

  const rockGeo = useMemo(() => new DodecahedronGeometry(1, 0), [])
  const rocks = useMemo(
    () => generateRockPlacements(apronHalfW, apronHalfH, 160),
    [apronHalfW, apronHalfH],
  )
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
      {/* Continuous sculpted Hellas Planitia crater floor extending beyond far zoom */}
      <mesh geometry={floorGeo} receiveShadow raycast={() => null}>
        <meshStandardMaterial vertexColors flatShading />
      </mesh>

      {/* Multi-ring vertex-colored low-poly impact craters */}
      {craterGeos.map(({ spec, groundY, geo }) => (
        <mesh
          key={spec.id}
          geometry={geo}
          position={[spec.position[0], groundY + 0.04, spec.position[2]]}
          receiveShadow
          castShadow
          raycast={() => null}
        >
          <meshStandardMaterial vertexColors flatShading />
        </mesh>
      ))}

      {/* Terraced sedimentary rock mesas */}
      {mesaEntries.map(({ mesa, tiers }) => (
        <group
          key={mesa.id}
          position={[mesa.position[0], 0, mesa.position[1]]}
          rotation={[0, mesa.rotationY, 0]}
        >
          {tiers.map((tier, idx) => (
            <mesh
              key={`${mesa.id}-t-${idx}`}
              geometry={tier.geo}
              position={[0, tier.centerY, 0]}
              castShadow
              receiveShadow
              raycast={() => null}
            >
              <meshStandardMaterial color={tier.color} flatShading />
            </mesh>
          ))}
        </group>
      ))}

      {/* Instanced Martian regolith boulders (single GPU draw call) */}
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

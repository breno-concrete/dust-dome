// Owner: Dev C. Isometric 2.5D base (constitution V): orthographic camera at a fixed
// isometric angle, 90° stepped rotation, bounded zoom, 12x12 grid, low-poly structure
// models, placement preview, click to place or select.
// No physics, no walking, no collisions. Store actions allowed here:
// hoverAt, placeAt, selectStructure.
import { MapControls } from '@react-three/drei'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { AdditiveBlending, CanvasTexture, type Group, type MeshStandardMaterial } from 'three'
import type { StructureInstance } from '../../engine/types'
import { placementPreview, structureDef } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'
import type { DevVisualOverrides } from './DevVisualInspector'
import {
  cameraPositionForStep,
  clampPanTarget,
  rotateStep,
  tileCenter,
  worldToTile,
  type RotationStep,
} from './iso'
import styles from './Scene.module.css'
import { StructureModel } from './StructureModel'
import { Terrain } from './Terrain'
import { visualState, type VisualState } from './visualState'

const grid = config.mission.grid
const GROUND = '#b5532f'

// Strict dev/prod barrier: Vite replaces import.meta.env.DEV with false in production builds,
// so DevVisualInspector is neither rendered nor bundled into the production Scene chunk.
const DevVisualInspector =
  import.meta.env.DEV && !import.meta.env.VITEST ? lazy(() => import('./DevVisualInspector')) : null

const INITIAL_DEV_OVERRIDES: DevVisualOverrides = {
  weather: 'auto',
  frost: false,
  radiationTint: false,
  structureStatus: 'auto',
}

function applyDevVisualOverrides(base: VisualState, dev: DevVisualOverrides): VisualState {
  let next = { ...base }
  if (dev.weather === 'summer') {
    next = { ...next, light: 1, dustHaze: 0, dark: false }
  } else if (dev.weather === 'dust_storm') {
    next = { ...next, light: 0.45, dustHaze: 0.85, dark: false }
  } else if (dev.weather === 'winter_dark') {
    next = { ...next, light: 0.15, dustHaze: 0, dark: true }
  }
  if (dev.frost) next.frost = true
  if (dev.radiationTint) next.radiationTint = true
  return next
}

const strings = {
  rotateLeft: { en: 'Rotate ↺ (Q)', pt: 'Girar ↺ (Q)' },
  rotateRight: { en: 'Rotate ↻ (E)', pt: 'Girar ↻ (E)' },
}

export default function Scene() {
  const game = useGameStore((s) => s.game)
  const selectedId = useGameStore((s) => s.selectedStructureId)
  const hoverTile = useGameStore((s) => s.hoverTile)
  const hoverAt = useGameStore((s) => s.hoverAt)
  const placeAt = useGameStore((s) => s.placeAt)
  const placing = useGameStore((s) => s.placing)
  const selectStructure = useGameStore((s) => s.selectStructure)
  const [rotationStep, setRotationStep] = useState<RotationStep>(0)
  const [devOverrides, setDevOverrides] = useState<DevVisualOverrides>(INITIAL_DEV_OVERRIDES)
  const controlsRef = useRef<ComponentRef<typeof MapControls>>(null)
  const t = useT()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') {
        setRotationStep((s) => rotateStep(s, -1))
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') {
        setRotationStep((s) => rotateStep(s, 1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!game) return null
  const baseLook = visualState(game, config)
  const look =
    import.meta.env.DEV && !import.meta.env.VITEST
      ? applyDevVisualOverrides(baseLook, devOverrides)
      : baseLook
  // Derived in render: a store selector must never return a new object (infinite re-render).
  const preview = placementPreview({ game, placing, hoverTile })
  const placingSize = placing ? (structureDef(placing)?.size ?? 1) : 1
  const previewCenter =
    placing && hoverTile && preview ? tileCenter(hoverTile, placingSize, grid) : null

  const skyColor = look.radiationTint
    ? '#3d1518'
    : look.dark
      ? '#0c122b'
      : look.dustHaze > 0.1
        ? '#8a4524'
        : '#2a1a16'
  const ambientColor = look.radiationTint
    ? '#f0a098'
    : look.dark
      ? '#6b7ee6'
      : look.dustHaze > 0.1
        ? '#e69b67'
        : '#ffd9c4'
  const sunColor = look.radiationTint ? '#ffd0c4' : look.dark ? '#8ea4ff' : '#fff2e2'
  const ambientIntensity = look.dark ? 0.52 : 0.28 + 0.62 * look.light
  const sunIntensity = look.dark ? 0.56 : 1.4 * look.light

  const onGroundMove = (e: ThreeEvent<PointerEvent>) =>
    hoverAt(worldToTile(e.point.x, e.point.z, grid))
  const onGroundLeave = () => hoverAt(null)
  const onGroundClick = (e: ThreeEvent<MouseEvent>) => {
    const tile = worldToTile(e.point.x, e.point.z, grid)
    if (placing && tile) placeAt(tile)
    else selectStructure(null)
  }

  return (
    <div className={styles.wrapper}>
      {look.radiationTint && (
        <div className={styles.radiationTint} data-testid="radiation-warning-tint" />
      )}
      <Canvas
        orthographic
        camera={{ position: cameraPositionForStep(0), zoom: 42, near: -100, far: 200 }}
      >
        <color attach="background" args={[skyColor]} />
        {look.dustHaze > 0 && (
          <fog
            attach="fog"
            args={[
              '#a8562d',
              Math.max(15, 29 - look.dustHaze * 12),
              Math.max(32, 66 - look.dustHaze * 30),
            ]}
          />
        )}
        <ambientLight color={ambientColor} intensity={ambientIntensity} />
        <directionalLight color={sunColor} position={[8, 12, 4]} intensity={sunIntensity} />
        {look.dark && <hemisphereLight args={['#6e82e8', '#2a1c3d', 0.45]} />}

        <CameraRig step={rotationStep} controlsRef={controlsRef} />

        {/* Unified Hellas Planitia terrain with stepped canyons, craters and rocks */}
        <Terrain gridWidth={grid.width} gridHeight={grid.height} />

        {/* Atmospheric dust haze clouds during local or global dust storms (Lote 3) */}
        {look.dustHaze > 0 && <DustHazeClouds intensity={look.dustHaze} />}

        {/* Interactive 12x12 outpost buildable grid */}
        <mesh
          rotation-x={-Math.PI / 2}
          onPointerMove={onGroundMove}
          onPointerLeave={onGroundLeave}
          onClick={onGroundClick}
        >
          <planeGeometry args={[grid.width, grid.height]} />
          <meshStandardMaterial color={GROUND} flatShading />
        </mesh>
        <gridHelper args={[grid.width, grid.width, '#6b2a18', '#6b2a18']} position={[0, 0.01, 0]} />

        {/* Procedural walkways connecting placed structures & low-poly base streetlamps */}
        {game.structures.length > 0 && (
          <BasePathwaysAndLights structures={game.structures} dark={look.dark} />
        )}

        {game.structures.map((s) => {
          const size = structureDef(s.type)?.size ?? 1
          const [x, , z] = tileCenter(s.tile, size, grid)
          const shouldOverrideStatus =
            import.meta.env.DEV &&
            !import.meta.env.VITEST &&
            devOverrides.structureStatus !== 'auto' &&
            (selectedId === null || selectedId === s.id)
          const renderedStructure =
            shouldOverrideStatus && devOverrides.structureStatus !== 'auto'
              ? { ...s, status: devOverrides.structureStatus }
              : s
          return (
            <StructureModel
              key={s.id}
              structure={renderedStructure}
              size={size}
              position={[x, 0, z]}
              selected={s.id === selectedId}
              onSelect={selectStructure}
              visual={look}
            />
          )
        })}

        {preview?.tiles.map((tile) => {
          const [x, , z] = tileCenter(tile, 1, grid)
          return (
            <mesh key={tile.join(',')} position={[x, 0.05, z]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[0.95, 0.95]} />
              <meshBasicMaterial
                color={preview.valid ? '#5bd6a0' : '#ff6b6b'}
                transparent
                opacity={0.42}
              />
            </mesh>
          )
        })}

        {placing && preview && previewCenter && (
          <StructureModel
            structure={{
              id: '__preview__',
              type: placing,
              tile: hoverTile!,
              status: 'active',
              upgrades: [],
            }}
            size={placingSize}
            position={previewCenter}
            selected={false}
            onSelect={() => {}}
            preview={preview.valid ? 'valid' : 'invalid'}
          />
        )}

        <MapControls
          ref={controlsRef}
          enableRotate={false}
          enablePan={true}
          screenSpacePanning={false}
          minZoom={25}
          maxZoom={90}
        />
      </Canvas>

      {DevVisualInspector && (
        <Suspense fallback={null}>
          <DevVisualInspector
            overrides={devOverrides}
            onChange={setDevOverrides}
            selectedId={selectedId}
          />
        </Suspense>
      )}

      <div className={styles.cameraControls}>
        <Button
          variant="secondary"
          onClick={() => setRotationStep((s) => rotateStep(s, -1))}
          aria-label={t(strings.rotateLeft)}
        >
          {t(strings.rotateLeft)}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setRotationStep((s) => rotateStep(s, 1))}
          aria-label={t(strings.rotateRight)}
        >
          {t(strings.rotateRight)}
        </Button>
      </div>
    </div>
  )
}

function CameraRig({
  step,
  controlsRef,
}: {
  step: RotationStep
  controlsRef: React.RefObject<ComponentRef<typeof MapControls> | null>
}) {
  const prevStepRef = useRef<RotationStep>(step)
  const isRotatingRef = useRef(false)

  useEffect(() => {
    if (prevStepRef.current !== step) {
      prevStepRef.current = step
      isRotatingRef.current = true
    }
  }, [step])

  useFrame(({ camera }, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    const [clampedX, clampedZ] = clampPanTarget(controls.target.x, controls.target.z, grid)
    const dx = clampedX - controls.target.x
    const dz = clampedZ - controls.target.z
    if (dx !== 0 || dz !== 0 || controls.target.y !== 0) {
      controls.target.set(clampedX, 0, clampedZ)
      camera.position.x += dx
      camera.position.z += dz
    }

    if (isRotatingRef.current) {
      const [targetX, targetY, targetZ] = cameraPositionForStep(step, 14, [clampedX, clampedZ])
      const alpha = Math.min(1, delta * 8)
      camera.position.x += (targetX - camera.position.x) * alpha
      camera.position.y += (targetY - camera.position.y) * alpha
      camera.position.z += (targetZ - camera.position.z) * alpha
      if (
        Math.abs(targetX - camera.position.x) < 0.02 &&
        Math.abs(targetY - camera.position.y) < 0.02 &&
        Math.abs(targetZ - camera.position.z) < 0.02
      ) {
        camera.position.set(targetX, targetY, targetZ)
        isRotatingRef.current = false
      }
    }

    controls.update()
  })
  return null
}

const CLOUD_NOOP_RAYCAST = () => {}

interface DustCloudLayer {
  x0: number
  y: number
  z0: number
  scale: readonly [number, number, number]
  speed: number
  phase: number
  color: string
  puffs: ReadonlyArray<{
    offset: readonly [number, number, number]
    radius: number
    stretch: readonly [number, number, number]
  }>
}

const DUST_CLOUD_LAYERS: ReadonlyArray<DustCloudLayer> = [
  {
    x0: -14,
    y: 1.7,
    z0: -8.5,
    scale: [1.3, 0.45, 1.0],
    speed: 0.95,
    phase: 0.2,
    color: '#dfa06a',
    puffs: [
      { offset: [-0.9, 0, 0.2], radius: 1.15, stretch: [1.4, 0.6, 1.1] },
      { offset: [0.6, 0.15, -0.2], radius: 1.35, stretch: [1.6, 0.7, 1.2] },
      { offset: [1.8, -0.05, 0.3], radius: 0.95, stretch: [1.3, 0.55, 1.0] },
    ],
  },
  {
    x0: -4,
    y: 2.3,
    z0: -5.2,
    scale: [1.2, 0.4, 0.95],
    speed: 1.25,
    phase: 1.4,
    color: '#cf8850',
    puffs: [
      { offset: [-0.8, 0.05, -0.1], radius: 1.05, stretch: [1.5, 0.55, 1.0] },
      { offset: [0.8, 0.1, 0.2], radius: 1.2, stretch: [1.4, 0.6, 1.1] },
    ],
  },
  {
    x0: 7,
    y: 1.5,
    z0: -10.5,
    scale: [1.4, 0.5, 1.1],
    speed: 0.8,
    phase: 2.3,
    color: '#dfa06a',
    puffs: [
      { offset: [-1.0, 0, 0.1], radius: 1.3, stretch: [1.5, 0.65, 1.2] },
      { offset: [0.9, 0.12, -0.15], radius: 1.1, stretch: [1.4, 0.55, 1.1] },
    ],
  },
  {
    x0: -10,
    y: 2.5,
    z0: 0.8,
    scale: [1.15, 0.38, 0.9],
    speed: 1.35,
    phase: 3.1,
    color: '#cf8850',
    puffs: [
      { offset: [-0.7, 0, 0], radius: 1.0, stretch: [1.6, 0.5, 1.0] },
      { offset: [0.8, 0.08, 0.15], radius: 1.15, stretch: [1.5, 0.55, 1.1] },
    ],
  },
  {
    x0: 11,
    y: 1.9,
    z0: 3.2,
    scale: [1.25, 0.42, 1.0],
    speed: 1.05,
    phase: 4.0,
    color: '#dfa06a',
    puffs: [
      { offset: [-0.8, 0.05, -0.2], radius: 1.15, stretch: [1.4, 0.6, 1.1] },
      { offset: [0.7, -0.05, 0.2], radius: 1.05, stretch: [1.5, 0.55, 1.0] },
    ],
  },
  {
    x0: -15,
    y: 1.3,
    z0: 7.4,
    scale: [1.35, 0.48, 1.05],
    speed: 0.9,
    phase: 5.1,
    color: '#cf8850',
    puffs: [
      { offset: [-0.9, 0, 0.1], radius: 1.25, stretch: [1.5, 0.65, 1.15] },
      { offset: [0.7, 0.12, -0.15], radius: 1.1, stretch: [1.4, 0.6, 1.1] },
      { offset: [1.9, 0, 0.25], radius: 0.9, stretch: [1.3, 0.5, 1.0] },
    ],
  },
  {
    x0: 2,
    y: 1.8,
    z0: 9.2,
    scale: [1.3, 0.44, 1.0],
    speed: 1.15,
    phase: 2.7,
    color: '#dfa06a',
    puffs: [
      { offset: [-0.7, 0, 0], radius: 1.2, stretch: [1.5, 0.6, 1.1] },
      { offset: [0.8, 0.1, 0.2], radius: 1.05, stretch: [1.4, 0.55, 1.0] },
    ],
  },
  {
    x0: 15,
    y: 2.2,
    z0: -2.4,
    scale: [1.2, 0.4, 0.95],
    speed: 1.1,
    phase: 0.9,
    color: '#cf8850',
    puffs: [
      { offset: [-0.8, 0.05, 0.1], radius: 1.1, stretch: [1.5, 0.55, 1.1] },
      { offset: [0.7, 0, -0.2], radius: 1.25, stretch: [1.4, 0.6, 1.1] },
    ],
  },
]

const CLOUD_WRAP_HALF = 22

const MAX_PUFFS_PER_LAYER = 3

function DustHazeClouds({ intensity }: { intensity: number }) {
  const groupRefs = useRef<Array<Group | null>>([])
  const matRefs = useRef<Array<MeshStandardMaterial | null>>([])
  const baseOpacity = Math.min(0.46, 0.16 + intensity * 0.3)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let i = 0; i < DUST_CLOUD_LAYERS.length; i++) {
      const layer = DUST_CLOUD_LAYERS[i]!
      const grp = groupRefs.current[i]
      if (!grp) continue

      const span = CLOUD_WRAP_HALF * 2
      const rawX = layer.x0 + t * layer.speed
      const wrappedX = ((((rawX + CLOUD_WRAP_HALF) % span) + span) % span) - CLOUD_WRAP_HALF
      const rawZ = layer.z0 + t * layer.speed * 0.35
      const wrappedZ = ((((rawZ + CLOUD_WRAP_HALF) % span) + span) % span) - CLOUD_WRAP_HALF
      const bobY = layer.y + Math.sin(t * 0.65 + layer.phase) * 0.14

      grp.position.set(wrappedX, bobY, wrappedZ)

      const edgeDist = Math.max(Math.abs(wrappedX), Math.abs(wrappedZ))
      const edgeFade = edgeDist > 16 ? Math.max(0, 1 - (edgeDist - 16) / 6) : 1
      const targetOpacity = baseOpacity * edgeFade
      for (let p = 0; p < layer.puffs.length; p++) {
        const mat = matRefs.current[i * MAX_PUFFS_PER_LAYER + p]
        if (mat) mat.opacity = targetOpacity
      }
    }
  })

  return (
    <group>
      {DUST_CLOUD_LAYERS.map((layer, idx) => (
        <group
          key={idx}
          ref={(el) => {
            groupRefs.current[idx] = el
          }}
          position={[layer.x0, layer.y, layer.z0]}
          scale={layer.scale}
        >
          {layer.puffs.map((puff, pIdx) => (
            <mesh
              key={pIdx}
              position={puff.offset}
              scale={puff.stretch}
              raycast={CLOUD_NOOP_RAYCAST}
            >
              <dodecahedronGeometry args={[puff.radius, 0]} />
              <meshStandardMaterial
                ref={(el) => {
                  matRefs.current[idx * MAX_PUFFS_PER_LAYER + pIdx] = el
                }}
                color={layer.color}
                transparent
                opacity={baseOpacity}
                depthWrite={false}
                flatShading
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

interface TrailStripSpec {
  x: number
  z: number
  lenX: number
  lenZ: number
  axis: 'x' | 'z'
  length: number
}

interface JunctionNodeSpec {
  x: number
  z: number
}

interface DockRampSpec {
  x: number
  z: number
  rotY: number
}

interface CatwalkSpec {
  x: number
  z: number
  lenX: number
  lenZ: number
  axis: 'x' | 'z'
}

interface ColonialBeaconSpec {
  x: number
  z: number
  hasPoolLight: boolean
}

// Primary access/airlock outward normal [dx, dz] matching each structure's modeled door
const ENTRY_DIR_BY_TYPE: Record<string, readonly [number, number]> = {
  habitat: [1, 0],
  greenhouse: [1, 0],
  oxygen_generator: [-1, 0],
  iron_refinery: [0, 1],
  repair_workshop: [0, 1],
  steel_factory: [0, 1],
  ice_melter: [0, 1],
  mine: [0, 1],
  nuclear_reactor: [0, 1],
  battery: [0, 1],
  solar_panel: [0, 1],
}

const SUBGRID_STEP = 0.5
const MAX_BASE_POINT_LIGHTS = 6
const MIN_BEACON_SPACING_SQ = 1.15 * 1.15

let cachedGlowTexture: CanvasTexture | null = null
function getRadialGlowTexture(): CanvasTexture | null {
  if (cachedGlowTexture) return cachedGlowTexture
  if (typeof document === 'undefined') return null
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255, 224, 148, 0.92)')
  g.addColorStop(0.28, 'rgba(255, 162, 64, 0.52)')
  g.addColorStop(0.65, 'rgba(255, 110, 32, 0.16)')
  g.addColorStop(1, 'rgba(255, 88, 16, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  cachedGlowTexture = tex
  return tex
}

function BasePathwaysAndLights({
  structures,
  dark,
}: {
  structures: ReadonlyArray<StructureInstance>
  dark: boolean
}) {
  const glowTex = useMemo(() => getRadialGlowTexture(), [])
  const { strips, treadPlates, junctions, ramps, catwalks, beacons } = useMemo(() => {
    const nodes = structures.map((s, idx) => {
      const size = structureDef(s.type)?.size ?? 1
      const [cx, , cz] = tileCenter(s.tile, size, grid)
      return {
        idx,
        type: s.type,
        cx,
        cz,
        size,
        half: size * 0.5,
        padHalf: size * 0.44,
      }
    })

    const subW = grid.width * 2 + 1
    const subH = grid.height * 2 + 1
    const toWorldX = (ix: number) => ix * SUBGRID_STEP - grid.width * 0.5
    const toWorldZ = (iz: number) => iz * SUBGRID_STEP - grid.height * 0.5
    const keyOf = (ix: number, iz: number) => iz * subW + ix

    // Walkable subgrid excludes every structure footprint + clearance margin
    const walkable = new Uint8Array(subW * subH)
    for (let iz = 1; iz < subH - 1; iz++) {
      const wz = toWorldZ(iz)
      for (let ix = 1; ix < subW - 1; ix++) {
        const wx = toWorldX(ix)
        let ok = true
        for (const n of nodes) {
          const blockMargin = n.padHalf + 0.16
          if (Math.abs(wx - n.cx) < blockMargin && Math.abs(wz - n.cz) < blockMargin) {
            ok = false
            break
          }
        }
        walkable[keyOf(ix, iz)] = ok ? 1 : 0
      }
    }

    const rampList: DockRampSpec[] = []
    const catwalkList: CatwalkSpec[] = []
    const edgeSet = new Set<string>()
    const usedSubNodes = new Set<number>()
    const anchorOf = new Map<number, { ix: number; iz: number }>()

    const addEdge = (ax: number, az: number, bx: number, bz: number) => {
      const ka = keyOf(ax, az)
      const kb = keyOf(bx, bz)
      usedSubNodes.add(ka)
      usedSubNodes.add(kb)
      const edgeKey = ka < kb ? `${ka}-${kb}` : `${kb}-${ka}`
      edgeSet.add(edgeKey)
    }

    const findAdjacentNodeOnSide = (n: (typeof nodes)[number], dx: number, dz: number) => {
      const probeX = n.cx + dx * (n.half + 0.5)
      const probeZ = n.cz + dz * (n.half + 0.5)
      for (const other of nodes) {
        if (other.idx === n.idx) continue
        if (Math.abs(probeX - other.cx) < other.half && Math.abs(probeZ - other.cz) < other.half) {
          return other
        }
      }
      return null
    }

    // Union-Find for structures already connected via raised pad-to-pad catwalks
    const uf = nodes.map((_, i) => i)
    const findRoot = (i: number): number => {
      let r = i
      while (uf[r] !== r) r = uf[r]!
      while (uf[i] !== r) {
        const next = uf[i]!
        uf[i] = r
        i = next
      }
      return r
    }
    const unionNodes = (a: number, b: number) => {
      const ra = findRoot(a)
      const rb = findRoot(b)
      if (ra !== rb) uf[rb] = ra
    }

    const catwalkPairs = new Set<string>()
    const preferredCandidates = (pref: readonly [number, number]) => {
      const all: ReadonlyArray<readonly [number, number]> = [pref, [1, 0], [0, 1], [-1, 0], [0, -1]]
      const seen = new Set<string>()
      const out: Array<readonly [number, number]> = []
      for (const d of all) {
        const k = `${d[0]},${d[1]}`
        if (!seen.has(k)) {
          seen.add(k)
          out.push(d)
        }
      }
      return out
    }

    // 1. Collect candidate door access ramps (out to nearest walkable corridor) & elevated catwalks
    const rawBeaconSpots: Array<{ x: number; z: number; priority: number }> = []
    const extraSpurStrips: TrailStripSpec[] = []
    const catwalkNodes = new Set<number>()
    const pendingEntries: Array<{
      nodeIdx: number
      anchorKey: number
      ramp: DockRampSpec
      spur: TrailStripSpec | null
      beacon: { x: number; z: number; priority: number }
    }> = []

    const tryConnectCatwalk = (
      n: (typeof nodes)[number],
      other: (typeof nodes)[number],
      dx: number,
      dz: number,
    ) => {
      catwalkNodes.add(n.idx)
      catwalkNodes.add(other.idx)
      const pairKey = n.idx < other.idx ? `${n.idx}-${other.idx}` : `${other.idx}-${n.idx}`
      if (!catwalkPairs.has(pairKey)) {
        catwalkPairs.add(pairKey)
        unionNodes(n.idx, other.idx)
        if (dx !== 0) {
          const edgeA = n.cx + dx * n.padHalf
          const edgeB = other.cx - dx * other.padHalf
          const span = Math.abs(edgeB - edgeA) + 0.06
          catwalkList.push({
            x: (edgeA + edgeB) * 0.5,
            z: n.cz,
            lenX: Math.max(0.14, span),
            lenZ: 0.28,
            axis: 'x',
          })
        } else {
          const edgeA = n.cz + dz * n.padHalf
          const edgeB = other.cz - dz * other.padHalf
          const span = Math.abs(edgeB - edgeA) + 0.06
          catwalkList.push({
            x: n.cx,
            z: (edgeA + edgeB) * 0.5,
            lenX: 0.28,
            lenZ: Math.max(0.14, span),
            axis: 'z',
          })
        }
      }
    }

    for (const n of nodes) {
      const pref = ENTRY_DIR_BY_TYPE[n.type] ?? ([0, 1] as const)
      const dirs = preferredCandidates(pref)

      for (const [dx, dz] of dirs) {
        // World coordinate of first unobstructed corridor step outside pad
        const outDist = n.half + 0.5
        const targetX = n.cx + dx * outDist
        const targetZ = n.cz + dz * outDist
        const ix = Math.round((targetX + grid.width * 0.5) / SUBGRID_STEP)
        const iz = Math.round((targetZ + grid.height * 0.5) / SUBGRID_STEP)

        if (ix >= 1 && ix < subW - 1 && iz >= 1 && iz < subH - 1 && walkable[keyOf(ix, iz)] === 1) {
          const anchorKey = keyOf(ix, iz)
          anchorOf.set(n.idx, { ix, iz })
          usedSubNodes.add(anchorKey)

          const rampCenterDist = n.padHalf + 0.12
          const rampSpec: DockRampSpec = {
            x: n.cx + dx * rampCenterDist,
            z: n.cz + dz * rampCenterDist,
            rotY: Math.atan2(dx, dz),
          }

          const spurStart = n.padHalf + 0.22
          const spurLen = outDist - spurStart + 0.08
          let spurSpec: TrailStripSpec | null = null
          if (spurLen > 0.04) {
            const spurMid = spurStart + (outDist - spurStart) * 0.5
            const axis: 'x' | 'z' = dx !== 0 ? 'x' : 'z'
            spurSpec =
              axis === 'x'
                ? {
                    x: n.cx + dx * spurMid,
                    z: n.cz,
                    lenX: spurLen,
                    lenZ: 0.24,
                    axis: 'x',
                    length: spurLen,
                  }
                : {
                    x: n.cx,
                    z: n.cz + dz * spurMid,
                    lenX: 0.24,
                    lenZ: spurLen,
                    axis: 'z',
                    length: spurLen,
                  }
          }

          const sideX = dz !== 0 ? 1 : 0
          const sideZ = dx !== 0 ? 1 : 0
          pendingEntries.push({
            nodeIdx: n.idx,
            anchorKey,
            ramp: rampSpec,
            spur: spurSpec,
            beacon: {
              x: n.cx + dx * (n.padHalf + 0.26) + sideX * 0.22,
              z: n.cz + dz * (n.padHalf + 0.26) + sideZ * 0.22,
              priority: 2,
            },
          })
          break
        }
      }

      // Connect preferred-side touching neighbor via elevated catwalk first
      const neighbor = findAdjacentNodeOnSide(n, pref[0], pref[1])
      if (neighbor) {
        tryConnectCatwalk(n, neighbor, pref[0], pref[1])
      }
    }

    // Also link any touching structures still in separate components via elevated catwalks
    // (guarantees full grid saturation still forms a walkable elevated station network)
    for (const n of nodes) {
      const pref = ENTRY_DIR_BY_TYPE[n.type] ?? ([0, 1] as const)
      for (const [dx, dz] of preferredCandidates(pref)) {
        const touch = findAdjacentNodeOnSide(n, dx, dz)
        if (touch && findRoot(n.idx) !== findRoot(touch.idx)) {
          tryConnectCatwalk(n, touch, dx, dz)
        }
      }
    }

    // 2. Connect anchored components via MST + Dijkstra on free subgrid (reusing existing trails!)
    const anchoredList = nodes.filter((n) => anchorOf.has(n.idx))
    if (anchoredList.length >= 2) {
      // Order candidate pairs by Manhattan distance between anchors (Kruskal across components)
      const pairs: Array<{ a: number; b: number; dist: number }> = []
      for (let i = 0; i < anchoredList.length; i++) {
        for (let j = i + 1; j < anchoredList.length; j++) {
          const na = anchoredList[i]!
          const nb = anchoredList[j]!
          if (findRoot(na.idx) === findRoot(nb.idx)) continue
          const aa = anchorOf.get(na.idx)!
          const ab = anchorOf.get(nb.idx)!
          pairs.push({
            a: na.idx,
            b: nb.idx,
            dist: Math.abs(aa.ix - ab.ix) + Math.abs(aa.iz - ab.iz),
          })
        }
      }
      pairs.sort((p, q) => p.dist - q.dist)

      const totalCells = subW * subH
      const distArr = new Float32Array(totalCells)
      const prevCell = new Int32Array(totalCells)
      const prevDir = new Int8Array(totalCells)
      const visitedArr = new Uint8Array(totalCells)
      const dirs4: ReadonlyArray<readonly [number, number]> = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]

      for (const pair of pairs) {
        if (findRoot(pair.a) === findRoot(pair.b)) continue
        const start = anchorOf.get(pair.a)!
        const goal = anchorOf.get(pair.b)!
        const startK = keyOf(start.ix, start.iz)
        const goalK = keyOf(goal.ix, goal.iz)

        distArr.fill(Infinity)
        prevCell.fill(-1)
        prevDir.fill(-1)
        visitedArr.fill(0)
        distArr[startK] = 0

        let reached = false
        for (let iter = 0; iter < totalCells; iter++) {
          let u = -1
          let best = Infinity
          for (let k = 0; k < totalCells; k++) {
            if (visitedArr[k] === 0 && distArr[k]! < best) {
              best = distArr[k]!
              u = k
            }
          }
          if (u === -1 || u === goalK) {
            reached = u === goalK
            break
          }
          visitedArr[u] = 1
          const ux = u % subW
          const uz = (u - ux) / subW

          for (let d = 0; d < 4; d++) {
            const [dx, dz] = dirs4[d]!
            const vx = ux + dx
            const vz = uz + dz
            if (vx < 1 || vx >= subW - 1 || vz < 1 || vz >= subH - 1) continue
            const vk = keyOf(vx, vz)
            if (walkable[vk] === 0 || visitedArr[vk] === 1) continue

            // Prefer merging onto existing trails (0.35 cost) and minimizing zig-zag turns
            const stepCost = usedSubNodes.has(vk) ? 0.35 : 1.0
            const turnPenalty = prevDir[u] !== -1 && prevDir[u] !== d ? 0.2 : 0
            const alt = distArr[u]! + stepCost + turnPenalty
            if (alt < distArr[vk]!) {
              distArr[vk] = alt
              prevCell[vk] = u
              prevDir[vk] = d
            }
          }
        }

        if (reached) {
          let cur = goalK
          while (cur !== startK && prevCell[cur] !== -1) {
            const p = prevCell[cur]!
            const cx = cur % subW
            const cz = (cur - cx) / subW
            const px = p % subW
            const pz = (p - px) / subW
            addEdge(px, pz, cx, cz)
            cur = p
          }
          unionNodes(pair.a, pair.b)
        }
        // If no walkable ground route exists (walled off by buildings), skip drawing through pads
      }
    }

    // 3. Merge collinear subgrid edges into clean continuous trail runs & junction hubs
    const hRows = new Map<number, number[]>()
    const vCols = new Map<number, number[]>()
    const nodeDeg = new Map<number, { h: boolean; v: boolean; count: number }>()

    const markDeg = (k: number, isH: boolean) => {
      const cur = nodeDeg.get(k) ?? { h: false, v: false, count: 0 }
      nodeDeg.set(k, {
        h: cur.h || isH,
        v: cur.v || !isH,
        count: cur.count + 1,
      })
    }

    for (const ek of edgeSet) {
      const [sa, sb] = ek.split('-')
      const ka = Number(sa)
      const kb = Number(sb)
      const ax = ka % subW
      const az = (ka - ax) / subW
      const bx = kb % subW
      const bz = (kb - bx) / subW
      if (az === bz) {
        const minX = Math.min(ax, bx)
        const list = hRows.get(az) ?? []
        list.push(minX)
        hRows.set(az, list)
        markDeg(ka, true)
        markDeg(kb, true)
      } else {
        const minZ = Math.min(az, bz)
        const list = vCols.get(ax) ?? []
        list.push(minZ)
        vCols.set(ax, list)
        markDeg(ka, false)
        markDeg(kb, false)
      }
    }

    // Only emit door ramps/spurs when actually used by the trail network or standalone pad
    for (const entry of pendingEntries) {
      const usedInTrail = (nodeDeg.get(entry.anchorKey)?.count ?? 0) > 0
      if (usedInTrail || !catwalkNodes.has(entry.nodeIdx)) {
        rampList.push(entry.ramp)
        if (entry.spur) extraSpurStrips.push(entry.spur)
        rawBeaconSpots.push(entry.beacon)
      }
    }

    const stripList: TrailStripSpec[] = [...extraSpurStrips]
    for (const [iz, xs] of hRows) {
      xs.sort((a, b) => a - b)
      let start = xs[0]!
      let end = start + 1
      for (let i = 1; i < xs.length; i++) {
        if (xs[i] === end) {
          end++
        } else {
          const x0 = toWorldX(start)
          const x1 = toWorldX(end)
          const length = x1 - x0
          stripList.push({
            x: (x0 + x1) * 0.5,
            z: toWorldZ(iz),
            lenX: length + 0.12,
            lenZ: 0.26,
            axis: 'x',
            length,
          })
          start = xs[i]!
          end = start + 1
        }
      }
      const x0 = toWorldX(start)
      const x1 = toWorldX(end)
      const length = x1 - x0
      stripList.push({
        x: (x0 + x1) * 0.5,
        z: toWorldZ(iz),
        lenX: length + 0.12,
        lenZ: 0.26,
        axis: 'x',
        length,
      })
    }

    for (const [ix, zs] of vCols) {
      zs.sort((a, b) => a - b)
      let start = zs[0]!
      let end = start + 1
      for (let i = 1; i < zs.length; i++) {
        if (zs[i] === end) {
          end++
        } else {
          const z0 = toWorldZ(start)
          const z1 = toWorldZ(end)
          const length = z1 - z0
          stripList.push({
            x: toWorldX(ix),
            z: (z0 + z1) * 0.5,
            lenX: 0.26,
            lenZ: length + 0.12,
            axis: 'z',
            length,
          })
          start = zs[i]!
          end = start + 1
        }
      }
      const z0 = toWorldZ(start)
      const z1 = toWorldZ(end)
      const length = z1 - z0
      stripList.push({
        x: toWorldX(ix),
        z: (z0 + z1) * 0.5,
        lenX: 0.26,
        lenZ: length + 0.12,
        axis: 'z',
        length,
      })
    }

    // Junction plates & trail-side beacons at corners / T-intersections
    const junctionList: JunctionNodeSpec[] = []
    for (const [k, info] of nodeDeg) {
      if ((info.h && info.v) || info.count >= 3) {
        const ix = k % subW
        const iz = (k - ix) / subW
        const jx = toWorldX(ix)
        const jz = toWorldZ(iz)
        junctionList.push({ x: jx, z: jz })
        // Put a trail-side colonial beacon tucked right at the shoulder of each intersection
        rawBeaconSpots.push({ x: jx + 0.18, z: jz + 0.18, priority: 1 })
        rawBeaconSpots.push({ x: jx - 0.18, z: jz - 0.18, priority: 0 })
      }
    }

    // Add salvaged metallic tread-plates spaced along compacted regolith tracks
    const plateList: Array<{ x: number; z: number; lenX: number; lenZ: number }> = []
    for (const s of stripList) {
      const count = Math.max(1, Math.floor(s.length / 0.34))
      if (s.axis === 'x') {
        const xMin = s.x - s.length * 0.5
        for (let i = 0; i < count; i++) {
          const px = xMin + ((i + 0.5) / count) * s.length
          plateList.push({ x: px, z: s.z, lenX: 0.16, lenZ: 0.22 })
        }
      } else {
        const zMin = s.z - s.length * 0.5
        for (let i = 0; i < count; i++) {
          const pz = zMin + ((i + 0.5) / count) * s.length
          plateList.push({ x: s.x, z: pz, lenX: 0.22, lenZ: 0.16 })
        }
      }

      // Along longer straight runs, tuck a trail-side beacon right beside the path shoulder
      if (s.length >= 2.1) {
        const midCount = Math.floor(s.length / 1.85)
        for (let m = 1; m <= midCount; m++) {
          const frac = m / (midCount + 1) - 0.5
          if (s.axis === 'x') {
            rawBeaconSpots.push({ x: s.x + frac * s.length, z: s.z + 0.19, priority: 0 })
          } else {
            rawBeaconSpots.push({ x: s.x + 0.19, z: s.z + frac * s.length, priority: 0 })
          }
        }
      }
    }

    // Filter beacons strictly: inside grid, clear of all pads/tracks, well-spaced, ramp-side priority
    const halfGridX = grid.width * 0.5 - 0.15
    const halfGridZ = grid.height * 0.5 - 0.15
    const isSpotClear = (bx: number, bz: number) => {
      if (Math.abs(bx) > halfGridX || Math.abs(bz) > halfGridZ) return false
      for (const n of nodes) {
        const padMargin = n.padHalf + 0.11
        if (Math.abs(bx - n.cx) < padMargin && Math.abs(bz - n.cz) < padMargin) {
          return false
        }
      }
      for (const s of stripList) {
        if (Math.abs(bx - s.x) < s.lenX * 0.45 && Math.abs(bz - s.z) < s.lenZ * 0.45) {
          return false
        }
      }
      return true
    }

    rawBeaconSpots.sort((a, b) => b.priority - a.priority)
    const placedBeacons: Array<{ x: number; z: number }> = []
    for (const cand of rawBeaconSpots) {
      if (!isSpotClear(cand.x, cand.z)) continue
      let tooClose = false
      for (const existing of placedBeacons) {
        const dx = existing.x - cand.x
        const dz = existing.z - cand.z
        if (dx * dx + dz * dz < MIN_BEACON_SPACING_SQ) {
          tooClose = true
          break
        }
      }
      if (!tooClose) placedBeacons.push({ x: cand.x, z: cand.z })
    }

    const poolSet = new Set<number>()
    if (placedBeacons.length <= MAX_BASE_POINT_LIGHTS) {
      for (let i = 0; i < placedBeacons.length; i++) poolSet.add(i)
    } else {
      for (let k = 0; k < MAX_BASE_POINT_LIGHTS; k++) {
        poolSet.add(Math.floor((k * placedBeacons.length) / MAX_BASE_POINT_LIGHTS))
      }
    }

    const finalBeacons: ColonialBeaconSpec[] = placedBeacons.map((b, idx) => ({
      x: b.x,
      z: b.z,
      hasPoolLight: poolSet.has(idx),
    }))

    return {
      strips: stripList,
      treadPlates: plateList,
      junctions: junctionList,
      ramps: rampList,
      catwalks: catwalkList,
      beacons: finalBeacons,
    }
  }, [structures])

  return (
    <group>
      {/* Compacted Martian regolith rover/boot track beds */}
      {strips.map((seg, idx) => (
        <mesh
          key={`track-bed-${idx}`}
          position={[seg.x, 0.011, seg.z]}
          raycast={CLOUD_NOOP_RAYCAST}
        >
          <boxGeometry args={[seg.lenX, 0.004, seg.lenZ]} />
          <meshStandardMaterial color="#7d321b" roughness={0.96} flatShading />
        </mesh>
      ))}

      {/* Salvaged modular steel tread-plates laid across the compacted Martian track */}
      {treadPlates.map((p, idx) => (
        <mesh key={`tread-plate-${idx}`} position={[p.x, 0.016, p.z]} raycast={CLOUD_NOOP_RAYCAST}>
          <boxGeometry args={[p.lenX, 0.008, p.lenZ]} />
          <meshStandardMaterial
            color={idx % 2 === 0 ? '#515f70' : '#404b59'}
            roughness={0.82}
            flatShading
          />
        </mesh>
      ))}

      {/* Chamfered intersection plates with subtle colonial safety marker */}
      {junctions.map((j, idx) => (
        <group key={`jct-${idx}`} position={[j.x, 0, j.z]}>
          <mesh position={[0, 0.019, 0]} raycast={CLOUD_NOOP_RAYCAST}>
            <boxGeometry args={[0.3, 0.01, 0.3]} />
            <meshStandardMaterial color="#556375" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 0.025, 0]} raycast={CLOUD_NOOP_RAYCAST}>
            <boxGeometry args={[0.1, 0.004, 0.1]} />
            <meshStandardMaterial color="#ff7a29" roughness={0.65} flatShading />
          </mesh>
        </group>
      ))}

      {/* Sloped steel entry ramps linking module airlock doors down to ground trails */}
      {ramps.map((r, idx) => (
        <group key={`ramp-${idx}`} position={[r.x, 0.058, r.z]} rotation={[0, r.rotY, 0]}>
          <mesh rotation={[0.38, 0, 0]} raycast={CLOUD_NOOP_RAYCAST}>
            <boxGeometry args={[0.28, 0.02, 0.28]} />
            <meshStandardMaterial color="#586678" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[-0.135, 0.018, 0]} rotation={[0.38, 0, 0]} raycast={CLOUD_NOOP_RAYCAST}>
            <boxGeometry args={[0.02, 0.028, 0.27]} />
            <meshStandardMaterial color="#ff7a29" flatShading />
          </mesh>
          <mesh position={[0.135, 0.018, 0]} rotation={[0.38, 0, 0]} raycast={CLOUD_NOOP_RAYCAST}>
            <boxGeometry args={[0.02, 0.028, 0.27]} />
            <meshStandardMaterial color="#ff7a29" flatShading />
          </mesh>
        </group>
      ))}

      {/* Elevated modular catwalk bridges connecting adjacent structures directly */}
      {catwalks.map((c, idx) => (
        <group key={`catwalk-${idx}`} position={[c.x, 0.095, c.z]}>
          <mesh raycast={CLOUD_NOOP_RAYCAST}>
            <boxGeometry args={[c.lenX, 0.024, c.lenZ]} />
            <meshStandardMaterial color="#586678" roughness={0.78} flatShading />
          </mesh>
          <mesh
            position={[
              c.axis === 'x' ? 0 : c.lenX * 0.45,
              0.024,
              c.axis === 'x' ? c.lenZ * 0.45 : 0,
            ]}
            raycast={CLOUD_NOOP_RAYCAST}
          >
            <boxGeometry
              args={[c.axis === 'x' ? c.lenX : 0.024, 0.026, c.axis === 'x' ? 0.024 : c.lenZ]}
            />
            <meshStandardMaterial color="#ff7a29" flatShading />
          </mesh>
          <mesh
            position={[
              c.axis === 'x' ? 0 : -c.lenX * 0.45,
              0.024,
              c.axis === 'x' ? -c.lenZ * 0.45 : 0,
            ]}
            raycast={CLOUD_NOOP_RAYCAST}
          >
            <boxGeometry
              args={[c.axis === 'x' ? c.lenX : 0.024, 0.026, c.axis === 'x' ? 0.024 : c.lenZ]}
            />
            <meshStandardMaterial color="#ff7a29" flatShading />
          </mesh>
        </group>
      ))}

      {/* Compact low-poly colonial path beacons tucked cleanly alongside ramps & junctions */}
      {beacons.map((b, idx) => (
        <group key={`beacon-${idx}`} position={[b.x, 0, b.z]}>
          {/* Anchored base plate */}
          <mesh position={[0, 0.014, 0]} raycast={CLOUD_NOOP_RAYCAST}>
            <cylinderGeometry args={[0.028, 0.036, 0.028, 6]} />
            <meshStandardMaterial color="#2e3846" flatShading />
          </mesh>
          {/* Compact white-hull colonial mast matching structure hull palette */}
          <mesh position={[0, 0.09, 0]} raycast={CLOUD_NOOP_RAYCAST}>
            <cylinderGeometry args={[0.011, 0.014, 0.13, 6]} />
            <meshStandardMaterial color="#cfd8e3" flatShading />
          </mesh>
          {/* Safety-orange beacon collar */}
          <mesh position={[0, 0.145, 0]} raycast={CLOUD_NOOP_RAYCAST}>
            <cylinderGeometry args={[0.018, 0.018, 0.02, 6]} />
            <meshStandardMaterial color="#ff7a29" flatShading />
          </mesh>
          {/* Exposed overhead prismatic LED emitter (100% lit & visible from isometric camera) */}
          <mesh position={[0, 0.182, 0]} raycast={CLOUD_NOOP_RAYCAST}>
            <octahedronGeometry args={[0.027, 0]} />
            <meshStandardMaterial
              color={dark ? '#ffecad' : '#9eb4c9'}
              emissive={dark ? '#ffbb42' : '#000000'}
              emissiveIntensity={dark ? 2.8 : 0}
              flatShading
            />
          </mesh>
          {/* Radiant ground pool + head bloom on 100% of beacons during winter darkness */}
          {dark && glowTex && (
            <>
              <sprite position={[0, 0.185, 0]} scale={[0.32, 0.32, 1]} raycast={CLOUD_NOOP_RAYCAST}>
                <spriteMaterial
                  map={glowTex}
                  blending={AdditiveBlending}
                  transparent
                  opacity={0.85}
                  depthWrite={false}
                />
              </sprite>
              <mesh position={[0, 0.028, 0]} rotation-x={-Math.PI / 2} raycast={CLOUD_NOOP_RAYCAST}>
                <planeGeometry args={[1.65, 1.65]} />
                <meshBasicMaterial
                  map={glowTex}
                  blending={AdditiveBlending}
                  transparent
                  opacity={0.78}
                  depthWrite={false}
                />
              </mesh>
            </>
          )}
          {dark && b.hasPoolLight && (
            <pointLight
              position={[0, 0.24, 0]}
              color="#ffb85c"
              intensity={1.35}
              distance={3.5}
              decay={2}
            />
          )}
        </group>
      ))}
    </group>
  )
}

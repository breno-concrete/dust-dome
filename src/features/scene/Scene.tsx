// Owner: Dev C. Isometric 2.5D base (constitution V): orthographic camera at a fixed
// isometric angle, 90° stepped rotation, bounded zoom, 12x12 grid, low-poly structure
// models, placement preview, click to place or select.
// No physics, no walking, no collisions. Store actions allowed here:
// hoverAt, placeAt, selectStructure.
import { MapControls } from '@react-three/drei'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { lazy, Suspense, useEffect, useState } from 'react'
import { placementPreview, structureDef } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'
import type { DevVisualOverrides } from './DevVisualInspector'
import {
  cameraPositionForStep,
  rotateStep,
  tileCenter,
  worldToTile,
  type RotationStep,
} from './iso'
import styles from './Scene.module.css'
import { StructureModel } from './StructureModel'
import { visualState, type VisualState } from './visualState'

const grid = config.mission.grid
const GROUND = '#b5532f'
const SURROUND_TERRAIN = '#944222'
const CLIFF_OCHRE = '#c76538'

// Strict dev/prod barrier: Vite replaces import.meta.env.DEV with false in production builds,
// so DevVisualInspector is neither rendered nor bundled into the production Scene chunk.
const DevVisualInspector =
  import.meta.env.DEV && !import.meta.env.VITEST
    ? lazy(() => import('./DevVisualInspector'))
    : null

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

  const skyColor = look.radiationTint
    ? '#421414'
    : look.dark
      ? '#070818'
      : look.dustHaze > 0.1
        ? '#7a3c1e'
        : '#2a1a16'
  const ambientColor = look.radiationTint
    ? '#ff7a70'
    : look.dark
      ? '#5c66b8'
      : look.dustHaze > 0.1
        ? '#e0915a'
        : '#ffd9c4'
  const sunColor = look.radiationTint ? '#ff5a4d' : look.dark ? '#7c88e0' : '#fff2e2'

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
              '#b85d32',
              Math.max(4, 18 - look.dustHaze * 12),
              Math.max(22, 65 - look.dustHaze * 40),
            ]}
          />
        )}
        <ambientLight color={ambientColor} intensity={0.28 + 0.62 * look.light} />
        <directionalLight color={sunColor} position={[8, 12, 4]} intensity={1.4 * look.light} />

        <CameraRig step={rotationStep} />

        {/* Surrounding Hellas Planitia crater floor and faceted rock plateaus (Lote 3) */}
        <SurroundingTerrain />

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
                opacity={0.65}
              />
            </mesh>
          )
        })}

        <MapControls enableRotate={false} enablePan={false} minZoom={25} maxZoom={90} />
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

function CameraRig({ step }: { step: RotationStep }) {
  const [targetX, targetY, targetZ] = cameraPositionForStep(step)
  useFrame(({ camera }, delta) => {
    const alpha = Math.min(1, delta * 8)
    camera.position.x += (targetX - camera.position.x) * alpha
    camera.position.y += (targetY - camera.position.y) * alpha
    camera.position.z += (targetZ - camera.position.z) * alpha
    camera.lookAt(0, 0, 0)
  })
  return null
}

function SurroundingTerrain() {
  return (
    <group>
      <mesh position={[0, -0.04, 0]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial color={SURROUND_TERRAIN} flatShading />
      </mesh>
      {/* Low-poly mesa outcrops around the perimeter */}
      <mesh position={[-8.5, 0.45, -7.5]} raycast={() => null}>
        <dodecahedronGeometry args={[1.4, 0]} />
        <meshStandardMaterial color={CLIFF_OCHRE} flatShading />
      </mesh>
      <mesh position={[8.2, 0.55, -8.0]} raycast={() => null}>
        <dodecahedronGeometry args={[1.6, 0]} />
        <meshStandardMaterial color={SURROUND_TERRAIN} flatShading />
      </mesh>
      <mesh position={[-8.0, 0.35, 8.2]} raycast={() => null}>
        <dodecahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial color={CLIFF_OCHRE} flatShading />
      </mesh>
      <mesh position={[8.5, 0.4, 7.8]} raycast={() => null}>
        <dodecahedronGeometry args={[1.3, 0]} />
        <meshStandardMaterial color={SURROUND_TERRAIN} flatShading />
      </mesh>
    </group>
  )
}

const DUST_CLOUD_POSITIONS: ReadonlyArray<readonly [number, number, number, number]> = [
  [-6.2, 1.8, -5.5, 1.3],
  [5.8, 2.2, -4.8, 1.5],
  [-4.5, 2.0, 5.6, 1.4],
  [6.0, 1.7, 5.2, 1.2],
  [0.5, 2.6, -6.4, 1.6],
  [-0.8, 2.4, 6.2, 1.4],
]

function DustHazeClouds({ intensity }: { intensity: number }) {
  const opacity = Math.min(0.55, 0.15 + intensity * 0.4)
  return (
    <group>
      {DUST_CLOUD_POSITIONS.map(([x, y, z, radius], idx) => (
        <mesh key={idx} position={[x, y, z]} scale={[1.5, 0.55, 1.2]} raycast={() => null}>
          <dodecahedronGeometry args={[radius, 0]} />
          <meshStandardMaterial color={CLIFF_OCHRE} transparent opacity={opacity} flatShading />
        </mesh>
      ))}
    </group>
  )
}


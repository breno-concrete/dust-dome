// Owner: Dev C. Isometric 2.5D base (constitution V): orthographic camera at a fixed
// isometric angle, 90° stepped rotation, bounded zoom, 12x12 grid, low-poly structure
// models, placement preview, click to place or select.
// No physics, no walking, no collisions. Store actions allowed here:
// hoverAt, placeAt, selectStructure.
import { MapControls } from '@react-three/drei'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { placementPreview, structureDef } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { Button } from '../../ui-kit/Button'
import { useT } from '../../ui-kit/i18n'
import {
  cameraPositionForStep,
  rotateStep,
  tileCenter,
  worldToTile,
  type RotationStep,
} from './iso'
import styles from './Scene.module.css'
import { StructureModel } from './StructureModel'
import { visualState } from './visualState'

const grid = config.mission.grid
const GROUND = '#b5532f'
const SURROUND_TERRAIN = '#944222'
const CLIFF_OCHRE = '#c76538'

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
  const look = visualState(game, config)
  // Derived in render: a store selector must never return a new object (infinite re-render).
  const preview = placementPreview({ game, placing, hoverTile })

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
      <Canvas
        orthographic
        camera={{ position: cameraPositionForStep(0), zoom: 42, near: -100, far: 200 }}
      >
        <color attach="background" args={[look.dark ? '#05070d' : '#2a1a16']} />
        <ambientLight intensity={0.25 + 0.6 * look.light} />
        <directionalLight position={[8, 12, 4]} intensity={1.4 * look.light} />

        <CameraRig step={rotationStep} />

        {/* Surrounding Hellas Planitia crater floor and faceted rock plateaus (Lote 3) */}
        <SurroundingTerrain />

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
          return (
            <StructureModel
              key={s.id}
              structure={s}
              size={size}
              position={[x, 0, z]}
              selected={s.id === selectedId}
              onSelect={selectStructure}
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

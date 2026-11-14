// Owner: Dev C. Isometric 2.5D base (constitution V): orthographic camera at a fixed
// isometric angle, 12x12 grid, placement preview, click to place or select.
// No physics, no walking, no collisions. Store actions allowed here:
// hoverAt, placeAt, selectStructure. Placeholder boxes: replace with low-poly models.
import { MapControls } from '@react-three/drei'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { placementPreview, structureDef } from '../../app/selectors'
import { useGameStore } from '../../app/store'
import { config } from '../../config/loadConfig'
import { tileCenter, worldToTile } from './iso'
import { STATUS_COLOR, visualState } from './visualState'

const grid = config.mission.grid
const GROUND = '#b5532f'

export default function Scene() {
  const game = useGameStore((s) => s.game)
  const selectedId = useGameStore((s) => s.selectedStructureId)
  const hoverTile = useGameStore((s) => s.hoverTile)
  const hoverAt = useGameStore((s) => s.hoverAt)
  const placeAt = useGameStore((s) => s.placeAt)
  const placing = useGameStore((s) => s.placing)
  const selectStructure = useGameStore((s) => s.selectStructure)

  if (!game) return null
  const look = visualState(game, config)
  // Derived in render: a store selector must never return a new object (infinite re-render).
  const preview = placementPreview({ game, placing, hoverTile })

  const onGroundMove = (e: ThreeEvent<PointerEvent>) =>
    hoverAt(worldToTile(e.point.x, e.point.z, grid))
  const onGroundClick = (e: ThreeEvent<MouseEvent>) => {
    const tile = worldToTile(e.point.x, e.point.z, grid)
    if (placing && tile) placeAt(tile)
    else selectStructure(null)
  }

  return (
    <Canvas orthographic camera={{ position: [14, 14, 14], zoom: 42, near: -100, far: 200 }}>
      <color attach="background" args={[look.dark ? '#05070d' : '#2a1a16']} />
      <ambientLight intensity={0.25 + 0.6 * look.light} />
      <directionalLight position={[8, 12, 4]} intensity={1.4 * look.light} />

      <mesh rotation-x={-Math.PI / 2} onPointerMove={onGroundMove} onClick={onGroundClick}>
        <planeGeometry args={[grid.width, grid.height]} />
        <meshStandardMaterial color={GROUND} />
      </mesh>
      <gridHelper args={[grid.width, grid.width, '#6b2a18', '#6b2a18']} position={[0, 0.01, 0]} />

      {game.structures.map((s) => {
        const size = structureDef(s.type)?.size ?? 1
        const [x, , z] = tileCenter(s.tile, size, grid)
        return (
          <mesh
            key={s.id}
            position={[x, 0.4, z]}
            onClick={(e) => {
              e.stopPropagation()
              selectStructure(s.id)
            }}
          >
            <boxGeometry args={[size * 0.9, 0.8, size * 0.9]} />
            <meshStandardMaterial
              color={STATUS_COLOR[s.status]}
              emissive={s.id === selectedId ? '#ffb347' : '#000000'}
              emissiveIntensity={0.5}
            />
          </mesh>
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
              opacity={0.6}
            />
          </mesh>
        )
      })}

      <MapControls enableRotate={false} minZoom={25} maxZoom={90} />
    </Canvas>
  )
}

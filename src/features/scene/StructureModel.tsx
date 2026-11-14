// Owner: Dev C. Distinct low-poly 3D models for all 11 Martian outpost structures.
// Follows specs/004-base-scene/visual-references/README.md: flat-shaded low-poly
// silhouettes, high-contrast white/light-gray hulls (#f0f2f5, #d9e0e8), safety-orange
// accents (#ff7a29), mint-green bio/energy highlights (#5bd6a0), and stilt foundations.
import type { ThreeEvent } from '@react-three/fiber'
import type { StructureInstance } from '../../engine/types'
import { STATUS_COLOR } from './visualState'

const HULL_WHITE = '#f0f2f5'
const HULL_GRAY = '#d9e0e8'
const METAL_DARK = '#2e3846'
const SAFETY_ORANGE = '#ff7a29'
const MINT_GREEN = '#5bd6a0'
const SOLAR_BLUE = '#1e3a5f'
const WATER_BLUE = '#63c5da'
const MARS_ROCK = '#944222'
const SELECTED_EMISSIVE = '#ffb347'

export interface StructureModelProps {
  structure: StructureInstance
  size: number
  position: [number, number, number]
  selected: boolean
  onSelect: (id: string) => void
}

export function StructureModel({
  structure,
  size,
  position,
  selected,
  onSelect,
}: StructureModelProps) {
  const statusColor = STATUS_COLOR[structure.status]
  const hullColor = structure.status === 'active' ? HULL_WHITE : statusColor
  const secondaryColor = structure.status === 'active' ? HULL_GRAY : statusColor
  const emissive = selected ? SELECTED_EMISSIVE : '#000000'
  const emissiveIntensity = selected ? 0.35 : 0

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect(structure.id)
  }

  return (
    <group position={position} onClick={handleClick}>
      {/* Elevated stilt foundation pad (Lote 3 visual reference) */}
      <FoundationPad size={size} selected={selected} statusColor={statusColor} />

      {/* Structure-specific low-poly model (Lote 1 & 2 visual reference) */}
      <StructureMesh
        type={structure.type}
        hullColor={hullColor}
        secondaryColor={secondaryColor}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </group>
  )
}

function FoundationPad({
  size,
  selected,
  statusColor,
}: {
  size: number
  selected: boolean
  statusColor: string
}) {
  const span = size * 0.88
  const legOffset = span * 0.4
  return (
    <group>
      {/* Platform deck */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[span, 0.08, span]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      {/* Corner stilts */}
      {(
        [
          [-legOffset, -legOffset],
          [legOffset, -legOffset],
          [-legOffset, legOffset],
          [legOffset, legOffset],
        ] as const
      ).map(([lx, lz], idx) => (
        <mesh key={idx} position={[lx, 0.04, lz]}>
          <cylinderGeometry args={[0.05, 0.06, 0.08, 6]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      ))}
      {/* Status trim ring */}
      <mesh position={[0, 0.13, 0]}>
        <boxGeometry args={[span * 0.96, 0.02, span * 0.96]} />
        <meshStandardMaterial color={statusColor} flatShading />
      </mesh>
      {/* Selection highlight ring */}
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[size * 0.52, size * 0.62, 24]} />
          <meshBasicMaterial color={SELECTED_EMISSIVE} />
        </mesh>
      )}
    </group>
  )
}

function StructureMesh({
  type,
  hullColor,
  secondaryColor,
  emissive,
  emissiveIntensity,
}: {
  type: string
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
}) {
  switch (type) {
    case 'habitat':
      return (
        <group position={[0, 0.12, 0]}>
          {/* Main polygonal geodesic dome (2x2) */}
          <mesh position={[0, 0.35, 0]}>
            <dodecahedronGeometry args={[0.68, 0]} />
            <meshStandardMaterial
              color={hullColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          {/* Upper hatch collar */}
          <mesh position={[0, 0.88, 0]}>
            <cylinderGeometry args={[0.28, 0.34, 0.12, 8]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
          {/* Airlock tunnel */}
          <mesh position={[0.55, 0.22, 0]}>
            <boxGeometry args={[0.42, 0.32, 0.36]} />
            <meshStandardMaterial color={secondaryColor} flatShading />
          </mesh>
          {/* Glowing viewport */}
          <mesh position={[0, 0.42, 0.62]}>
            <boxGeometry args={[0.32, 0.14, 0.08]} />
            <meshStandardMaterial
              color={MINT_GREEN}
              emissive={MINT_GREEN}
              emissiveIntensity={0.4}
              flatShading
            />
          </mesh>
        </group>
      )

    case 'solar_panel':
      return (
        <group position={[0, 0.12, 0]}>
          {/* Support mast */}
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.06, 0.09, 0.44, 6]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          {/* Tilted low-poly solar array */}
          <mesh position={[0, 0.44, 0]} rotation={[0.45, 0, 0]}>
            <boxGeometry args={[0.76, 0.05, 0.68]} />
            <meshStandardMaterial
              color={SOLAR_BLUE}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          {/* Safety-orange frame accent */}
          <mesh position={[0, 0.46, -0.3]} rotation={[0.45, 0, 0]}>
            <boxGeometry args={[0.78, 0.06, 0.06]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
        </group>
      )

    case 'battery':
      return (
        <group position={[0, 0.12, 0]}>
          {/* Dual cylindrical battery cells */}
          <mesh position={[-0.16, 0.32, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.6, 8]} />
            <meshStandardMaterial
              color={hullColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          <mesh position={[0.16, 0.32, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.6, 8]} />
            <meshStandardMaterial
              color={secondaryColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          {/* Charge status light bar */}
          <mesh position={[0, 0.64, 0]}>
            <boxGeometry args={[0.5, 0.08, 0.22]} />
            <meshStandardMaterial
              color={MINT_GREEN}
              emissive={MINT_GREEN}
              emissiveIntensity={0.35}
              flatShading
            />
          </mesh>
        </group>
      )

    case 'mine':
      return (
        <group position={[0, 0.12, 0]}>
          {/* Excavated Martian rock berm (2x2) */}
          <mesh position={[-0.25, 0.26, -0.2]}>
            <dodecahedronGeometry args={[0.52, 0]} />
            <meshStandardMaterial color={MARS_ROCK} flatShading />
          </mesh>
          {/* Headframe gantry */}
          <mesh position={[0.25, 0.52, 0.15]}>
            <boxGeometry args={[0.55, 0.85, 0.55]} />
            <meshStandardMaterial
              color={secondaryColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          {/* Crane boom */}
          <mesh position={[0.1, 0.98, 0.15]} rotation={[0, 0, 0.25]}>
            <boxGeometry args={[0.85, 0.12, 0.16]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
        </group>
      )

    case 'oxygen_generator':
      return (
        <group position={[0, 0.12, 0]}>
          {/* MOXIE-style atmospheric processor core */}
          <mesh position={[-0.12, 0.28, 0]}>
            <boxGeometry args={[0.42, 0.52, 0.56]} />
            <meshStandardMaterial
              color={hullColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          {/* Pressurized O2 spherical tank */}
          <mesh position={[0.22, 0.34, 0]}>
            <icosahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color={WATER_BLUE} flatShading />
          </mesh>
          {/* Intake stack */}
          <mesh position={[-0.12, 0.64, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 0.22, 6]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
        </group>
      )

    case 'ice_melter':
      return (
        <group position={[0, 0.12, 0]}>
          {/* Heated melting tank */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.32, 0.36, 0.54, 8]} />
            <meshStandardMaterial
              color={hullColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          {/* Water dome */}
          <mesh position={[0, 0.6, 0]}>
            <icosahedronGeometry args={[0.24, 0]} />
            <meshStandardMaterial color={WATER_BLUE} flatShading />
          </mesh>
          {/* Thermal heating ring */}
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.37, 0.37, 0.1, 8]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
        </group>
      )

    case 'iron_refinery':
      return (
        <group position={[0, 0.12, 0]}>
          {/* Smelter base hall (2x2) */}
          <mesh position={[-0.2, 0.3, 0]}>
            <boxGeometry args={[0.95, 0.56, 1.1]} />
            <meshStandardMaterial
              color={secondaryColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          {/* Blast furnace cone */}
          <mesh position={[0.42, 0.55, -0.25]}>
            <cylinderGeometry args={[0.22, 0.38, 1.05, 8]} />
            <meshStandardMaterial color={hullColor} flatShading />
          </mesh>
          {/* Twin exhaust stacks */}
          <mesh position={[0.42, 0.62, 0.35]}>
            <cylinderGeometry args={[0.12, 0.16, 1.15, 6]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          {/* Glowing furnace core */}
          <mesh position={[0.42, 0.25, -0.25]}>
            <cylinderGeometry args={[0.4, 0.4, 0.16, 8]} />
            <meshStandardMaterial
              color={SAFETY_ORANGE}
              emissive={SAFETY_ORANGE}
              emissiveIntensity={0.4}
              flatShading
            />
          </mesh>
        </group>
      )

    case 'greenhouse':
      return (
        <group position={[0, 0.12, 0]}>
          {/* Pressurized base rim (2x2) */}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.78, 0.82, 0.22, 8]} />
            <meshStandardMaterial
              color={hullColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          {/* Bright green interior crop beds (visible from afar per Lote 2) */}
          <mesh position={[0, 0.32, 0]}>
            <dodecahedronGeometry args={[0.48, 0]} />
            <meshStandardMaterial
              color={MINT_GREEN}
              emissive={MINT_GREEN}
              emissiveIntensity={0.35}
              flatShading
            />
          </mesh>
          {/* Translucent geodesic biosphere dome */}
          <mesh position={[0, 0.42, 0]}>
            <icosahedronGeometry args={[0.74, 0]} />
            <meshStandardMaterial color="#d9f7ea" transparent opacity={0.55} flatShading />
          </mesh>
        </group>
      )

    case 'repair_workshop':
      return (
        <group position={[0, 0.12, 0]}>
          {/* Workshop cabin (1x1) */}
          <mesh position={[0, 0.26, 0]}>
            <boxGeometry args={[0.68, 0.48, 0.68]} />
            <meshStandardMaterial
              color={hullColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          {/* Chamfered orange tool roof */}
          <mesh position={[0, 0.56, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.52, 0.22, 4]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
        </group>
      )

    case 'steel_factory':
      return (
        <group position={[0, 0.12, 0]}>
          {/* Main alloy mill hall (2x2) */}
          <mesh position={[0, 0.36, -0.15]}>
            <boxGeometry args={[1.4, 0.68, 0.95]} />
            <meshStandardMaterial
              color={hullColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          {/* Horizontal carbon gas tanks (Lote 2 img3) */}
          <mesh position={[-0.35, 0.28, 0.5]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.18, 0.18, 0.62, 8]} />
            <meshStandardMaterial color={secondaryColor} flatShading />
          </mesh>
          <mesh position={[0.35, 0.28, 0.5]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.18, 0.18, 0.62, 8]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
          {/* Roof ridge */}
          <mesh position={[0, 0.78, -0.15]}>
            <boxGeometry args={[1.2, 0.16, 0.4]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
        </group>
      )

    case 'nuclear_reactor':
      return (
        <group position={[0, 0.12, 0]}>
          {/* Shielded reactor vessel (2x2) */}
          <mesh position={[0, 0.48, 0]}>
            <cylinderGeometry args={[0.36, 0.44, 0.9, 8]} />
            <meshStandardMaterial
              color={hullColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          {/* Cross-shaped radiator fins (NASA Fission Surface Power) */}
          <mesh position={[0, 0.52, 0]}>
            <boxGeometry args={[1.5, 0.56, 0.08]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <boxGeometry args={[0.08, 0.56, 1.5]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          {/* Cherenkov/power core glow ring */}
          <mesh position={[0, 0.96, 0]}>
            <cylinderGeometry args={[0.28, 0.34, 0.14, 8]} />
            <meshStandardMaterial
              color={MINT_GREEN}
              emissive={MINT_GREEN}
              emissiveIntensity={0.5}
              flatShading
            />
          </mesh>
        </group>
      )

    default:
      return (
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.8, 0.7, 0.8]} />
          <meshStandardMaterial
            color={hullColor}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            flatShading
          />
        </mesh>
      )
  }
}

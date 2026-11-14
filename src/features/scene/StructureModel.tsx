// Owner: Dev C. Distinct low-poly 3D models for all 11 Martian outpost structures.
// Follows specs/004-base-scene/visual-references/README.md: flat-shaded low-poly
// silhouettes, high-contrast white/light-gray hulls (#f0f2f5, #d9e0e8), safety-orange
// accents (#ff7a29), mint-green bio/energy highlights (#5bd6a0), stilt foundations,
// and non-color visual cues for building, damaged, clogged, short-circuit, and frost.
import type { ThreeEvent } from '@react-three/fiber'
import {
  CatmullRomCurve3,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import type { StructureInstance } from '../../engine/types'
import { structureVisualState, type NonColorCue, type VisualState } from './visualState'

const HULL_WHITE = '#f0f2f5'
const HULL_GRAY = '#d9e0e8'
const METAL_DARK = '#2e3846'
const SAFETY_ORANGE = '#ff7a29'
const MINT_GREEN = '#5bd6a0'
const SOLAR_BLUE = '#1e3a5f'
const WATER_BLUE = '#63c5da'
const MARS_ROCK = '#944222'
const SELECTED_EMISSIVE = '#ffb347'
const WARM_WINDOW_LIGHT = '#ffb84d'
const FROST_ICE = '#e6f7ff'
const FROST_GLOW = '#8ce0ff'
const DUST_DRIFT = '#c77843'
const SPARK_YELLOW = '#ffe066'
const SMOKE_DARK = '#3d3532'

// Shared datum & static procedural geometries for Habitat (2x2 footprint <= 1.76 x 1.76)
const HAB_BASE_Y = 0.022 // clears FoundationPad trim ring top (0.02 above deck)
const HAB_SIDES = 8
const HAB_PHI = Math.PI / HAB_SIDES
const HAB_WALL_R = 0.58
const HAB_APOTHEM = HAB_WALL_R * Math.cos(Math.PI / HAB_SIDES) // ~0.5358

function latheOctagon(points: ReadonlyArray<readonly [number, number]>, sides = HAB_SIDES) {
  return new LatheGeometry(
    points.map(([r, y]) => new Vector2(r, y)),
    sides,
    HAB_PHI,
  )
}

function makeChamferedArchShape(halfW: number, height: number, chamfer: number) {
  const s = new Shape()
  s.moveTo(-halfW, 0)
  s.lineTo(halfW, 0)
  s.lineTo(halfW, height - chamfer)
  s.lineTo(halfW - chamfer, height)
  s.lineTo(-halfW + chamfer, height)
  s.lineTo(-halfW, height - chamfer)
  s.closePath()
  return s
}

const HABITAT_GEO = {
  baseSkirt: latheOctagon([
    [0.54, HAB_BASE_Y],
    [0.6, HAB_BASE_Y],
    [0.6, HAB_BASE_Y + 0.045],
    [0.56, HAB_BASE_Y + 0.07],
  ]),
  hull: latheOctagon([
    [0.56, HAB_BASE_Y + 0.068],
    [HAB_WALL_R, HAB_BASE_Y + 0.09],
    [HAB_WALL_R, 0.34],
    [0.52, 0.42],
    [0.52, 0.48],
    [0.41, 0.61],
    [0.25, 0.68],
    [0, 0.68],
  ]),
  glowBand: latheOctagon([
    [0.565, 0.315],
    [HAB_WALL_R + 0.016, 0.325],
    [HAB_WALL_R + 0.016, 0.355],
    [0.565, 0.365],
  ]),
  orangeCollar: latheOctagon([
    [0.51, 0.445],
    [0.538, 0.453],
    [0.538, 0.488],
    [0.51, 0.496],
  ]),
  topCupolaCollar: latheOctagon([
    [0.255, 0.668],
    [0.265, 0.69],
    [0.245, 0.76],
    [0.195, 0.768],
  ]),
  topHatchLid: latheOctagon([
    [0, 0.77],
    [0.205, 0.77],
    [0.185, 0.805],
    [0, 0.805],
  ]),
  topSkylight: latheOctagon([
    [0, 0.808],
    [0.135, 0.808],
    [0.115, 0.828],
    [0, 0.828],
  ]),
  airlockTunnel: new ExtrudeGeometry(makeChamferedArchShape(0.145, 0.25, 0.065), {
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
  }),
  airlockFrame: new ExtrudeGeometry(makeChamferedArchShape(0.158, 0.265, 0.07), {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 1,
  }),
  utilityPod: new ExtrudeGeometry(makeChamferedArchShape(0.14, 0.22, 0.05), {
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.016,
    bevelSegments: 1,
  }),
  conduitPipeA: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(-0.26, 0.36, 0.64),
      new Vector3(-0.24, 0.46, 0.58),
      new Vector3(-0.16, 0.48, 0.47),
    ]),
    8,
    0.022,
    6,
    false,
  ),
  conduitPipeB: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(0.26, 0.36, 0.64),
      new Vector3(0.24, 0.46, 0.58),
      new Vector3(0.16, 0.48, 0.47),
    ]),
    8,
    0.022,
    6,
    false,
  ),
  commsDish: new LatheGeometry(
    [
      new Vector2(0, -0.02),
      new Vector2(0.1, -0.008),
      new Vector2(0.18, 0.045),
      new Vector2(0.175, 0.062),
      new Vector2(0.09, 0.014),
      new Vector2(0, 0.004),
    ],
    8,
  ),
  frostShell: latheOctagon([
    [0.615, HAB_BASE_Y + 0.06],
    [0.632, 0.35],
    [0.565, 0.49],
    [0.445, 0.635],
    [0.275, 0.71],
    [0.255, 0.81],
    [0, 0.835],
  ]),
}

// Shared datum & static procedural geometries for Greenhouse (2x2 footprint <= 1.76 x 1.76)
const GH_BASE_Y = 0.022

function makeArchSolidShape(halfW: number, wallH: number, archH: number, segs = 6) {
  const s = new Shape()
  s.moveTo(-halfW, 0)
  s.lineTo(halfW, 0)
  s.lineTo(halfW, wallH)
  for (let i = 1; i <= segs; i++) {
    const theta = (i / segs) * Math.PI
    s.lineTo(Math.cos(theta) * halfW, wallH + Math.sin(theta) * archH)
  }
  s.closePath()
  return s
}

function makeArchRibShape(
  innerW: number,
  outerW: number,
  wallH: number,
  innerArchH: number,
  outerArchH: number,
  segs = 6,
) {
  const s = new Shape()
  s.moveTo(-outerW, 0)
  s.lineTo(-innerW, 0)
  s.lineTo(-innerW, wallH)
  for (let i = segs - 1; i >= 0; i--) {
    const theta = (i / segs) * Math.PI
    s.lineTo(Math.cos(theta) * innerW, wallH + Math.sin(theta) * innerArchH)
  }
  s.lineTo(innerW, 0)
  s.lineTo(outerW, 0)
  s.lineTo(outerW, wallH)
  for (let i = 1; i <= segs; i++) {
    const theta = (i / segs) * Math.PI
    s.lineTo(Math.cos(theta) * outerW, wallH + Math.sin(theta) * outerArchH)
  }
  s.closePath()
  return s
}

function makeChamferedRectShape(halfW: number, halfH: number, chamfer: number) {
  const s = new Shape()
  s.moveTo(-halfW + chamfer, -halfH)
  s.lineTo(halfW - chamfer, -halfH)
  s.lineTo(halfW, -halfH + chamfer)
  s.lineTo(halfW, halfH - chamfer)
  s.lineTo(halfW - chamfer, halfH)
  s.lineTo(-halfW + chamfer, halfH)
  s.lineTo(-halfW, halfH - chamfer)
  s.lineTo(-halfW, -halfH + chamfer)
  s.closePath()
  return s
}

const GREENHOUSE_GEO = {
  basePlinth: new ExtrudeGeometry(makeChamferedRectShape(0.61, 0.565, 0.08), {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.02,
    bevelSegments: 1,
  }),
  glassCanopy: new ExtrudeGeometry(makeArchSolidShape(0.49, 0.16, 0.39, 6), {
    depth: 1.08,
    bevelEnabled: false,
  }),
  archRib: new ExtrudeGeometry(makeArchRibShape(0.502, 0.562, 0.16, 0.402, 0.455, 6), {
    depth: 0.068,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 1,
  }),
  endBulkhead: new ExtrudeGeometry(makeArchSolidShape(0.515, 0.16, 0.4, 6), {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
  }),
  vestibule: new ExtrudeGeometry(makeChamferedArchShape(0.14, 0.24, 0.06), {
    depth: 0.21,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.016,
    bevelSegments: 1,
  }),
  vestibuleCollar: new ExtrudeGeometry(makeChamferedArchShape(0.152, 0.255, 0.065), {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  }),
  irrigationPipe: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(-0.71, GH_BASE_Y + 0.32, 0.22),
      new Vector3(-0.68, GH_BASE_Y + 0.42, 0.2),
      new Vector3(-0.56, GH_BASE_Y + 0.33, 0.16),
    ]),
    6,
    0.024,
    6,
    false,
  ),
}

// Shared datum & static procedural geometries for Solar Panel (1x1 footprint <= 0.88 x 0.88)
const SOLAR_BASE_Y = 0.022

function makeTriangularPlateShape(radius: number) {
  const s = new Shape()
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3 - Math.PI / 2
    const x = Math.cos(a) * radius
    const y = Math.sin(a) * radius
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  s.closePath()
  return s
}

function makeHollowRectFrameShape(outerW: number, outerH: number, border: number) {
  const hw = outerW / 2
  const hh = outerH / 2
  const outer = new Shape()
  outer.moveTo(-hw, -hh)
  outer.lineTo(hw, -hh)
  outer.lineTo(hw, hh)
  outer.lineTo(-hw, hh)
  outer.closePath()

  const hole = new Shape()
  const iw = hw - border
  const ih = hh - border
  hole.moveTo(-iw, -ih)
  hole.lineTo(-iw, ih)
  hole.lineTo(iw, ih)
  hole.lineTo(iw, -ih)
  hole.closePath()
  outer.holes.push(hole)
  return outer
}

const SOLAR_GEO = {
  triBase: new ExtrudeGeometry(makeTriangularPlateShape(0.19), {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.014,
    bevelSegments: 1,
  }),
  panelFrame: new ExtrudeGeometry(makeHollowRectFrameShape(0.73, 0.59, 0.042), {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 1,
  }),
  powerCable: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(0.055, SOLAR_BASE_Y + 0.08, -0.15),
      new Vector3(0.075, SOLAR_BASE_Y + 0.22, -0.11),
      new Vector3(0.045, SOLAR_BASE_Y + 0.36, -0.03),
    ]),
    6,
    0.015,
    6,
    false,
  ),
}

const DEFAULT_VISUAL: VisualState = {
  light: 1,
  dustHaze: 0,
  dark: false,
  frost: false,
  radiationTint: false,
}

export interface StructureModelProps {
  structure: StructureInstance
  size: number
  position: [number, number, number]
  selected: boolean
  onSelect: (id: string) => void
  visual?: VisualState
}

export function StructureModel({
  structure,
  size,
  position,
  selected,
  onSelect,
  visual = DEFAULT_VISUAL,
}: StructureModelProps) {
  const stateVisual = structureVisualState(structure, visual)
  const statusColor = stateVisual.color
  const hullColor = structure.status === 'active' ? HULL_WHITE : statusColor
  const secondaryColor = structure.status === 'active' ? HULL_GRAY : statusColor
  const emissive = selected ? SELECTED_EMISSIVE : '#000000'
  const emissiveIntensity = selected ? 0.35 : 0
  const isTiltedDamaged = stateVisual.nonColorCue === 'damage'
  const nightGlow = visual.dark && structure.status === 'active'

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect(structure.id)
  }

  return (
    <group position={position} onClick={handleClick}>
      {/* Elevated stilt foundation pad (Lote 3 visual reference) */}
      <FoundationPad size={size} selected={selected} statusColor={statusColor} />

      {/* Structure-specific low-poly model (Lote 1 & 2 visual reference) */}
      <group rotation={isTiltedDamaged ? [0.05, 0, -0.09] : [0, 0, 0]}>
        <StructureMesh
          type={structure.type}
          hullColor={hullColor}
          secondaryColor={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          nightGlow={nightGlow}
        />
      </group>

      {/* Non-color visual cues (Constitution III & Lote 3 visual reference) */}
      <NonColorCueOverlay cue={stateVisual.nonColorCue} frosted={stateVisual.frosted} size={size} />
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
  nightGlow,
}: {
  type: string
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
  nightGlow: boolean
}) {
  const windowEmissive = nightGlow ? WARM_WINDOW_LIGHT : MINT_GREEN
  const windowGlow = nightGlow ? 0.95 : 0.4

  switch (type) {
    case 'habitat':
      return (
        <HabitatMesh
          hullColor={hullColor}
          secondaryColor={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          windowEmissive={windowEmissive}
          windowGlow={windowGlow}
        />
      )

    case 'solar_panel':
      return (
        <SolarPanelMesh
          hullColor={hullColor}
          secondaryColor={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
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
        <GreenhouseMesh
          hullColor={hullColor}
          secondaryColor={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          windowEmissive={windowEmissive}
          windowGlow={windowGlow}
          nightGlow={nightGlow}
        />
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

function NonColorCueOverlay({
  cue,
  frosted,
  size,
}: {
  cue: NonColorCue
  frosted: boolean
  size: number
}) {
  const half = size * 0.42
  return (
    <group>
      {/* Construction scaffolding posts & crossbeams */}
      {cue === 'construction' && (
        <group>
          {(
            [
              [-half, -half],
              [half, -half],
              [-half, half],
              [half, half],
            ] as const
          ).map(([px, pz], idx) => (
            <mesh key={idx} position={[px, 0.45, pz]}>
              <cylinderGeometry args={[0.03, 0.03, 0.85, 6]} />
              <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
            </mesh>
          ))}
          <mesh position={[0, 0.86, 0]}>
            <boxGeometry args={[size * 0.88, 0.04, size * 0.88]} />
            <meshStandardMaterial color={SAFETY_ORANGE} wireframe />
          </mesh>
        </group>
      )}

      {/* Damaged cue: rising dark smoke puffs + floating warning cone */}
      {cue === 'damage' && (
        <group>
          <mesh position={[-0.14, 0.88, 0.08]}>
            <dodecahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color={SMOKE_DARK} flatShading />
          </mesh>
          <mesh position={[0.08, 1.12, -0.06]}>
            <dodecahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color={SMOKE_DARK} flatShading />
          </mesh>
          <mesh position={[0, 1.42, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.16, 0.28, 3]} />
            <meshStandardMaterial
              color={SAFETY_ORANGE}
              emissive={SAFETY_ORANGE}
              emissiveIntensity={0.6}
              flatShading
            />
          </mesh>
        </group>
      )}

      {/* Clogged cue: Martian dust drifts banked around and over the structure */}
      {cue === 'dust' && (
        <group>
          <mesh position={[-half * 0.55, 0.22, half * 0.45]} scale={[1.3, 0.65, 1.1]}>
            <dodecahedronGeometry args={[0.28 * size, 0]} />
            <meshStandardMaterial color={DUST_DRIFT} flatShading />
          </mesh>
          <mesh position={[half * 0.5, 0.2, -half * 0.4]} scale={[1.2, 0.55, 1.2]}>
            <dodecahedronGeometry args={[0.24 * size, 0]} />
            <meshStandardMaterial color={MARS_ROCK} flatShading />
          </mesh>
          <mesh position={[0, 0.58, 0]} scale={[1.25, 0.4, 1.25]}>
            <dodecahedronGeometry args={[0.22 * size, 0]} />
            <meshStandardMaterial color={DUST_DRIFT} flatShading />
          </mesh>
        </group>
      )}

      {/* Short-circuit cue: jagged electric spark shards + glowing hazard octahedron */}
      {cue === 'sparks' && (
        <group>
          <mesh position={[-0.22, 0.78, 0.18]} rotation={[0.4, 0.3, -0.6]}>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial
              color={SPARK_YELLOW}
              emissive={SPARK_YELLOW}
              emissiveIntensity={0.9}
              flatShading
            />
          </mesh>
          <mesh position={[0.24, 0.92, -0.15]} rotation={[-0.5, 0.2, 0.7]}>
            <octahedronGeometry args={[0.14, 0]} />
            <meshStandardMaterial
              color={SPARK_YELLOW}
              emissive={SPARK_YELLOW}
              emissiveIntensity={0.9}
              flatShading
            />
          </mesh>
          <mesh position={[0, 1.32, 0]}>
            <octahedronGeometry args={[0.18, 0]} />
            <meshStandardMaterial
              color="#ff5a5a"
              emissive="#ff5a5a"
              emissiveIntensity={0.85}
              flatShading
            />
          </mesh>
        </group>
      )}

      {/* Unheated habitat frost cue: white/icy crystal spikes and frost cap on habitat dome */}
      {(cue === 'frost' || frosted) && (
        <group position={[0, 0.12, 0]}>
          {/* Translucent frost shell matching the octagonal habitat hull */}
          <mesh geometry={HABITAT_GEO.frostShell}>
            <meshStandardMaterial
              color={FROST_ICE}
              emissive={FROST_GLOW}
              emissiveIntensity={0.3}
              transparent
              opacity={0.38}
              flatShading
            />
          </mesh>
          {/* Tapered ice crystal spires around the habitat */}
          {(
            [
              [-0.44, 0.48, 0.34, 0.32, -0.24],
              [0.42, 0.48, -0.32, -0.28, 0.3],
              [-0.34, 0.6, -0.38, -0.24, -0.28],
              [0.3, 0.62, 0.38, 0.26, 0.24],
              [0, 0.92, 0, 0, 0],
            ] as const
          ).map(([fx, fy, fz, rx, rz], idx) => (
            <mesh key={idx} position={[fx, fy, fz]} rotation={[rx, 0, rz]} scale={[0.7, 1.35, 0.7]}>
              <octahedronGeometry args={[0.12, 0]} />
              <meshStandardMaterial
                color={FROST_ICE}
                emissive={FROST_GLOW}
                emissiveIntensity={0.5}
                flatShading
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

function SolarPanelMesh({
  hullColor,
  secondaryColor,
  emissive,
  emissiveIntensity,
}: {
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
}) {
  return (
    <group position={[0, 0.12, 0]}>
      {/* Chamfered triangular mounting baseplate */}
      <mesh
        geometry={SOLAR_GEO.triBase}
        position={[0, SOLAR_BASE_Y + 0.036, -0.04]}
        rotation={[Math.PI / 2, 0, Math.PI]}
      >
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Rear power junction box & status strip */}
      <mesh position={[0, SOLAR_BASE_Y + 0.062, -0.17]}>
        <boxGeometry args={[0.19, 0.088, 0.13]} />
        <meshStandardMaterial color={secondaryColor} flatShading />
      </mesh>
      <mesh position={[0, SOLAR_BASE_Y + 0.072, -0.24]}>
        <boxGeometry args={[0.11, 0.026, 0.016]} />
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>

      {/* Articulated main mast, rear diagonal brace & power conduit */}
      <mesh position={[0, SOLAR_BASE_Y + 0.19, -0.02]}>
        <cylinderGeometry args={[0.048, 0.068, 0.34, 6]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh position={[0, SOLAR_BASE_Y + 0.18, -0.09]} rotation={[0.53, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.026, 0.28, 6]} />
        <meshStandardMaterial color={secondaryColor} flatShading />
      </mesh>
      <mesh geometry={SOLAR_GEO.powerCable}>
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Safety-orange articulated pivot knuckle */}
      <mesh position={[0, SOLAR_BASE_Y + 0.37, -0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.048, 0.048, 0.2, 6]} />
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>

      {/* Tilted photovoltaic array wing */}
      <group position={[0, SOLAR_BASE_Y + 0.405, 0.01]} rotation={[0.48, 0, 0]}>
        {/* Outer beveled white hull frame */}
        <mesh
          geometry={SOLAR_GEO.panelFrame}
          position={[0, 0.013, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial
            color={hullColor}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            flatShading
          />
        </mesh>

        {/* Recessed dark-blue photovoltaic cell plate */}
        <mesh position={[0, 0.002, 0]}>
          <boxGeometry args={[0.66, 0.022, 0.52]} />
          <meshStandardMaterial
            color={SOLAR_BLUE}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            metalness={0.25}
            roughness={0.45}
            flatShading
          />
        </mesh>

        {/* Crisp 3x2 internal cell grid dividers */}
        {([-0.11, 0.11] as const).map((gx, idx) => (
          <mesh key={idx} position={[gx, 0.013, 0]}>
            <boxGeometry args={[0.018, 0.014, 0.51]} />
            <meshStandardMaterial color={hullColor} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.013, 0]}>
          <boxGeometry args={[0.65, 0.014, 0.02]} />
          <meshStandardMaterial color={hullColor} flatShading />
        </mesh>

        {/* Safety-orange upper edge trim */}
        <mesh position={[0, 0.018, -0.285]}>
          <boxGeometry args={[0.745, 0.022, 0.036]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>

        {/* Underside structural spine, cross-ribs & pivot clevis */}
        <mesh position={[0, -0.018, 0]}>
          <boxGeometry args={[0.56, 0.022, 0.085]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {([-0.18, 0.18] as const).map((rx, idx) => (
          <mesh key={idx} position={[rx, -0.016, 0]}>
            <boxGeometry args={[0.045, 0.018, 0.44]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function GreenhouseMesh({
  hullColor,
  secondaryColor,
  emissive,
  emissiveIntensity,
  windowEmissive,
  windowGlow,
  nightGlow,
}: {
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
  windowEmissive: string
  windowGlow: number
  nightGlow: boolean
}) {
  const cropX = [-0.36, -0.22, -0.07, 0.07, 0.22, 0.36] as const
  const cropZ = [-0.21, 0.21] as const
  const growLightColor = nightGlow ? WARM_WINDOW_LIGHT : '#e8ffd1'
  const growLightIntensity = nightGlow ? 0.95 : 0.45

  return (
    <group position={[0, 0.12, 0]}>
      {/* Pressurized chamfered base plinth above FoundationPad trim ring */}
      <mesh
        geometry={GREENHOUSE_GEO.basePlinth}
        position={[0, GH_BASE_Y + 0.075, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh position={[0, GH_BASE_Y + 0.095, 0]}>
        <boxGeometry args={[1.18, 0.036, 1.06]} />
        <meshStandardMaterial color={hullColor} flatShading />
      </mesh>

      {/* Interior central walkway & twin hydroponic crop beds (Lote 2 img1 & Lote 1 img3) */}
      <mesh position={[0, GH_BASE_Y + 0.118, 0]}>
        <boxGeometry args={[0.96, 0.014, 0.16]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      {cropZ.map((cz, rowIdx) => (
        <group key={rowIdx} position={[0, GH_BASE_Y + 0.118, cz]}>
          <mesh position={[0, 0.032, 0]}>
            <boxGeometry args={[0.94, 0.064, 0.22]} />
            <meshStandardMaterial color={secondaryColor} flatShading />
          </mesh>
          <mesh position={[0, 0.068, 0]}>
            <boxGeometry args={[0.88, 0.014, 0.18]} />
            <meshStandardMaterial color="#593a29" flatShading />
          </mesh>
          {cropX.map((cx, colIdx) => {
            const isLightLeaf = (rowIdx + colIdx) % 2 === 0
            const plantColor = isLightLeaf ? MINT_GREEN : '#36b576'
            const plantScale = 0.075 + ((rowIdx + colIdx) % 3) * 0.012
            return (
              <mesh
                key={colIdx}
                position={[cx, 0.125, 0]}
                rotation={[0.2 * colIdx, 0.6 * (rowIdx + colIdx), 0]}
              >
                <octahedronGeometry args={[plantScale, 0]} />
                <meshStandardMaterial
                  color={plantColor}
                  emissive={plantColor}
                  emissiveIntensity={nightGlow ? 0.55 : 0.28}
                  flatShading
                />
              </mesh>
            )
          })}
        </group>
      ))}

      {/* Overhead interior grow-light strips (Lote 1 img3) */}
      {([-0.15, 0.15] as const).map((lz, idx) => (
        <mesh key={idx} position={[0, GH_BASE_Y + 0.51, lz]}>
          <boxGeometry args={[0.92, 0.024, 0.04]} />
          <meshStandardMaterial
            color={growLightColor}
            emissive={growLightColor}
            emissiveIntensity={growLightIntensity}
            flatShading
          />
        </mesh>
      ))}

      {/* End bulkheads (-X climate wall and +X airlock wall) seated solidly on plinth */}
      <mesh
        geometry={GREENHOUSE_GEO.endBulkhead}
        position={[-0.585, GH_BASE_Y + 0.085, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <meshStandardMaterial
          color={hullColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          flatShading
        />
      </mesh>
      <mesh
        geometry={GREENHOUSE_GEO.endBulkhead}
        position={[0.53, GH_BASE_Y + 0.085, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <meshStandardMaterial
          color={hullColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          flatShading
        />
      </mesh>
      {/* Front bulkhead upper observation window above vestibule */}
      <mesh position={[0.592, GH_BASE_Y + 0.43, 0]}>
        <boxGeometry args={[0.024, 0.11, 0.28]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh position={[0.602, GH_BASE_Y + 0.43, 0]}>
        <boxGeometry args={[0.016, 0.068, 0.22]} />
        <meshStandardMaterial
          color={windowEmissive}
          emissive={windowEmissive}
          emissiveIntensity={windowGlow}
          flatShading
        />
      </mesh>

      {/* External structural arch ribs wrapping outside the glass (Lote 2 img1) */}
      {([-0.46, -0.034, 0.39] as const).map((rx, idx) => (
        <mesh
          key={idx}
          geometry={GREENHOUSE_GEO.archRib}
          position={[rx, GH_BASE_Y + 0.085, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <meshStandardMaterial
            color={hullColor}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            flatShading
          />
        </mesh>
      ))}

      {/* Top spine ridge (clears rib apex with >= 0.015 margin) & safety-orange vent cap */}
      <mesh position={[-0.01, GH_BASE_Y + 0.72, 0]}>
        <boxGeometry args={[1.12, 0.04, 0.1]} />
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>
      <mesh position={[-0.24, GH_BASE_Y + 0.765, 0]}>
        <cylinderGeometry args={[0.055, 0.07, 0.05, 6]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Translucent vaulted glass canopy revealing interior greenery */}
      <mesh
        geometry={GREENHOUSE_GEO.glassCanopy}
        position={[-0.54, GH_BASE_Y + 0.085, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <meshStandardMaterial
          color="#c2f7e4"
          transparent
          opacity={0.36}
          depthWrite={false}
          flatShading
        />
      </mesh>

      {/* Front pressurized airlock vestibule (+X, aligned for modular colony adjacency) */}
      <mesh
        geometry={GREENHOUSE_GEO.vestibule}
        position={[0.56, GH_BASE_Y + 0.018, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <meshStandardMaterial color={secondaryColor} flatShading />
      </mesh>
      <mesh
        geometry={GREENHOUSE_GEO.vestibuleCollar}
        position={[0.765, GH_BASE_Y + 0.012, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>
      <mesh position={[0.796, GH_BASE_Y + 0.125, 0]}>
        <boxGeometry args={[0.022, 0.18, 0.18]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh position={[0.81, GH_BASE_Y + 0.16, 0]}>
        <boxGeometry args={[0.014, 0.055, 0.085]} />
        <meshStandardMaterial
          color={windowEmissive}
          emissive={windowEmissive}
          emissiveIntensity={windowGlow}
          flatShading
        />
      </mesh>
      <mesh position={[0.838, GH_BASE_Y + 0.015, 0]}>
        <boxGeometry args={[0.055, 0.03, 0.25]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Rear climate louver & water buffer tank (-X) */}
      <mesh position={[-0.62, GH_BASE_Y + 0.24, -0.18]}>
        <boxGeometry args={[0.05, 0.18, 0.22]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh position={[-0.635, GH_BASE_Y + 0.24, -0.18]}>
        <boxGeometry args={[0.03, 0.12, 0.16]} />
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>
      <group position={[-0.71, GH_BASE_Y, 0.22]}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.105, 0.112, 0.32, 8]} />
          <meshStandardMaterial color={WATER_BLUE} flatShading />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.118, 0.118, 0.038, 8]} />
          <meshStandardMaterial color={hullColor} flatShading />
        </mesh>
        <mesh position={[0, 0.335, 0]}>
          <cylinderGeometry args={[0.075, 0.098, 0.032, 8]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Mounting collar securing water tank to rear bulkhead */}
        <mesh position={[0.09, 0.16, 0]}>
          <boxGeometry args={[0.12, 0.05, 0.12]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      </group>
      <mesh geometry={GREENHOUSE_GEO.irrigationPipe}>
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
    </group>
  )
}

function HabitatMesh({
  hullColor,
  secondaryColor,
  emissive,
  emissiveIntensity,
  windowEmissive,
  windowGlow,
}: {
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
  windowEmissive: string
  windowGlow: number
}) {
  const viewportFrameOffset = HAB_APOTHEM + 0.015
  const viewportGlassOffset = HAB_APOTHEM + 0.027
  // Upper dome facet slope: apothem goes 0.52*cos(pi/8)=0.480 -> 0.41*cos(pi/8)=0.379 over dy=0.13
  const facetCenterApothem = 0.4296
  const facetCenterY = 0.545
  const facetTilt = Math.atan2(0.1016, 0.13) // ~0.663 rad from vertical

  return (
    <group position={[0, 0.12, 0]}>
      {/* Dark metallic foundation skirt */}
      <mesh geometry={HABITAT_GEO.baseSkirt}>
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Main octagonal chamfered hull & stepped geodesic dome */}
      <mesh geometry={HABITAT_GEO.hull}>
        <meshStandardMaterial
          color={hullColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          flatShading
        />
      </mesh>

      {/* Perimeter glowing belt (Lote 1 img1; warm at night per Lote 1 img3) */}
      <mesh geometry={HABITAT_GEO.glowBand}>
        <meshStandardMaterial
          color={windowEmissive}
          emissive={windowEmissive}
          emissiveIntensity={windowGlow}
          flatShading
        />
      </mesh>

      {/* Safety-orange upper structural collar */}
      <mesh geometry={HABITAT_GEO.orangeCollar}>
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>

      {/* Top cupola collar, dark hatch lid & skylight */}
      <mesh geometry={HABITAT_GEO.topCupolaCollar}>
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>
      <mesh geometry={HABITAT_GEO.topHatchLid}>
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh geometry={HABITAT_GEO.topSkylight}>
        <meshStandardMaterial
          color={windowEmissive}
          emissive={windowEmissive}
          emissiveIntensity={windowGlow}
          flatShading
        />
      </mesh>

      {/* Flush angled roof armor plates on opposite diagonal facets (Lote 1 img1) */}
      {[Math.PI / 4, (-3 * Math.PI) / 4].map((ang, idx) => (
        <group key={idx} rotation={[0, ang, 0]}>
          <mesh
            position={[
              0,
              facetCenterY + 0.012 * Math.sin(facetTilt),
              facetCenterApothem + 0.012 * Math.cos(facetTilt),
            ]}
            rotation={[-facetTilt, 0, 0]}
          >
            <boxGeometry args={[0.17, 0.11, 0.022]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
        </group>
      ))}

      {/* Chamfered Airlock Tunnel (+X) with portal frame, recessed door & entry steps */}
      <mesh
        geometry={HABITAT_GEO.airlockTunnel}
        position={[0.42, HAB_BASE_Y + 0.02, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <meshStandardMaterial color={secondaryColor} flatShading />
      </mesh>
      <mesh
        geometry={HABITAT_GEO.airlockFrame}
        position={[0.69, HAB_BASE_Y + 0.015, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>
      <mesh position={[0.728, HAB_BASE_Y + 0.13, 0]}>
        <boxGeometry args={[0.025, 0.19, 0.19]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh position={[0.744, HAB_BASE_Y + 0.17, 0]}>
        <boxGeometry args={[0.016, 0.06, 0.09]} />
        <meshStandardMaterial
          color={windowEmissive}
          emissive={windowEmissive}
          emissiveIntensity={windowGlow}
          flatShading
        />
      </mesh>
      {/* Entry landing & step treads within 2x2 pad */}
      <mesh position={[0.77, HAB_BASE_Y + 0.022, 0]}>
        <boxGeometry args={[0.09, 0.044, 0.29]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh position={[0.83, HAB_BASE_Y + 0.011, 0]}>
        <boxGeometry args={[0.055, 0.022, 0.27]} />
        <meshStandardMaterial color={secondaryColor} flatShading />
      </mesh>

      {/* Life-support utility pod & paired buffer tanks aligned to -X/-Z facet */}
      <group rotation={[0, (-3 * Math.PI) / 4, 0]}>
        <mesh geometry={HABITAT_GEO.utilityPod} position={[0, HAB_BASE_Y + 0.016, 0.46]}>
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
        {[0.085, 0.14, 0.195].map((ly, idx) => (
          <mesh key={idx} position={[0, HAB_BASE_Y + ly, 0.682]}>
            <boxGeometry args={[0.19, 0.022, 0.018]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}

        {/* Twin vertical O2/water buffer micro-tanks flanking the utility pod */}
        {([-0.26, 0.26] as const).map((tx, idx) => (
          <group key={idx} position={[tx, HAB_BASE_Y, 0.64]}>
            <mesh position={[0, 0.155, 0]}>
              <cylinderGeometry args={[0.088, 0.094, 0.31, 8]} />
              <meshStandardMaterial color={hullColor} flatShading />
            </mesh>
            <mesh position={[0, 0.23, 0]}>
              <cylinderGeometry args={[0.102, 0.102, 0.04, 8]} />
              <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
            </mesh>
            <mesh position={[0, 0.325, 0]}>
              <cylinderGeometry args={[0.065, 0.084, 0.032, 8]} />
              <meshStandardMaterial color={METAL_DARK} flatShading />
            </mesh>
          </group>
        ))}
        {/* Dual conduit pipes connecting both tanks seamlessly into upper hull */}
        <mesh geometry={HABITAT_GEO.conduitPipeA}>
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh geometry={HABITAT_GEO.conduitPipeB}>
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      </group>

      {/* Centered framed glowing viewports on 3 cardinal facets (+Z, -Z, -X) */}
      {(
        [
          { pos: [0, 0.205, viewportFrameOffset] as const, rotY: 0, glass: [0, 0.205, viewportGlassOffset] as const },
          { pos: [0, 0.205, -viewportFrameOffset] as const, rotY: 0, glass: [0, 0.205, -viewportGlassOffset] as const },
          { pos: [-viewportFrameOffset, 0.205, 0] as const, rotY: Math.PI / 2, glass: [-viewportGlassOffset, 0.205, 0] as const },
        ] as const
      ).map((w, idx) => (
        <group key={idx}>
          <mesh position={w.pos} rotation={[0, w.rotY, 0]}>
            <boxGeometry args={[0.27, 0.11, 0.028]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          <mesh position={w.glass} rotation={[0, w.rotY, 0]}>
            <boxGeometry args={[0.21, 0.068, 0.018]} />
            <meshStandardMaterial
              color={windowEmissive}
              emissive={windowEmissive}
              emissiveIntensity={windowGlow}
              flatShading
            />
          </mesh>
        </group>
      ))}

      {/* Asymmetric roof comms mast & parabolic dish (-X/+Z shoulder) */}
      <group position={[-0.25, 0.615, 0.23]}>
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.065, 0.085, 0.05, 8]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0, 0.145, 0]}>
          <cylinderGeometry args={[0.018, 0.024, 0.22, 6]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <group position={[0, 0.26, 0]} rotation={[0.72, 0.78, 0]}>
          <mesh geometry={HABITAT_GEO.commsDish}>
            <meshStandardMaterial color={hullColor} flatShading />
          </mesh>
          <mesh position={[0, 0.055, 0]}>
            <cylinderGeometry args={[0.014, 0.02, 0.075, 6]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
        </group>
      </group>
    </group>
  )
}

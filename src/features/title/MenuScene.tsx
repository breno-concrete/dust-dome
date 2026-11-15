// Owner: Dev B. 3D backdrop of the title screen and the "Play game" landing.
// Two low-poly sets share one canvas: Mars seen from space with a tiny base on it, and
// the landing site on the ground. `transition.ts` says what each frame shows; this file
// only draws it. Loaded lazily by TitleScreen, so three.js never delays the menu buttons.
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import styles from './TitleScreen.module.css'
import { popScale, revealProgress } from './reveal'
import { transitionFrame } from './transition'

export interface MenuSceneProps {
  /** True after the click on "Play game": plays the landing once. */
  launching: boolean
  /** Reduced motion: nothing turns. */
  still: boolean
  /** Called once, when the first frame is on screen. */
  onReady: () => void
  /** Called once, when the rocket is on the ground and the screen has faded. */
  onLanded: () => void
}

// Dev only: open the app with ?titleT=3.5 to freeze the landing at that second and
// review a frame. Vite removes this from production builds.
const FREEZE_AT: number | null = import.meta.env.DEV
  ? (() => {
      const raw = new URLSearchParams(window.location.search).get('titleT')
      return raw === null ? null : Number(raw)
    })()
  : null

// Dev only, to make `planet.webp` (the planet that shows before three.js arrives) and to
// review the pop-in:
//   ?titleReveal=0    the bare planet, nothing placed, not turning
//   ?titleReveal=1.5  frozen 1.5 s into the pop-in
//   &titleBake=1      also frames the whole planet, centered, from the menu camera's spot
// To remake the image: open with ?titleReveal=0&titleBake=1 in a square window, hide the page
// around the canvas, screenshot with a transparent background, crop to the planet.
const FREEZE_REVEAL: number | null = import.meta.env.DEV
  ? (() => {
      const raw = new URLSearchParams(window.location.search).get('titleReveal')
      return raw === null ? null : Number(raw)
    })()
  : null
const BAKE: boolean = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('titleBake') === '1'
  : false

// Structures use the base scene's palette (specs/004-base-scene) so they match the game.
const HULL = '#f0f2f5'
const HULL_SHADE = '#d9e0e8'
const METAL = '#2e3846'
const ORANGE = '#ff7a29'
const GLASS = '#63c5da'
const SOLAR = '#1e3a5f'
// Mars from space: the warm sand of the menu mock-up.
const SAND_LIGHT = '#e3ae72'
const SAND = '#d79a5d'
const SAND_SHADE = '#cc8b50'
const CRATER_FLOOR = '#b97a45'
// Mars on the ground: the game's own terrain colors.
const DEEP_RUST = '#873519'
const CLIFF = '#9c4322'
const GROUND = '#b5532f'
const SUNLIT_SAND = '#c66338'
const RIDGE_OCHRE = '#da7d4c'
const PEAK_LIGHT = '#eea87a'

// Dusk sky on the ground, in the menu's teal so the two sets feel like one place.
const SURFACE_SKY = new THREE.Color('#2f4544')
const SURFACE_FOG = new THREE.Fog('#2f4544', 36, 100)

const DEG = Math.PI / 180
/** Unit vector for a latitude and longitude on the planet (degrees). */
function onPlanet(latitude: number, longitude: number) {
  const lat = latitude * DEG
  const lon = longitude * DEG
  return new THREE.Vector3(
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon),
  )
}

/** Where the camera and the rocket go: the part of the planet facing the player. */
const SITE = onPlanet(38, 0)
const SITE_CAMERA = SITE.clone().multiplyScalar(1.5)
const SITE_ROCKET = SITE.clone().multiplyScalar(1.02)

const ROCKET_SIZE_ON_GROUND = 1.6
/** The fins reach this far below the hull: the rocket stands on them. */
const FIN_DROP = 0.42

const UP = new THREE.Vector3(0, 1, 0)
// Scratch vectors: nothing is allocated inside the frame loop.
const v1 = new THREE.Vector3()
const v2 = new THREE.Vector3()
const v3 = new THREE.Vector3()
const v4 = new THREE.Vector3()

/** Small seeded generator: rocks and craters are in the same place on every visit. */
function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Smooth bumps from -1 to 1. A plain formula, so neighbor triangles agree on shared corners. */
function relief(x: number, y: number, z: number) {
  return (
    Math.sin(x * 3.1 + y * 1.7) * Math.cos(z * 2.9 - x * 1.3) * 0.6 +
    Math.sin(y * 5.3 + z * 4.1 + x * 2.2) * 0.4
  )
}

/** Paints each triangle with one flat color picked from its center. */
function paintFaces(geometry: THREE.BufferGeometry, pick: (center: THREE.Vector3) => string) {
  const position = geometry.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  const color = new THREE.Color()
  for (let i = 0; i < position.count; i += 3) {
    v1.fromBufferAttribute(position, i)
    v1.add(v2.fromBufferAttribute(position, i + 1))
    v1.add(v2.fromBufferAttribute(position, i + 2))
    color.set(pick(v1.divideScalar(3)))
    for (let k = 0; k < 3; k++) color.toArray(colors, (i + k) * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
}

// ---------------------------------------------------------------------------
// Mars from space
// ---------------------------------------------------------------------------

/** A few craters: a lowered floor and a raised rim, never just a painted circle. */
const CRATERS = (() => {
  const random = seeded(5)
  return Array.from({ length: 9 }, () => ({
    center: onPlanet(-20 + random() * 95, random() * 360),
    size: 0.08 + random() * 0.07,
  }))
})()

/** -1 inside a crater floor, 1 on a rim, 0 on open ground. */
function craterAt(dir: THREE.Vector3) {
  for (const crater of CRATERS) {
    const away = dir.angleTo(crater.center)
    if (away < crater.size * 0.65) return -1
    if (away < crater.size) return 1
  }
  return 0
}

function planetRadius(dir: THREE.Vector3) {
  const crater = craterAt(dir)
  if (crater < 0) return 0.984
  if (crater > 0) return 1.01
  return 1 + relief(dir.x, dir.y, dir.z) * 0.006
}

function planetColor(center: THREE.Vector3) {
  const dir = v3.copy(center).normalize()
  const crater = craterAt(dir)
  if (crater < 0) return CRATER_FLOOR
  if (crater > 0) return SAND_LIGHT
  const n = relief(dir.x * 2.6, dir.y * 2.6, dir.z * 2.6)
  if (n < -0.3) return SAND_SHADE
  if (n < 0.35) return SAND
  return SAND_LIGHT
}

function buildPlanet() {
  const geometry = new THREE.IcosahedronGeometry(1, 12)
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    v1.fromBufferAttribute(position, i).normalize()
    v1.multiplyScalar(planetRadius(v1))
    position.setXYZ(i, v1.x, v1.y, v1.z)
  }
  paintFaces(geometry, planetColor)
  return geometry
}

type PropKind = 'habitat' | 'tower' | 'solar' | 'rover'

/** The tiny base on the planet: [kind, latitude, longitude, size, turn]. */
const PLANET_BASE: readonly (readonly [PropKind, number, number, number, number])[] = [
  ['habitat', 60, 15, 0.25, 0.4],
  ['tower', 66, 70, 0.22, 0],
  ['solar', 52, 118, 0.16, 1.2],
  ['solar', 58, 140, 0.16, 0.9],
  ['rover', 44, 200, 0.14, 2.2],
  ['habitat', 62, 262, 0.21, 3.6],
  ['tower', 50, 312, 0.2, 0],
]

function placeOnPlanet(dir: THREE.Vector3, turn: number) {
  const stand = new THREE.Quaternion().setFromUnitVectors(UP, dir)
  const spin = new THREE.Quaternion().setFromAxisAngle(UP, turn)
  return {
    // Sunk a hair into the ground so nothing floats over a facet.
    position: dir.clone().multiplyScalar(planetRadius(dir) - 0.006),
    quaternion: stand.multiply(spin),
  }
}

function buildPlanetBase() {
  return PLANET_BASE.map(([kind, latitude, longitude, size, turn]) => ({
    kind,
    size,
    ...placeOnPlanet(onPlanet(latitude, longitude), turn),
  }))
}

function buildPlanetRocks() {
  const random = seeded(23)
  return Array.from({ length: 18 }, () => {
    const dir = onPlanet(-15 + random() * 100, random() * 360)
    const size = 0.018 + random() * 0.028
    return { size, ...placeOnPlanet(dir, random() * 6) }
  })
}

// ---------------------------------------------------------------------------
// Landing site
// ---------------------------------------------------------------------------

/** Ground height at the landing site: flat around the base, dunes and hills far away. */
function groundHeight(x: number, z: number) {
  const r = Math.hypot(x, z)
  const dunes = Math.min(1, Math.max(0, (r - 15) / 12))
  const hills = Math.min(1, Math.max(0, (r - 30) / 40))
  return (
    dunes * relief(x * 0.09, 1.7, z * 0.09) * 1.2 +
    hills * Math.abs(relief(x * 0.05, 4.2, z * 0.05)) * 9
  )
}

function groundColor(center: THREE.Vector3) {
  if (center.y < -0.35) return DEEP_RUST
  if (center.y < 0.3) return GROUND
  if (center.y < 1) return SUNLIT_SAND
  if (center.y < 3) return RIDGE_OCHRE
  return PEAK_LIGHT
}

function buildGround() {
  const geometry = new THREE.PlaneGeometry(180, 180, 44, 44).toNonIndexed()
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    position.setY(i, groundHeight(position.getX(i), position.getZ(i)))
  }
  paintFaces(geometry, groundColor)
  return geometry
}

function buildRocks() {
  const random = seeded(42)
  return Array.from({ length: 12 }, () => {
    const angle = random() * Math.PI * 2
    const r = 7 + random() * 20
    const x = Math.cos(angle) * r
    const z = Math.sin(angle) * r
    const size = 0.3 + random() * 0.6
    return {
      position: [x, groundHeight(x, z) + size * 0.3, z] as const,
      rotation: [random() * 3, random() * 3, random() * 3] as const,
      scale: [size, size * (0.6 + random() * 0.4), size] as const,
      color: random() > 0.5 ? DEEP_RUST : CLIFF,
    }
  })
}

// The camera looks from (+x, +z) toward the rocket at the center: `back` is away from the
// camera, `right` is screen right. The base sits behind the rocket, never in front of it.
function onSite(back: number, right: number) {
  const s = Math.SQRT1_2
  return [(-back + right) * s, 0, (-back - right) * s] as const
}

/** The starting base waiting at the landing site: [kind, position, size, turn]. */
const SITE_BASE: readonly (readonly [
  PropKind,
  readonly [number, number, number],
  number,
  number,
])[] = [
  ['habitat', onSite(10, -7.5), 2.9, 0.5],
  ['tower', onSite(13.5, -3.5), 2.5, 0],
  ['solar', onSite(8, 7), 2, -0.5],
  ['solar', onSite(10.5, 9), 2, -0.5],
  ['rover', onSite(1.5, 7.5), 1.25, -1.1],
]

// Crater rim, as (radius, height) points turned around the vertical axis.
const CRATER_RIM = [
  [1.5, 0.02],
  [1.9, 0.42],
  [2.35, 0.46],
  [3.1, 0],
].map(([r, y]) => new THREE.Vector2(r, y))
const CRATER_AT = onSite(-3.5, -8)

// ---------------------------------------------------------------------------
// Low-poly models. Each one stands on y = 0, is about 1 unit big and is scaled where used.
// Parts that touch keep a small gap or cross each other: no two faces share a plane.
// ---------------------------------------------------------------------------

function Habitat() {
  return (
    <>
      <mesh position-y={0.08}>
        <cylinderGeometry args={[0.62, 0.68, 0.16, 8]} />
        <meshStandardMaterial color={METAL} flatShading />
      </mesh>
      <mesh position-y={0.2}>
        <cylinderGeometry args={[0.6, 0.6, 0.06, 8]} />
        <meshStandardMaterial color={ORANGE} flatShading />
      </mesh>
      <mesh position-y={0.17}>
        <sphereGeometry args={[0.56, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={HULL} flatShading />
      </mesh>
      {/* Airlock tunnel with its hatch */}
      <mesh position={[0, 0.17, 0.66]}>
        <boxGeometry args={[0.3, 0.3, 0.36]} />
        <meshStandardMaterial color={HULL_SHADE} flatShading />
      </mesh>
      <mesh position={[0, 0.15, 0.85]}>
        <boxGeometry args={[0.16, 0.2, 0.03]} />
        <meshStandardMaterial color={METAL} flatShading />
      </mesh>
      {/* Round window */}
      <mesh position={[0.34, 0.42, 0.34]} rotation={[Math.PI / 2, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.1, 0.1, 0.1, 8]} />
        <meshStandardMaterial color={GLASS} flatShading />
      </mesh>
    </>
  )
}

function Tower() {
  return (
    <>
      <mesh position-y={0.04}>
        <boxGeometry args={[0.9, 0.08, 0.9]} />
        <meshStandardMaterial color={METAL} flatShading />
      </mesh>
      <mesh position-y={0.5}>
        <cylinderGeometry args={[0.2, 0.36, 0.9, 7]} />
        <meshStandardMaterial color={HULL} flatShading />
      </mesh>
      <mesh position-y={0.97}>
        <cylinderGeometry args={[0.3, 0.24, 0.1, 7]} />
        <meshStandardMaterial color={ORANGE} flatShading />
      </mesh>
      <mesh position-y={1.045}>
        <cylinderGeometry args={[0.24, 0.24, 0.03, 7]} />
        <meshStandardMaterial color={GLASS} flatShading />
      </mesh>
      {/* Side tank */}
      <mesh position={[0.3, 0.24, 0.28]}>
        <sphereGeometry args={[0.17, 6, 4]} />
        <meshStandardMaterial color={HULL_SHADE} flatShading />
      </mesh>
    </>
  )
}

function SolarPanel() {
  return (
    <>
      <mesh position-y={0.03}>
        <cylinderGeometry args={[0.16, 0.22, 0.06, 3]} />
        <meshStandardMaterial color={METAL} flatShading />
      </mesh>
      <mesh position-y={0.28}>
        <cylinderGeometry args={[0.045, 0.045, 0.5, 6]} />
        <meshStandardMaterial color={METAL} flatShading />
      </mesh>
      <group position-y={0.6} rotation-x={-0.55}>
        <mesh position-y={-0.02}>
          <boxGeometry args={[1.08, 0.03, 0.68]} />
          <meshStandardMaterial color={HULL} flatShading />
        </mesh>
        <mesh>
          <boxGeometry args={[1, 0.05, 0.6]} />
          <meshStandardMaterial color={SOLAR} flatShading />
        </mesh>
      </group>
    </>
  )
}

const WHEELS = [
  [0.26, 0.285],
  [0.26, -0.285],
  [-0.26, 0.285],
  [-0.26, -0.285],
] as const

function Rover() {
  return (
    <>
      <mesh position-y={0.3}>
        <boxGeometry args={[0.7, 0.22, 0.44]} />
        <meshStandardMaterial color={HULL} flatShading />
      </mesh>
      <mesh position={[-0.08, 0.44, 0]}>
        <boxGeometry args={[0.46, 0.03, 0.36]} />
        <meshStandardMaterial color={SOLAR} flatShading />
      </mesh>
      {WHEELS.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, 0.14, z]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.14, 0.14, 0.1, 8]} />
          <meshStandardMaterial color={METAL} flatShading />
        </mesh>
      ))}
      {/* Camera mast: the rover's "head" */}
      <mesh position={[0.24, 0.56, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.32, 5]} />
        <meshStandardMaterial color={METAL} flatShading />
      </mesh>
      <mesh position={[0.26, 0.75, 0]}>
        <boxGeometry args={[0.16, 0.1, 0.12]} />
        <meshStandardMaterial color={ORANGE} flatShading />
      </mesh>
    </>
  )
}

const PROPS: Record<PropKind, () => React.JSX.Element> = {
  habitat: Habitat,
  tower: Tower,
  solar: SolarPanel,
  rover: Rover,
}

// Rocket outline, as (radius, height) points turned around the vertical axis.
const HULL_PROFILE = [
  [0, 0],
  [0.3, 0],
  [0.44, 0.28],
  [0.5, 0.75],
  [0.47, 1.1],
  [0.38, 1.4],
].map(([r, y]) => new THREE.Vector2(r, y))
const NOSE_PROFILE = [
  [0.38, 1.4],
  [0.27, 1.68],
  [0.13, 1.9],
  [0, 2],
].map(([r, y]) => new THREE.Vector2(r, y))

function buildFin() {
  const shape = new THREE.Shape()
  shape.moveTo(0.4, 0.75)
  shape.lineTo(0.92, -0.05)
  shape.lineTo(0.95, -FIN_DROP + 0.02)
  shape.lineTo(0.62, -0.2)
  shape.lineTo(0.42, 0.05)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    bevelSegments: 1,
  })
  geometry.translate(0, 0, -0.035)
  return geometry
}

/**
 * Cartoon rocket: round white hull, orange nose and fins, one big window.
 * Its origin is where the fins touch the ground and its nose points to +Y.
 */
function Rocket({
  ref,
  flameRef,
}: {
  ref: RefObject<THREE.Group | null>
  flameRef: RefObject<THREE.Group | null>
}) {
  const fin = useMemo(() => buildFin(), [])
  return (
    <group ref={ref} visible={false}>
      <group position-y={FIN_DROP}>
        <mesh>
          <latheGeometry args={[HULL_PROFILE, 10]} />
          <meshStandardMaterial color={HULL} side={THREE.DoubleSide} flatShading />
        </mesh>
        <mesh>
          <latheGeometry args={[NOSE_PROFILE, 10]} />
          <meshStandardMaterial color={ORANGE} side={THREE.DoubleSide} flatShading />
        </mesh>
        {/* Belt, wider than the hull so the two never share a face. */}
        <mesh position-y={0.62}>
          <cylinderGeometry args={[0.535, 0.535, 0.1, 10]} />
          <meshStandardMaterial color={ORANGE} flatShading />
        </mesh>
        {/* Window: metal ring, then the glass a little further out. */}
        <mesh position={[0, 1.02, 0.45]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 10]} />
          <meshStandardMaterial color={METAL} flatShading />
        </mesh>
        <mesh position={[0, 1.02, 0.47]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.13, 0.13, 0.1, 10]} />
          <meshStandardMaterial
            color={GLASS}
            emissive={GLASS}
            emissiveIntensity={0.35}
            flatShading
          />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={fin} rotation-y={Math.PI / 2 + (i * Math.PI * 2) / 3}>
            <meshStandardMaterial color={ORANGE} flatShading />
          </mesh>
        ))}
        {/* Engine bell */}
        <mesh position-y={-0.1}>
          <cylinderGeometry args={[0.2, 0.3, 0.26, 8]} />
          <meshStandardMaterial color={METAL} flatShading />
        </mesh>
        <group ref={flameRef} position-y={-0.2}>
          <mesh position-y={-0.5} rotation-x={Math.PI}>
            <coneGeometry args={[0.26, 1, 7]} />
            <meshBasicMaterial color={ORANGE} />
          </mesh>
          <mesh position-y={-0.34} rotation-x={Math.PI}>
            <coneGeometry args={[0.14, 0.6, 7]} />
            <meshBasicMaterial color="#ffe08a" />
          </mesh>
        </group>
      </group>
    </group>
  )
}

const SATELLITE_SIZE = 0.1
const PUFFS = 8
// One material for the whole dust ring, so one opacity fades every puff.
const PUFF_MATERIAL = new THREE.MeshStandardMaterial({
  color: PEAK_LIGHT,
  transparent: true,
  flatShading: true,
})

function Director({
  launching,
  still,
  onReady,
  onLanded,
  sceneRef,
  washRef,
  fadeRef,
}: MenuSceneProps & {
  sceneRef: RefObject<HTMLDivElement | null>
  washRef: RefObject<HTMLDivElement | null>
  fadeRef: RefObject<HTMLDivElement | null>
}) {
  const planet = useMemo(() => buildPlanet(), [])
  const planetBase = useMemo(() => buildPlanetBase(), [])
  const planetRocks = useMemo(() => buildPlanetRocks(), [])
  const baseRefs = useRef<(THREE.Group | null)[]>([])
  const ground = useMemo(() => buildGround(), [])
  const rocks = useMemo(() => buildRocks(), [])

  const spaceRef = useRef<THREE.Group>(null)
  const surfaceRef = useRef<THREE.Group>(null)
  const planetRef = useRef<THREE.Group>(null)
  const satelliteRef = useRef<THREE.Group>(null)
  const rocketRef = useRef<THREE.Group>(null)
  const flameRef = useRef<THREE.Group>(null)
  const puffsRef = useRef<THREE.Group>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const sunRef = useRef<THREE.DirectionalLight>(null)

  const elapsed = useRef(0)
  const landed = useRef(false)
  const shown = useRef(false)
  // Seconds since the planet's first frame: the pop-in and the slow turning follow it.
  const onScreen = useRef(0)

  useFrame((state, delta) => {
    const space = spaceRef.current
    const surface = surfaceRef.current
    const globe = planetRef.current
    const satellite = satelliteRef.current
    const rocket = rocketRef.current
    const flame = flameRef.current
    const puffs = puffsRef.current
    const ambient = ambientRef.current
    const sun = sunRef.current
    if (!space || !surface || !globe || !satellite || !rocket || !flame || !puffs) return
    if (!ambient || !sun) return

    // A background tab gives one huge delta when it comes back: never jump ahead.
    if (launching) elapsed.current += Math.min(delta, 0.1)
    const seconds = FREEZE_AT ?? (launching ? elapsed.current : 0)
    const f = transitionFrame(seconds)
    const clock = state.clock.elapsedTime
    const now = still ? 0 : clock
    if (shown.current) onScreen.current += Math.min(delta, 0.1)
    // Reduced motion: no pop-in and no turning, the base is simply there.
    const revealAt = FREEZE_REVEAL ?? (still ? Infinity : onScreen.current)
    const spin = FREEZE_REVEAL !== null || still ? 0 : onScreen.current
    const inSpace = f.set === 'space'
    const camera = state.camera

    space.visible = inSpace
    surface.visible = !inSpace
    // In space the canvas is see-through: the sky and the stars are the page behind it.
    state.scene.background = inSpace ? null : SURFACE_SKY
    state.scene.fog = inSpace ? null : SURFACE_FOG
    ambient.intensity = inSpace ? 2.1 : 1.9
    sun.intensity = inSpace ? 1.7 : 2.2
    if (inSpace) sun.position.set(-4, 5, 5)
    else sun.position.set(8, 12, 4)

    flame.scale.y = (1 + 0.25 * Math.sin(clock * 38)) * (inSpace ? 1 : 1 - 0.5 * f.descent)

    if (inSpace) {
      // The planet is big and low, cut by the bottom of the screen, like the mock-up.
      // On a tall phone it is limited by the width, so the camera backs away.
      const aspect = state.size.width / state.size.height
      const menuDistance = Math.max(3.35, 2.39 / aspect)
      const menuHeight = 0.204 * menuDistance

      // The whole little base goes slowly around, so there is always something new to see.
      globe.rotation.y = 0.5 + spin * 0.05
      const orbit = 2.4 + spin * 0.22
      satellite.position.set(Math.cos(orbit) * 1.32, 0.62, Math.sin(orbit) * 1.32)
      satellite.rotation.set(0.7, -orbit, 0.35)

      // Pieces of the base pop in one by one; the satellite comes last.
      baseRefs.current.forEach((group, i) => {
        if (!group) return
        const pop = popScale(revealProgress(revealAt, i))
        group.visible = pop > 0
        group.scale.setScalar(planetBase[i]!.size * pop)
      })
      const satellitePop = popScale(revealProgress(revealAt, planetBase.length))
      satellite.visible = satellitePop > 0
      satellite.scale.setScalar(SATELLITE_SIZE * satellitePop)

      if (BAKE) {
        camera.position.set(0, menuHeight, menuDistance)
        camera.lookAt(0, 0, 0)
      } else {
        camera.position.set(0, menuHeight, menuDistance).lerp(SITE_CAMERA, f.approach)
        camera.lookAt(v1.set(0, menuHeight, 0).lerp(SITE, f.approach))
      }

      // Rocket: a curve from just behind the camera to the landing site.
      const p = f.flyby
      const q = 1 - p
      const from = v1.set(0.18, menuHeight - 0.15, menuDistance + 0.4)
      const bend = v2.set(0.34, menuHeight - 0.1, menuDistance - 1.5)
      rocket.visible = p > 0
      rocket.position
        .copy(from)
        .multiplyScalar(q * q)
        .addScaledVector(bend, 2 * q * p)
        .addScaledVector(SITE_ROCKET, p * p)
      const heading = v3
        .copy(bend)
        .sub(from)
        .multiplyScalar(q)
        .add(v4.copy(SITE_ROCKET).sub(bend).multiplyScalar(p))
        .normalize()
      rocket.quaternion.setFromUnitVectors(UP, heading)
      // It also shrinks a little, so it does not grow again when the camera catches up.
      rocket.scale.setScalar(0.12 - 0.09 * p)
      flame.visible = true
      puffs.visible = false
    } else {
      const push = f.descent * 0.7 + f.touchdown * 0.3
      camera.position.set(13 - 3 * push, 10.5 - 2.5 * push, 13 - 3 * push)
      camera.lookAt(0, 1.8, 0)

      rocket.visible = true
      rocket.position.set(0, (1 - f.descent) * 17, 0)
      // Window toward the camera; a small sway that stops at the ground.
      rocket.rotation.set(0, Math.PI / 4, Math.sin(now * 3) * 0.05 * (1 - f.descent))
      // Cartoon squash when the fins hit the ground.
      const squash = Math.sin(Math.min(1, f.touchdown * 3) * Math.PI) * 0.12
      rocket.scale.set(
        ROCKET_SIZE_ON_GROUND * (1 + squash * 0.6),
        ROCKET_SIZE_ON_GROUND * (1 - squash),
        ROCKET_SIZE_ON_GROUND * (1 + squash * 0.6),
      )
      flame.visible = f.descent < 1

      // Dust ring blown away by the landing.
      puffs.visible = f.touchdown > 0 && f.touchdown < 1
      PUFF_MATERIAL.opacity = 0.85 * (1 - f.touchdown)
      const spread = 1.4 + 3.8 * Math.sqrt(f.touchdown)
      for (let i = 0; i < puffs.children.length; i++) {
        const angle = (i / puffs.children.length) * Math.PI * 2
        const puff = puffs.children[i]!
        puff.position.set(
          Math.cos(angle) * spread,
          0.4 + f.touchdown * 0.7,
          Math.sin(angle) * spread,
        )
        puff.scale.setScalar(0.6 + 1.5 * f.touchdown)
      }
    }

    // First frame drawn: fade the 3D layer in over the flat planet.
    if (!shown.current && sceneRef.current) {
      shown.current = true
      sceneRef.current.classList.add(styles.sceneReady!)
      onReady()
    }

    if (washRef.current) washRef.current.style.opacity = String(f.wash)
    if (fadeRef.current) fadeRef.current.style.opacity = String(f.fade)

    if (launching && f.done && FREEZE_AT === null && !landed.current) {
      landed.current = true
      onLanded()
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} color="#fff1e0" />
      <directionalLight ref={sunRef} color="#fff6ea" />

      <group ref={spaceRef}>
        <group ref={planetRef}>
          <mesh geometry={planet}>
            <meshStandardMaterial vertexColors roughness={1} flatShading />
          </mesh>
          {planetBase.map((prop, i) => {
            const Model = PROPS[prop.kind]
            return (
              <group
                key={i}
                ref={(group) => {
                  baseRefs.current[i] = group
                }}
                position={prop.position}
                quaternion={prop.quaternion}
                visible={false}
              >
                <Model />
              </group>
            )
          })}
          {planetRocks.map((rock, i) => (
            <mesh key={i} position={rock.position} quaternion={rock.quaternion} scale={rock.size}>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={CRATER_FLOOR} roughness={1} flatShading />
            </mesh>
          ))}
        </group>
        {/* A small satellite going around: body, two solar wings, a dish. */}
        <group ref={satelliteRef} visible={false}>
          <mesh>
            <boxGeometry args={[0.6, 0.6, 0.8]} />
            <meshStandardMaterial color={HULL} flatShading />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 1.05, 0, 0]}>
              <boxGeometry args={[1.3, 0.05, 0.6]} />
              <meshStandardMaterial color={SOLAR} flatShading />
            </mesh>
          ))}
          <mesh position={[0, -0.42, 0]} rotation-x={Math.PI}>
            <coneGeometry args={[0.3, 0.22, 7]} />
            <meshStandardMaterial color={ORANGE} flatShading />
          </mesh>
        </group>
      </group>

      <group ref={surfaceRef} visible={false}>
        <mesh geometry={ground}>
          <meshStandardMaterial vertexColors roughness={1} flatShading />
        </mesh>
        {rocks.map((rock, i) => (
          <mesh key={i} position={rock.position} rotation={rock.rotation} scale={rock.scale}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={rock.color} roughness={1} flatShading />
          </mesh>
        ))}
        {SITE_BASE.map(([kind, position, size, turn], i) => {
          const Model = PROPS[kind]
          return (
            <group key={i} position={position} rotation-y={turn} scale={size}>
              <Model />
            </group>
          )
        })}
        {/* Crater: raised rim and a darker floor just above the ground. */}
        <group position={CRATER_AT}>
          <mesh>
            <latheGeometry args={[CRATER_RIM, 9]} />
            <meshStandardMaterial color={SUNLIT_SAND} side={THREE.DoubleSide} flatShading />
          </mesh>
          <mesh position-y={0.03} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[1.56, 9]} />
            <meshStandardMaterial color={DEEP_RUST} flatShading />
          </mesh>
        </group>
        <group ref={puffsRef} visible={false}>
          {Array.from({ length: PUFFS }, (_, i) => (
            <mesh key={i} material={PUFF_MATERIAL}>
              <icosahedronGeometry args={[0.55, 0]} />
            </mesh>
          ))}
        </group>
      </group>

      <Rocket ref={rocketRef} flameRef={flameRef} />
    </>
  )
}

export default function MenuScene(props: MenuSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const washRef = useRef<HTMLDivElement>(null)
  const fadeRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={sceneRef} className={styles.scene} aria-hidden="true">
      {/* `flat`: no film-style tone mapping, so the colors are exactly the palette above. */}
      <Canvas
        flat
        dpr={[1, 1.75]}
        camera={{ fov: 40, near: 0.02, far: 300, position: [0, 0.68, 3.35] }}
      >
        <Director {...props} sceneRef={sceneRef} washRef={washRef} fadeRef={fadeRef} />
      </Canvas>
      <div ref={washRef} className={styles.wash} />
      <div ref={fadeRef} className={styles.fade} />
    </div>
  )
}

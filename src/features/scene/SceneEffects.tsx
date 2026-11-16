// Owner: Dev C. Thin R3F renderers for Martian dust devils, winter cold crystals/frost mist,
// and modular pressurized habitat corridors. Zero per-frame heap allocations, flatShading active.
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import type { HabitatCorridorSpec } from './baseConnections'

const NOOP_RAYCAST = () => {}

export interface DustDevilStrike {
  id: string
  targetX: number
  targetZ: number
  /** Unit vector pointing outward from base center toward target so approach/exit stay outside the base. */
  outX: number
  outZ: number
  /** Normalized 0..1 lifecycle: 0..0.38 approach, 0.38..0.58 hit, 0.58..1.0 depart. */
  progress: number
}

interface DustDevilTrack {
  centerX: number
  centerZ: number
  radiusX: number
  radiusZ: number
  speed: number
  phase: number
  scale: number
}

const DUST_DEVIL_TRACKS: ReadonlyArray<DustDevilTrack> = [
  { centerX: 0.4, centerZ: -0.6, radiusX: 4.5, radiusZ: 3.8, speed: 0.3, phase: 0.4, scale: 1.0 },
  {
    centerX: -1.1,
    centerZ: 0.9,
    radiusX: 3.7,
    radiusZ: 4.8,
    speed: -0.24,
    phase: 2.3,
    scale: 0.88,
  },
]

const PEBBLE_ANGLES = [0, 1.25, 2.5, 3.75, 5.0] as const

function DustDevilWhirlwind({
  track,
  strike,
}: {
  track: DustDevilTrack
  strike?: DustDevilStrike
}) {
  const rootRef = useRef<Group | null>(null)
  const lowerSwirlRef = useRef<Group | null>(null)
  const midSwirlRef = useRef<Group | null>(null)
  const upperSwirlRef = useRef<Group | null>(null)
  const topSwirlRef = useRef<Group | null>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const root = rootRef.current
    if (!root) return

    if (strike) {
      const p = Math.min(1, Math.max(0, strike.progress))
      const perpX = -strike.outZ
      const perpZ = strike.outX
      let px = strike.targetX
      let pz = strike.targetZ
      let s = 1
      if (p < 0.38) {
        const k = p / 0.38
        const ease = 1 - (1 - k) * (1 - k)
        const dist = 6.2 * (1 - ease)
        const curve = Math.sin(k * Math.PI) * 1.15
        px = strike.targetX + strike.outX * dist + perpX * (1.4 * (1 - ease) + curve)
        pz = strike.targetZ + strike.outZ * dist + perpZ * (1.4 * (1 - ease) + curve)
        s = 0.4 + 0.6 * ease
      } else if (p < 0.58) {
        const j = (p - 0.38) / 0.2
        px = strike.targetX + Math.sin(j * Math.PI * 4) * 0.18
        pz = strike.targetZ + Math.cos(j * Math.PI * 4) * 0.18
        s = 1.06
      } else {
        const k = (p - 0.58) / 0.42
        const ease = k * k
        const dist = 6.5 * ease
        const curve = Math.sin(k * Math.PI) * 1.0
        px = strike.targetX + strike.outX * dist - perpX * (1.8 * ease + curve)
        pz = strike.targetZ + strike.outZ * dist - perpZ * (1.8 * ease + curve)
        s = Math.max(0.05, 1.05 * (1 - ease * 0.88))
      }
      root.position.set(px, 0.02, pz)
      root.scale.setScalar(s * track.scale)
    } else {
      const a = t * track.speed + track.phase
      const px = track.centerX + Math.cos(a) * track.radiusX + Math.sin(a * 2.1) * 0.5
      const pz = track.centerZ + Math.sin(a * 0.92) * track.radiusZ
      root.position.set(px, 0.02, pz)
      root.scale.setScalar(track.scale)
    }

    if (lowerSwirlRef.current) lowerSwirlRef.current.rotation.y = t * 6.4
    if (midSwirlRef.current) {
      midSwirlRef.current.rotation.y = t * 4.8
      midSwirlRef.current.position.x = Math.sin(t * 3.4 + track.phase) * 0.038
      midSwirlRef.current.position.z = Math.cos(t * 3.0 + track.phase) * 0.038
    }
    if (upperSwirlRef.current) {
      upperSwirlRef.current.rotation.y = t * 3.6
      upperSwirlRef.current.position.x = Math.cos(t * 2.7 + track.phase) * 0.055
      upperSwirlRef.current.position.z = Math.sin(t * 2.5 + track.phase) * 0.055
    }
    if (topSwirlRef.current) {
      topSwirlRef.current.rotation.y = t * 2.8
      topSwirlRef.current.position.x = Math.cos(t * 2.2 + track.phase) * 0.075
      topSwirlRef.current.position.z = Math.sin(t * 2.0 + track.phase) * 0.075
    }
  })

  const initX = strike
    ? strike.targetX + strike.outX * 6.2 - strike.outZ * 1.4
    : track.centerX + track.radiusX
  const initZ = strike ? strike.targetZ + strike.outZ * 6.2 + strike.outX * 1.4 : track.centerZ

  return (
    <group ref={rootRef} position={[initX, 0.02, initZ]} scale={track.scale}>
      {/* Swept ground regolith vortex disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={NOOP_RAYCAST}>
        <ringGeometry args={[0.12, 0.46, 9]} />
        <meshStandardMaterial
          color="#c86b38"
          transparent
          opacity={0.44}
          depthWrite={false}
          flatShading
        />
      </mesh>

      {/* Layer 1: Tight base vortex + orbiting pebbles */}
      <group ref={lowerSwirlRef}>
        <mesh position={[0, 0.14, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[0.17, 0.09, 0.26, 7, 1, true]} />
          <meshStandardMaterial
            color="#d67841"
            transparent
            opacity={0.68}
            depthWrite={false}
            flatShading
          />
        </mesh>
        {PEBBLE_ANGLES.slice(0, 3).map((ang, i) => (
          <mesh
            key={i}
            position={[Math.cos(ang) * 0.24, 0.1 + i * 0.09, Math.sin(ang) * 0.24]}
            rotation={[i * 0.5, ang, 0.3]}
            raycast={NOOP_RAYCAST}
          >
            <dodecahedronGeometry args={[0.032, 0]} />
            <meshStandardMaterial color="#8d3f1d" flatShading />
          </mesh>
        ))}
      </group>

      {/* Layer 2: Mid funnel + suspended regolith shards */}
      <group ref={midSwirlRef}>
        <mesh position={[0, 0.39, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[0.28, 0.15, 0.32, 7, 1, true]} />
          <meshStandardMaterial
            color="#e18f54"
            transparent
            opacity={0.54}
            depthWrite={false}
            flatShading
          />
        </mesh>
        {PEBBLE_ANGLES.slice(3).map((ang, i) => (
          <mesh
            key={i}
            position={[Math.cos(ang) * 0.33, 0.38 + i * 0.13, Math.sin(ang) * 0.33]}
            rotation={[0.4, ang, 0.2]}
            raycast={NOOP_RAYCAST}
          >
            <dodecahedronGeometry args={[0.028, 0]} />
            <meshStandardMaterial color="#a64f27" flatShading />
          </mesh>
        ))}
      </group>

      {/* Layer 3: Upper expanding cone */}
      <group ref={upperSwirlRef}>
        <mesh position={[0, 0.69, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[0.39, 0.25, 0.34, 7, 1, true]} />
          <meshStandardMaterial
            color="#e7a16b"
            transparent
            opacity={0.4}
            depthWrite={false}
            flatShading
          />
        </mesh>
      </group>

      {/* Layer 4: Crown plume */}
      <group ref={topSwirlRef}>
        <mesh position={[0, 1.0, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[0.52, 0.35, 0.34, 7, 1, true]} />
          <meshStandardMaterial
            color="#edb484"
            transparent
            opacity={0.25}
            depthWrite={false}
            flatShading
          />
        </mesh>
      </group>
    </group>
  )
}

export function DustDevils({
  count,
  strikes = [],
}: {
  count: number
  strikes?: ReadonlyArray<DustDevilStrike>
}) {
  if (count <= 0 && strikes.length === 0) return null
  if (strikes.length > 0) {
    return (
      <group>
        {strikes.slice(0, 2).map((strike, idx) => (
          <DustDevilWhirlwind
            key={strike.id}
            track={DUST_DEVIL_TRACKS[idx % DUST_DEVIL_TRACKS.length]!}
            strike={strike}
          />
        ))}
      </group>
    )
  }
  const activeCount = Math.min(DUST_DEVIL_TRACKS.length, Math.max(1, Math.round(count)))
  return (
    <group>
      {DUST_DEVIL_TRACKS.slice(0, activeCount).map((track, idx) => (
        <DustDevilWhirlwind key={idx} track={track} />
      ))}
    </group>
  )
}

interface IceCrystalSpec {
  x0: number
  y0: number
  z0: number
  fallSpeed: number
  driftSpeed: number
  phase: number
  scale: number
}

const ICE_CRYSTALS: ReadonlyArray<IceCrystalSpec> = Array.from({ length: 42 }, (_, idx) => {
  const h1 = Math.sin(idx * 12.9898) * 43758.5453
  const r1 = h1 - Math.floor(h1)
  const h2 = Math.sin((idx + 7) * 78.233) * 19341.123
  const r2 = h2 - Math.floor(h2)
  const h3 = Math.sin((idx + 19) * 39.421) * 28411.987
  const r3 = h3 - Math.floor(h3)
  return {
    x0: (r1 - 0.5) * 13.5,
    y0: 0.2 + r2 * 3.1,
    z0: (r3 - 0.5) * 13.5,
    fallSpeed: 0.28 + r1 * 0.25,
    driftSpeed: 0.45 + r2 * 0.35,
    phase: r3 * Math.PI * 2,
    scale: 0.75 + r1 * 0.6,
  }
})

const COLD_SPAN = 14
const COLD_HALF = COLD_SPAN / 2

export function WinterColdEffect({ intensity }: { intensity: number }) {
  const flakeRefs = useRef<Array<Group | null>>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let i = 0; i < ICE_CRYSTALS.length; i++) {
      const c = ICE_CRYSTALS[i]!
      const grp = flakeRefs.current[i]
      if (!grp) continue

      const x =
        ((((c.x0 + t * c.driftSpeed + COLD_HALF) % COLD_SPAN) + COLD_SPAN) % COLD_SPAN) - COLD_HALF
      const z =
        ((((c.z0 + t * c.driftSpeed * 0.45 + Math.sin(t + c.phase) * 0.25 + COLD_HALF) %
          COLD_SPAN) +
          COLD_SPAN) %
          COLD_SPAN) -
        COLD_HALF
      const yRange = 3.2
      const y = 0.12 + ((((c.y0 - t * c.fallSpeed) % yRange) + yRange) % yRange)

      grp.position.set(x, y, z)
      grp.rotation.set(t * 0.9 + c.phase, t * 1.1, 0)
    }
  })

  if (intensity <= 0.05) return null
  const activeFlakes = intensity >= 0.7 ? ICE_CRYSTALS : ICE_CRYSTALS.slice(0, 20)
  const opacity = Math.min(0.85, 0.38 + intensity * 0.45)

  return (
    <group>
      {activeFlakes.map((c, idx) => (
        <group
          key={idx}
          ref={(el) => {
            flakeRefs.current[idx] = el
          }}
          position={[c.x0, c.y0, c.z0]}
          scale={c.scale}
        >
          <mesh raycast={NOOP_RAYCAST}>
            <octahedronGeometry args={[0.036, 0]} />
            <meshStandardMaterial
              color="#d8f2ff"
              emissive="#7ec8f2"
              emissiveIntensity={0.45}
              transparent
              opacity={opacity}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function HabitatCorridors({
  corridors,
  nightGlow = false,
}: {
  corridors: ReadonlyArray<HabitatCorridorSpec>
  nightGlow?: boolean
}) {
  if (corridors.length === 0) return null
  const windowEmissive = nightGlow ? '#ffd48a' : '#5bd6a0'
  const windowIntensity = nightGlow ? 0.9 : 0.42

  return (
    <group>
      {corridors.map((c) => {
        const isBridge = c.kind === 'bridge'
        const rotY = c.axis === 'x' ? Math.PI / 2 : 0
        const collarOffset = Math.max(0.08, c.length * 0.5 - 0.12)
        return (
          <group key={c.id} position={[c.x, 0.255, c.z]} rotation={[0, rotY, 0]}>
            {/* Armored dark foundation spine */}
            <mesh position={[0, -0.105, 0]} raycast={NOOP_RAYCAST}>
              <boxGeometry args={[0.24, 0.08, c.length]} />
              <meshStandardMaterial color="#2e3846" flatShading />
            </mesh>

            {/* Support pylons down to terrain for multi-tile bridge corridors */}
            {isBridge && (
              <>
                <mesh position={[0, -0.175, -0.26]} raycast={NOOP_RAYCAST}>
                  <boxGeometry args={[0.22, 0.16, 0.09]} />
                  <meshStandardMaterial color="#2e3846" flatShading />
                </mesh>
                <mesh position={[0, -0.175, 0.26]} raycast={NOOP_RAYCAST}>
                  <boxGeometry args={[0.22, 0.16, 0.09]} />
                  <meshStandardMaterial color="#2e3846" flatShading />
                </mesh>
              </>
            )}

            {/* Main faceted octagonal pressurized tunnel (#f0f2f5 matching HabitatMesh) */}
            <mesh rotation={[Math.PI / 2, Math.PI / 8, 0]} raycast={NOOP_RAYCAST}>
              <cylinderGeometry args={[0.148, 0.148, c.length, 8]} />
              <meshStandardMaterial color="#f0f2f5" flatShading />
            </mesh>

            {/* Dorsal armored spine plate */}
            <mesh position={[0, 0.145, 0]} raycast={NOOP_RAYCAST}>
              <boxGeometry args={[0.11, 0.018, Math.max(0.1, c.length - 0.08)]} />
              <meshStandardMaterial color="#d9e0e8" flatShading />
            </mesh>

            {/* Dark metallic gasket + safety-orange airlock docking collars at both habitat interfaces */}
            {[-collarOffset, collarOffset].map((zPos, idx) => (
              <group key={idx} position={[0, 0, zPos]}>
                <mesh rotation={[Math.PI / 2, Math.PI / 8, 0]} raycast={NOOP_RAYCAST}>
                  <cylinderGeometry args={[0.172, 0.172, 0.055, 8]} />
                  <meshStandardMaterial color="#ff7a29" flatShading />
                </mesh>
                <mesh
                  position={[0, 0, zPos < 0 ? -0.036 : 0.036]}
                  rotation={[Math.PI / 2, Math.PI / 8, 0]}
                  raycast={NOOP_RAYCAST}
                >
                  <cylinderGeometry args={[0.162, 0.162, 0.025, 8]} />
                  <meshStandardMaterial color="#2e3846" flatShading />
                </mesh>
              </group>
            ))}

            {/* Mid-span structural rib + glowing pressurized corridor viewports */}
            {isBridge && (
              <>
                <mesh rotation={[Math.PI / 2, Math.PI / 8, 0]} raycast={NOOP_RAYCAST}>
                  <cylinderGeometry args={[0.168, 0.168, 0.065, 8]} />
                  <meshStandardMaterial color="#2e3846" flatShading />
                </mesh>
                {[-0.22, 0.22].map((zOff, i) => (
                  <group key={i} position={[0, 0.015, zOff]}>
                    <mesh position={[0.142, 0, 0]} raycast={NOOP_RAYCAST}>
                      <boxGeometry args={[0.018, 0.055, 0.15]} />
                      <meshStandardMaterial
                        color={windowEmissive}
                        emissive={windowEmissive}
                        emissiveIntensity={windowIntensity}
                        flatShading
                      />
                    </mesh>
                    <mesh position={[-0.142, 0, 0]} raycast={NOOP_RAYCAST}>
                      <boxGeometry args={[0.018, 0.055, 0.15]} />
                      <meshStandardMaterial
                        color={windowEmissive}
                        emissive={windowEmissive}
                        emissiveIntensity={windowIntensity}
                        flatShading
                      />
                    </mesh>
                  </group>
                ))}
              </>
            )}
          </group>
        )
      })}
    </group>
  )
}

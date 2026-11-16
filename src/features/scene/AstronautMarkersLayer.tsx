// Owner: Dev C. Thin R3F renderer for EVA astronauts with habitat airlock exit,
// obstacle-avoiding paths, and smooth return-to-habitat walking (US4).
// All coordinate/path math lives in astronautMarkers.ts; zero per-frame heap allocations.
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { config } from '../../config/loadConfig'
import type { StructureInstance } from '../../engine/types'
import { findAstronautPath, type AstronautWaypoint, type WorldPoint } from './astronautMarkers'
import type { Grid } from './iso'

const NOOP_RAYCAST = () => {}
const WALK_SPEED = 1.45
const GRID: Grid = config.mission.grid

const SUIT_WHITE = '#f0f2f5'
const SUIT_TRIM = '#d9e0e8'
const SUIT_JOINT = '#2e3846'
const VISOR_GOLD = '#e3a544'

interface AstronautNavState {
  id: string
  color: string
  phaseOffset: number
  homeFrom: WorldPoint
  targetTo: WorldPoint
  path: ReadonlyArray<WorldPoint>
  segIdx: number
  x: number
  z: number
  heading: number
  returning: boolean
  arrived: boolean
}

function advanceAlongPath(nav: AstronautNavState, dt: number): boolean {
  if (nav.arrived || nav.path.length === 0) return false
  let remaining = WALK_SPEED * dt
  let moved = false
  while (remaining > 1e-5 && nav.segIdx < nav.path.length) {
    const dest = nav.path[nav.segIdx]!
    const dx = dest[0] - nav.x
    const dz = dest[2] - nav.z
    const dist = Math.hypot(dx, dz)
    if (dist < 1e-4) {
      nav.x = dest[0]
      nav.z = dest[2]
      nav.segIdx += 1
      continue
    }
    moved = true
    nav.heading = Math.atan2(dx, dz)
    if (dist <= remaining) {
      nav.x = dest[0]
      nav.z = dest[2]
      remaining -= dist
      nav.segIdx += 1
    } else {
      const inv = remaining / dist
      nav.x += dx * inv
      nav.z += dz * inv
      remaining = 0
    }
  }
  if (nav.segIdx >= nav.path.length) {
    nav.arrived = true
  }
  return moved
}

function AstronautPuppet({
  nav,
  dark,
  onReturnedHome,
}: {
  nav: AstronautNavState
  dark: boolean
  onReturnedHome: (id: string) => void
}) {
  const rootRef = useRef<Group | null>(null)
  const bodyRef = useRef<Group | null>(null)
  const leftLegRef = useRef<Group | null>(null)
  const rightLegRef = useRef<Group | null>(null)
  const leftArmRef = useRef<Group | null>(null)
  const rightArmRef = useRef<Group | null>(null)
  const notifiedReturnRef = useRef(false)

  useFrame(({ clock }, delta) => {
    const grp = rootRef.current
    if (!grp) return

    const dt = Math.min(0.05, Math.max(0, delta))
    const t = clock.elapsedTime
    const walking = advanceAlongPath(nav, dt)

    if (nav.returning && nav.arrived && !notifiedReturnRef.current) {
      notifiedReturnRef.current = true
      onReturnedHome(nav.id)
      return
    }

    const stridePhase = t * 10.5 + nav.phaseOffset
    const stride = walking ? Math.sin(stridePhase) : 0
    const strideBob = walking
      ? Math.abs(stride) * 0.015
      : Math.sin(t * 2.6 + nav.phaseOffset) * 0.004

    grp.position.set(nav.x, strideBob, nav.z)
    grp.rotation.y = walking
      ? nav.heading
      : nav.heading + Math.sin(t * 2.1 + nav.phaseOffset) * 0.18

    if (bodyRef.current) {
      bodyRef.current.rotation.z = walking ? stride * 0.05 : 0
      bodyRef.current.rotation.x = walking ? 0.06 : Math.sin(t * 2.5 + nav.phaseOffset) * 0.04
    }
    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = walking ? stride * 0.52 : 0
      rightLegRef.current.rotation.x = walking ? -stride * 0.52 : 0
    }
    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = walking
        ? -stride * 0.42
        : -0.45 + Math.sin(t * 4.5 + nav.phaseOffset) * 0.12
      rightArmRef.current.rotation.x = walking
        ? stride * 0.42
        : -0.35 + Math.cos(t * 4.2 + nav.phaseOffset) * 0.1
    }
  })

  return (
    <group ref={rootRef} position={[nav.x, 0, nav.z]}>
      {/* Ground contact shadow disc */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={NOOP_RAYCAST}>
        <circleGeometry args={[0.075, 10]} />
        <meshBasicMaterial color="#1a0d08" transparent opacity={0.35} depthWrite={false} />
      </mesh>

      <group ref={bodyRef}>
        {/* Left Leg (pivoted at hip y = 0.106) */}
        <group ref={leftLegRef} position={[-0.025, 0.106, 0]}>
          <mesh position={[0, -0.036, 0]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[0.018, 0.016, 0.068, 6]} />
            <meshStandardMaterial color={SUIT_WHITE} flatShading />
          </mesh>
          <mesh position={[0, -0.04, 0.012]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.026, 0.018, 0.014]} />
            <meshStandardMaterial color={SUIT_JOINT} flatShading />
          </mesh>
          <mesh position={[0, -0.08, 0.008]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.034, 0.028, 0.052]} />
            <meshStandardMaterial color={SUIT_JOINT} flatShading />
          </mesh>
        </group>

        {/* Right Leg (pivoted at hip y = 0.106) */}
        <group ref={rightLegRef} position={[0.025, 0.106, 0]}>
          <mesh position={[0, -0.036, 0]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[0.018, 0.016, 0.068, 6]} />
            <meshStandardMaterial color={SUIT_WHITE} flatShading />
          </mesh>
          <mesh position={[0, -0.04, 0.012]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.026, 0.018, 0.014]} />
            <meshStandardMaterial color={SUIT_JOINT} flatShading />
          </mesh>
          <mesh position={[0, -0.08, 0.008]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.034, 0.028, 0.052]} />
            <meshStandardMaterial color={SUIT_JOINT} flatShading />
          </mesh>
        </group>

        {/* Torso + Waist Harness + Chest Telemetry Pack */}
        <mesh position={[0, 0.15, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[0.05, 0.044, 0.092, 6]} />
          <meshStandardMaterial color={SUIT_WHITE} flatShading />
        </mesh>
        <mesh position={[0, 0.122, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[0.049, 0.049, 0.02, 6]} />
          <meshStandardMaterial
            color={nav.color}
            emissive={dark ? nav.color : '#000000'}
            emissiveIntensity={dark ? 0.35 : 0}
            flatShading
          />
        </mesh>
        <mesh position={[0, 0.158, 0.042]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[0.048, 0.036, 0.018]} />
          <meshStandardMaterial color={SUIT_JOINT} flatShading />
        </mesh>
        <mesh position={[0.012, 0.162, 0.053]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[0.014, 0.01, 0.004]} />
          <meshStandardMaterial
            color={nav.color}
            emissive={nav.color}
            emissiveIntensity={dark ? 0.7 : 0.25}
            flatShading
          />
        </mesh>

        {/* Left Arm (pivoted at shoulder y = 0.184) */}
        <group ref={leftArmRef} position={[-0.058, 0.184, 0]} rotation={[0, 0, 0.12]}>
          <mesh position={[0, 0, 0]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.032, 0.022, 0.034]} />
            <meshStandardMaterial color={nav.color} flatShading />
          </mesh>
          <mesh position={[0, -0.038, 0.004]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[0.014, 0.013, 0.062, 6]} />
            <meshStandardMaterial color={SUIT_WHITE} flatShading />
          </mesh>
          <mesh position={[0, -0.072, 0.006]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.024, 0.02, 0.026]} />
            <meshStandardMaterial color={SUIT_JOINT} flatShading />
          </mesh>
        </group>

        {/* Right Arm (pivoted at shoulder y = 0.184) */}
        <group ref={rightArmRef} position={[0.058, 0.184, 0]} rotation={[0, 0, -0.12]}>
          <mesh position={[0, 0, 0]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.032, 0.022, 0.034]} />
            <meshStandardMaterial color={nav.color} flatShading />
          </mesh>
          <mesh position={[0, -0.038, 0.004]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[0.014, 0.013, 0.062, 6]} />
            <meshStandardMaterial color={SUIT_WHITE} flatShading />
          </mesh>
          <mesh position={[0, -0.072, 0.006]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.024, 0.02, 0.026]} />
            <meshStandardMaterial color={SUIT_JOINT} flatShading />
          </mesh>
        </group>

        {/* PLSS Life-Support Backpack + Twin O2 Canisters + Whip Antenna */}
        <mesh position={[0, 0.156, -0.052]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[0.074, 0.092, 0.036]} />
          <meshStandardMaterial color={SUIT_TRIM} flatShading />
        </mesh>
        <mesh position={[0, 0.194, -0.052]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[0.078, 0.018, 0.04]} />
          <meshStandardMaterial
            color={nav.color}
            emissive={dark ? nav.color : '#000000'}
            emissiveIntensity={dark ? 0.35 : 0}
            flatShading
          />
        </mesh>
        <mesh position={[-0.02, 0.15, -0.074]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[0.013, 0.013, 0.072, 6]} />
          <meshStandardMaterial color={nav.color} flatShading />
        </mesh>
        <mesh position={[0.02, 0.15, -0.074]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[0.013, 0.013, 0.072, 6]} />
          <meshStandardMaterial color={nav.color} flatShading />
        </mesh>
        <mesh position={[0.026, 0.238, -0.054]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[0.003, 0.004, 0.074, 5]} />
          <meshStandardMaterial color={SUIT_JOINT} flatShading />
        </mesh>
        <mesh position={[0.026, 0.278, -0.054]} raycast={NOOP_RAYCAST}>
          <sphereGeometry args={[0.006, 5, 4]} />
          <meshStandardMaterial
            color={nav.color}
            emissive={nav.color}
            emissiveIntensity={dark ? 1.1 : 0.3}
            flatShading
          />
        </mesh>

        {/* Helmet Collar, Faceted Dome, Visor Bezel, Reflective Gold Visor & Headlamp */}
        <mesh position={[0, 0.2, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[0.042, 0.046, 0.016, 8]} />
          <meshStandardMaterial color={nav.color} flatShading />
        </mesh>
        <mesh position={[0, 0.238, 0]} raycast={NOOP_RAYCAST}>
          <dodecahedronGeometry args={[0.05, 0]} />
          <meshStandardMaterial color={SUIT_WHITE} flatShading />
        </mesh>
        <mesh position={[0, 0.238, 0.026]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry
            args={[0.042, 0.042, 0.036, 8, 1, false, -Math.PI * 0.42, Math.PI * 0.84]}
          />
          <meshStandardMaterial color={SUIT_JOINT} flatShading />
        </mesh>
        <mesh position={[0, 0.238, 0.031]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry
            args={[0.038, 0.038, 0.028, 8, 1, false, -Math.PI * 0.36, Math.PI * 0.72]}
          />
          <meshStandardMaterial
            color={VISOR_GOLD}
            emissive={dark ? '#ffd68a' : '#4a2b0a'}
            emissiveIntensity={dark ? 0.5 : 0.2}
            metalness={0.55}
            roughness={0.25}
            flatShading
          />
        </mesh>
        <mesh position={[0, 0.272, 0.038]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[0.022, 0.012, 0.014]} />
          <meshStandardMaterial
            color="#fff6df"
            emissive="#ffe3a8"
            emissiveIntensity={dark ? 1.2 : 0.2}
            flatShading
          />
        </mesh>
      </group>
    </group>
  )
}

export function AstronautMarkers({
  waypoints,
  structures,
  dark = false,
}: {
  waypoints: ReadonlyArray<AstronautWaypoint>
  structures: ReadonlyArray<StructureInstance>
  dark?: boolean
}) {
  const navMapRef = useRef<Map<string, AstronautNavState>>(new Map())
  const [, setVersion] = useState(0)

  useEffect(() => {
    const navMap = navMapRef.current
    const activeIds = new Set(waypoints.map((w) => w.id))
    let changed = false

    for (const wp of waypoints) {
      const existing = navMap.get(wp.id)
      if (!existing) {
        // Entering EVA: always start at habitat airlock (wp.from) and walk along obstacle-avoiding path
        navMap.set(wp.id, {
          id: wp.id,
          color: wp.color,
          phaseOffset: wp.phaseOffset,
          homeFrom: wp.from,
          targetTo: wp.to,
          path: wp.path.length > 0 ? wp.path : [wp.from, wp.to],
          segIdx: 1,
          x: wp.from[0],
          z: wp.from[2],
          heading: 0,
          returning: false,
          arrived: false,
        })
        changed = true
      } else {
        const targetMoved =
          Math.hypot(existing.targetTo[0] - wp.to[0], existing.targetTo[2] - wp.to[2]) > 0.05
        if (existing.returning || targetMoved) {
          existing.returning = false
          existing.arrived = false
          existing.homeFrom = wp.from
          existing.targetTo = wp.to
          existing.path = findAstronautPath(
            [existing.x, 0, existing.z],
            wp.to,
            structures,
            config,
            GRID,
          )
          existing.segIdx = 1
          changed = true
        }
      }
    }

    for (const [id, nav] of navMap.entries()) {
      if (activeIds.has(id)) continue
      if (id.startsWith('dev-eva-')) {
        navMap.delete(id)
        changed = true
        continue
      }
      if (!nav.returning) {
        // Recalled to habitat: walk from current [x, z] back to habitat airlock around obstacles
        nav.returning = true
        nav.arrived = false
        nav.path = findAstronautPath([nav.x, 0, nav.z], nav.homeFrom, structures, config, GRID)
        nav.segIdx = 1
        changed = true
      }
    }

    if (changed) setVersion((v) => v + 1)
  }, [waypoints, structures])

  const handleReturnedHome = (id: string) => {
    navMapRef.current.delete(id)
    setVersion((v) => v + 1)
  }

  const activeNavs = Array.from(navMapRef.current.values())
  if (activeNavs.length === 0) return null
  return (
    <group>
      {activeNavs.map((nav) => (
        <AstronautPuppet key={nav.id} nav={nav} dark={dark} onReturnedHome={handleReturnedHome} />
      ))}
    </group>
  )
}

// Owner: Dev C. Distinct low-poly 3D models for all 11 Martian outpost structures.
// Follows specs/004-base-scene/visual-references/README.md: flat-shaded low-poly
// silhouettes, high-contrast white/light-gray hulls (#f0f2f5, #d9e0e8), safety-orange
// accents (#ff7a29), mint-green bio/energy highlights (#5bd6a0), stilt foundations,
// and non-color visual cues for building, damaged, clogged, short-circuit, and frost.
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  CatmullRomCurve3,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
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
const FROST_ICE = '#dff4ff'
const FROST_ICE_DEEP = '#74c6f7'
const FROST_GLOW = '#5ecbff'
const DUST_DRIFT = '#d4763c'
const DUST_DRIFT_DARK = '#9e4c21'
const SPARK_YELLOW = '#ffe066'
const SPARK_CYAN = '#7df9ff'
const SMOKE_DARK = '#3d3532'
const SMOKE_CHAR = '#282324'

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
    [0.578, 0.368],
    [0.59, 0.39],
    [0.556, 0.488],
    [0.438, 0.632],
    [0.278, 0.706],
    [0.258, 0.795],
    [0.215, 0.818],
    [0, 0.84],
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

// Shared datum & static procedural geometries for Battery Bank (1x1 footprint <= 0.88 x 0.88)
const BAT_BASE_Y = 0.022

const BATTERY_GEO = {
  rackTray: new ExtrudeGeometry(makeChamferedRectShape(0.32, 0.27, 0.04), {
    depth: 0.035,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.01,
    bevelSegments: 1,
  }),
  cellBody: latheOctagon([
    [0, 0],
    [0.105, 0],
    [0.114, 0.028],
    [0.114, 0.355],
    [0.088, 0.395],
    [0.088, 0.435],
    [0, 0.435],
  ]),
  cellBand: latheOctagon([
    [0.11, 0.25],
    [0.124, 0.258],
    [0.124, 0.295],
    [0.11, 0.303],
  ]),
  busbar: new ExtrudeGeometry(makeChamferedRectShape(0.23, 0.18, 0.032), {
    depth: 0.034,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.01,
    bevelSegments: 1,
  }),
  hvConduit: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(0.21, BAT_BASE_Y + 0.51, 0),
      new Vector3(0.345, BAT_BASE_Y + 0.46, 0),
      new Vector3(0.345, BAT_BASE_Y + 0.2, 0),
      new Vector3(0.29, BAT_BASE_Y + 0.055, 0),
    ]),
    8,
    0.018,
    6,
    false,
  ),
}

// Shared helper to place any strut/conveyor/boom accurately between two 3D endpoints
const UP_AXIS = new Vector3(0, 1, 0)

function makeStrutTransform(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
) {
  const va = new Vector3(a[0], a[1], a[2])
  const vb = new Vector3(b[0], b[1], b[2])
  const dir = vb.clone().sub(va)
  const length = dir.length()
  const mid = va.clone().add(vb).multiplyScalar(0.5)
  const quat = new Quaternion().setFromUnitVectors(UP_AXIS, dir.normalize())
  return {
    position: [mid.x, mid.y, mid.z] as const,
    quaternion: quat,
    length,
  }
}

// Shared datum & static procedural geometries for Mine (2x2 footprint <= 1.76 x 1.76)
const MINE_BASE_Y = 0.022
const MINE_PIT_X = -0.36
const MINE_PIT_Z = -0.34
const MINE_TOWER_X = 0.16
const MINE_TOWER_Z = -0.32
const MINE_TOWER_TOP_Y = MINE_BASE_Y + 0.84
const MINE_BOOM_TIP: readonly [number, number, number] = [
  MINE_PIT_X,
  MINE_TOWER_TOP_Y + 0.28,
  MINE_PIT_Z,
]

const MINE_TRUSS_STRUTS = (() => {
  const bx = 0.19
  const tx = 0.12
  const y0 = MINE_BASE_Y
  const y1 = MINE_TOWER_TOP_Y
  const ym = (y0 + y1) * 0.5
  const xm = (bx + tx) * 0.5

  const corners: ReadonlyArray<readonly [number, number]> = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]

  const legs = corners.map(([sx, sz]) =>
    makeStrutTransform(
      [MINE_TOWER_X + sx * bx, y0, MINE_TOWER_Z + sz * bx],
      [MINE_TOWER_X + sx * tx, y1, MINE_TOWER_Z + sz * tx],
    ),
  )

  const midRings = corners.map(([sx, sz], i) => {
    const [nx, nz] = corners[(i + 1) % 4]!
    return makeStrutTransform(
      [MINE_TOWER_X + sx * xm, ym, MINE_TOWER_Z + sz * xm],
      [MINE_TOWER_X + nx * xm, ym, MINE_TOWER_Z + nz * xm],
    )
  })

  const diagBraces = corners.map(([sx, sz], i) => {
    const [nx, nz] = corners[(i + 1) % 4]!
    return makeStrutTransform(
      [MINE_TOWER_X + sx * bx, y0 + 0.03, MINE_TOWER_Z + sz * bx],
      [MINE_TOWER_X + nx * xm, ym, MINE_TOWER_Z + nz * xm],
    )
  })

  const upperBraces = corners.map(([sx, sz], i) => {
    const [nx, nz] = corners[(i + 1) % 4]!
    return makeStrutTransform(
      [MINE_TOWER_X + sx * xm, ym, MINE_TOWER_Z + sz * xm],
      [MINE_TOWER_X + nx * tx, y1 - 0.02, MINE_TOWER_Z + nz * tx],
    )
  })

  // Boom starts at front face of hoist house; stay anchors above the gantry pylon so it never intersects the boom
  const boomArm = makeStrutTransform([MINE_TOWER_X - 0.08, y1 + 0.1, MINE_TOWER_Z], MINE_BOOM_TIP)

  const boomStay = makeStrutTransform(
    [MINE_TOWER_X + 0.08, y1 + 0.34, MINE_TOWER_Z + 0.02],
    [MINE_BOOM_TIP[0], MINE_BOOM_TIP[1] + 0.055, MINE_BOOM_TIP[2]],
  )

  return { legs, midRings, diagBraces, upperBraces, boomArm, boomStay }
})()

const MINE_GEO = {
  // Continuous 2-step collar profile (outer-bottom -> top -> inner-floor so normals face up/out)
  pitCollar: latheOctagon(
    [
      [0.31, 0],
      [0.27, 0.045],
      [0.21, 0.045],
      [0.18, 0.01],
    ],
    8,
  ),
  hopperBody: new LatheGeometry(
    [
      new Vector2(0.08, 0),
      new Vector2(0.24, 0.22),
      new Vector2(0.24, 0.27),
      new Vector2(0.2, 0.27),
      new Vector2(0.06, 0.04),
    ],
    4,
    Math.PI / 4,
  ),
  // Hollow orange hopper lip so the open ore mouth & interior are clearly visible
  hopperRim: (() => {
    const g = new ExtrudeGeometry(makeHollowRectFrameShape(0.36, 0.36, 0.045), {
      depth: 0.032,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 1,
    })
    g.rotateX(-Math.PI / 2)
    return g
  })(),
}

// Shared datum & static procedural geometries for Oxygen Generator (1x1 footprint <= 0.88 x 0.88)
const OXY_BASE_Y = 0.022

const OXY_GEO = {
  // Chamfered MOXIE electrolysis processor housing
  coreHousing: (() => {
    const g = new ExtrudeGeometry(makeChamferedArchShape(0.21, 0.36, 0.055), {
      depth: 0.28,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 1,
    })
    g.rotateY(Math.PI / 2)
    g.translate(-0.14, 0, 0)
    return g
  })(),
  // Flared intake cowl at top of MOXIE dust-filter stack
  intakeCowl: latheOctagon(
    [
      [0.072, 0],
      [0.112, 0.045],
      [0.112, 0.1],
      [0.068, 0.115],
      [0, 0.115],
    ],
    8,
  ),
  // Faceted vertical pressurized O2 capsule vessel (WATER_BLUE)
  tankBody: latheOctagon(
    [
      [0, 0.03],
      [0.088, 0.045],
      [0.145, 0.1],
      [0.145, 0.29],
      [0.095, 0.35],
      [0.048, 0.37],
      [0, 0.375],
    ],
    8,
  ),
  // High-pressure O2 transfer pipe arching from MOXIE core to pressurized tank crown
  o2FeedPipe: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(-0.02, OXY_BASE_Y + 0.34, 0.04),
      new Vector3(0.06, OXY_BASE_Y + 0.44, 0.04),
      new Vector3(0.16, OXY_BASE_Y + 0.45, 0.04),
      new Vector3(0.21, OXY_BASE_Y + 0.4, 0.04),
    ]),
    10,
    0.02,
    6,
    false,
  ),
  // Exhaust transfer line from MOXIE rear to CO condenser stack
  exhaustPipe: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(-0.02, OXY_BASE_Y + 0.24, -0.15),
      new Vector3(0.08, OXY_BASE_Y + 0.24, -0.18),
      new Vector3(0.16, OXY_BASE_Y + 0.24, -0.21),
    ]),
    6,
    0.018,
    6,
    false,
  ),
}

// Shared datum & static procedural geometries for Ice Melter (1x1 footprint <= 0.88 x 0.88)
const ICE_BASE_Y = 0.022

const ICE_GEO = {
  // Open-top octagonal thermal melting cauldron (continuous outer wall, thick lip, inner cavity)
  openVat: latheOctagon(
    [
      [0, 0],
      [0.12, 0.012],
      [0.195, 0.06],
      [0.205, 0.3],
      [0.162, 0.3],
      [0.155, 0.21],
      [0, 0.21],
    ],
    8,
  ),
  // Hollow dark bezel ring crowning the open cauldron rim without occluding the ice bath
  vatRim: latheOctagon(
    [
      [0.214, 0],
      [0.214, 0.026],
      [0.158, 0.026],
      [0.158, 0],
    ],
    8,
  ),
  // Meltwater drain line from bottom of heated vat into front water collector tank
  meltDrainPipe: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(0.12, ICE_BASE_Y + 0.12, -0.01),
      new Vector3(0.16, ICE_BASE_Y + 0.1, 0.12),
      new Vector3(0.22, ICE_BASE_Y + 0.14, 0.22),
    ]),
    8,
    0.02,
    6,
    false,
  ),
}

// Shared datum & static procedural geometries for Iron Refinery (2x2 footprint <= 1.76 x 1.76)
const IRON_BASE_Y = 0.022

const IRON_GEO = {
  // Chamfered industrial smelting hall nave
  smelterHall: (() => {
    const g = new ExtrudeGeometry(makeChamferedArchShape(0.28, 0.42, 0.075), {
      depth: 0.48,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 1,
    })
    g.rotateY(Math.PI / 2)
    g.translate(-0.24, 0, 0)
    return g
  })(),
  // Tapered octagonal blast furnace shaft & top bell hopper
  blastFurnace: latheOctagon(
    [
      [0, 0],
      [0.3, 0.02],
      [0.3, 0.16],
      [0.255, 0.24],
      [0.255, 0.44],
      [0.215, 0.78],
      [0.16, 0.9],
      [0.195, 0.95],
      [0.195, 1.02],
      [0.105, 1.07],
      [0, 1.08],
    ],
    8,
  ),
  // Open foundry pouring ladle cup
  crucibleCup: latheOctagon(
    [
      [0, 0],
      [0.11, 0.015],
      [0.165, 0.06],
      [0.175, 0.22],
      [0.132, 0.22],
      [0.118, 0.1],
      [0, 0.1],
    ],
    8,
  ),
  // Trapezoidal cast-iron ingot prism
  ingotBar: (() => {
    const s = new Shape()
    s.moveTo(-0.052, 0)
    s.lineTo(0.052, 0)
    s.lineTo(0.036, 0.042)
    s.lineTo(-0.036, 0.042)
    s.closePath()
    const g = new ExtrudeGeometry(s, {
      depth: 0.15,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 1,
    })
    g.translate(0, 0, -0.075)
    return g
  })(),
  // Hot-blast gas downcomer pipe connecting furnace crown to twin preheater stacks
  hotBlastPipe: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(0.38, IRON_BASE_Y + 0.86, -0.22),
      new Vector3(0.24, IRON_BASE_Y + 0.98, -0.34),
      new Vector3(0.02, IRON_BASE_Y + 0.92, -0.45),
      new Vector3(-0.14, IRON_BASE_Y + 0.76, -0.48),
    ]),
    12,
    0.042,
    6,
    false,
  ),
}

// ============================================================================
// REPAIR WORKSHOP GEOMETRY (1x1 Repair Bay + Jib Hoist Crane + Welding Arm)
// ============================================================================

const WORK_BASE_Y = 0.14

function buildWorkGarageBody(): ExtrudeGeometry {
  const geo = new ExtrudeGeometry(makeChamferedArchShape(0.21, 0.29, 0.055), {
    depth: 0.39,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 1,
    curveSegments: 4,
  })
  geo.translate(0, 0, -0.195)
  geo.computeVertexNormals()
  return geo
}

function buildWorkRoofCap(): ExtrudeGeometry {
  const geo = new ExtrudeGeometry(makeChamferedArchShape(0.225, 0.065, 0.04), {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 1,
    curveSegments: 4,
  })
  geo.translate(0, 0, -0.21)
  geo.computeVertexNormals()
  return geo
}

function buildWorkDoorFrame(): ExtrudeGeometry {
  const geo = new ExtrudeGeometry(makeHollowRectFrameShape(0.26, 0.21, 0.028), {
    depth: 0.032,
    bevelEnabled: false,
  })
  geo.translate(0, 0, -0.016)
  geo.computeVertexNormals()
  return geo
}

const WORK_CRANE_STRUT = makeStrutTransform([0.22, 0.34, -0.18], [0.22, 0.56, 0.09])
const WORK_ARM_LOWER = makeStrutTransform([-0.2, 0.075, 0.27], [-0.11, 0.25, 0.23])
const WORK_ARM_UPPER = makeStrutTransform([-0.11, 0.25, 0.23], [0.06, 0.165, 0.22])

const WORK_GEO = {
  garageBody: buildWorkGarageBody(),
  roofCap: buildWorkRoofCap(),
  doorFrame: buildWorkDoorFrame(),
  cranePedestal: latheOctagon([
    [0.082, 0],
    [0.075, 0.035],
    [0.055, 0.065],
    [0, 0.065],
  ]),
  armTurret: latheOctagon([
    [0.068, 0],
    [0.062, 0.04],
    [0.048, 0.068],
    [0, 0.068],
  ]),
}

// ============================================================================
// STEEL FACTORY GEOMETRY (2x2 Alloy Rolling Mill + Carbon Gas Tanks + I-Beams)
// ============================================================================

const STEEL_BASE_Y = 0.14

function buildSteelMillHall(): ExtrudeGeometry {
  const geo = new ExtrudeGeometry(makeChamferedArchShape(0.54, 0.48, 0.13), {
    depth: 0.64,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
    curveSegments: 4,
  })
  geo.translate(0, 0, -0.32)
  geo.computeVertexNormals()
  return geo
}

function buildSteelClerestory(): ExtrudeGeometry {
  const geo = new ExtrudeGeometry(makeChamferedArchShape(0.36, 0.12, 0.05), {
    depth: 0.44,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
    curveSegments: 4,
  })
  geo.translate(0, 0, -0.22)
  geo.computeVertexNormals()
  return geo
}

const STEEL_GEO = {
  millHall: buildSteelMillHall(),
  clerestory: buildSteelClerestory(),
  gasTank: latheOctagon([
    [0, -0.31],
    [0.078, -0.285],
    [0.115, -0.22],
    [0.115, 0.22],
    [0.078, 0.285],
    [0, 0.31],
  ]),
  converterVessel: latheOctagon([
    [0.165, 0],
    [0.175, 0.08],
    [0.155, 0.38],
    [0.108, 0.5],
    [0.108, 0.66],
    [0, 0.66],
  ]),
  steelCoil: latheOctagon([
    [0.038, 0],
    [0.088, 0],
    [0.088, 0.13],
    [0.038, 0.13],
    [0.038, 0],
  ]),
  // Manifold pipe from front-inner gas tank into mill hall
  tankPipeA: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(-0.3, 0.25, 0.28),
      new Vector3(-0.3, 0.38, 0.21),
      new Vector3(-0.24, 0.39, 0.08),
      new Vector3(-0.18, 0.33, -0.06),
    ]),
    12,
    0.025,
    6,
    false,
  ),
  // High-arch manifold pipe from front-outer orange tank cleanly clearing tank A
  tankPipeB: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(-0.44, 0.25, 0.56),
      new Vector3(-0.44, 0.48, 0.43),
      new Vector3(-0.38, 0.49, 0.15),
      new Vector3(-0.28, 0.36, -0.06),
    ]),
    14,
    0.025,
    6,
    false,
  ),
  // Off-gas duct bridging converter tower across clear air gap into mill hall roof
  converterDuct: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(-0.63, 0.56, -0.36),
      new Vector3(-0.54, 0.65, -0.36),
      new Vector3(-0.42, 0.6, -0.36),
      new Vector3(-0.34, 0.47, -0.36),
    ]),
    12,
    0.042,
    6,
    false,
  ),
}

// ============================================================================
// NUCLEAR REACTOR GEOMETRY (2x2 NASA Fission Surface Power Core + 4 Radiator Wings)
// ============================================================================

const REACTOR_BASE_Y = 0.14

function buildTrefoilBlade(): ExtrudeGeometry {
  // Single trapezoidal nuclear trefoil sector spanning 52 degrees
  const shape = new Shape()
  const r0 = 0.022
  const r1 = 0.068
  const a = (26 * Math.PI) / 180
  shape.moveTo(Math.cos(-a) * r0, Math.sin(-a) * r0)
  shape.lineTo(Math.cos(-a) * r1, Math.sin(-a) * r1)
  shape.lineTo(r1, 0)
  shape.lineTo(Math.cos(a) * r1, Math.sin(a) * r1)
  shape.lineTo(Math.cos(a) * r0, Math.sin(a) * r0)
  shape.closePath()
  const geo = new ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: false })
  geo.computeVertexNormals()
  return geo
}

const REACTOR_GEO = {
  // Hyperbolic concave cooling tower with recessed throat (latheOctagon-style 10 sides for crisp smooth flare)
  coolingTower: latheOctagon(
    [
      [0.34, 0],
      [0.3, 0.18],
      [0.24, 0.42],
      [0.21, 0.66],
      [0.225, 0.82],
      [0.255, 0.94],
      [0.205, 0.94],
      [0.18, 0.74],
      [0, 0.74],
    ],
    10,
  ),
  // Hemispherical reinforced concrete containment dome
  containmentDome: latheOctagon(
    [
      [0.31, 0],
      [0.31, 0.34],
      [0.295, 0.42],
      [0.25, 0.5],
      [0.16, 0.565],
      [0, 0.59],
    ],
    10,
  ),
  // Shielded spent-fuel cask canister
  fuelCask: latheOctagon([
    [0.095, 0],
    [0.095, 0.22],
    [0.075, 0.255],
    [0, 0.255],
  ]),
  trefoilBlade: buildTrefoilBlade(),
  // Primary pressurized coolant pipe (upper & lower) bridging containment dome -> hyperbolic tower
  coolantPipeUpper: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(0.14, 0.36, 0.1),
      new Vector3(0.02, 0.41, 0.0),
      new Vector3(-0.1, 0.38, -0.1),
      new Vector3(-0.18, 0.31, -0.17),
    ]),
    10,
    0.042,
    6,
    false,
  ),
  coolantPipeLower: new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(0.16, 0.16, 0.11),
      new Vector3(0.03, 0.19, 0.01),
      new Vector3(-0.14, 0.16, -0.13),
    ]),
    8,
    0.038,
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
  dustDevils: 0,
  cold: 0,
}

const PREVIEW_VALID_MATERIAL = new MeshStandardMaterial({
  color: '#5bd6a0',
  emissive: '#5bd6a0',
  emissiveIntensity: 0.35,
  transparent: true,
  opacity: 0.48,
  depthWrite: false,
  flatShading: true,
})

const PREVIEW_INVALID_MATERIAL = new MeshStandardMaterial({
  color: '#ff6b6b',
  emissive: '#ff6b6b',
  emissiveIntensity: 0.35,
  transparent: true,
  opacity: 0.48,
  depthWrite: false,
  flatShading: true,
})

const NOOP_RAYCAST = () => {}

export interface StructureModelProps {
  structure: StructureInstance
  size: number
  position: [number, number, number]
  selected: boolean
  onSelect: (id: string) => void
  visual?: VisualState
  preview?: 'valid' | 'invalid'
}

export function StructureModel({
  structure,
  size,
  position,
  selected,
  onSelect,
  visual = DEFAULT_VISUAL,
  preview,
}: StructureModelProps) {
  const liftRef = useRef<Group>(null)
  const stateVisual = structureVisualState(structure, visual)
  const statusColor = stateVisual.color
  const hullColor = structure.status === 'active' ? HULL_WHITE : statusColor
  const secondaryColor = structure.status === 'active' ? HULL_GRAY : statusColor
  const emissive = selected && !preview ? SELECTED_EMISSIVE : '#000000'
  const emissiveIntensity = selected && !preview ? 0.14 : 0
  const isTiltedDamaged = !preview && stateVisual.nonColorCue === 'damage'
  const nightGlow = !preview && visual.dark && structure.status === 'active'

  useLayoutEffect(() => {
    if (!preview || !liftRef.current) return
    const mat = preview === 'valid' ? PREVIEW_VALID_MATERIAL : PREVIEW_INVALID_MATERIAL
    liftRef.current.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        const mesh = obj as Mesh
        mesh.material = mat
        mesh.raycast = NOOP_RAYCAST
      }
    })
  }, [preview, structure.type])

  useFrame(({ clock }, delta) => {
    if (!liftRef.current) return
    if (preview) {
      liftRef.current.position.y = 0.14 + Math.sin(clock.elapsedTime * 3.5) * 0.03
      return
    }
    const targetY = selected ? 0.14 : 0
    liftRef.current.position.y += (targetY - liftRef.current.position.y) * Math.min(1, delta * 14)
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (preview) return
    e.stopPropagation()
    onSelect(structure.id)
  }

  return (
    <group position={position} onClick={handleClick}>
      {/* Ground-anchored selection glow pad beneath the lifted structure */}
      {selected && !preview && (
        <mesh position={[0, 0.015, 0]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[size * 0.94, 0.012, size * 0.94]} />
          <meshStandardMaterial
            color={SELECTED_EMISSIVE}
            emissive={SELECTED_EMISSIVE}
            emissiveIntensity={0.65}
            transparent
            opacity={0.75}
            flatShading
          />
        </mesh>
      )}

      <group ref={liftRef}>
        {/* Elevated stilt foundation pad (Lote 3 visual reference) */}
        <FoundationPad size={size} statusColor={statusColor} nightGlow={nightGlow} />

        {/* Subtle warm local pool light on larger active structures during winter darkness */}
        {nightGlow && size >= 2 && (
          <pointLight
            position={[0, 0.78, 0]}
            color="#ffbe66"
            intensity={1.7}
            distance={4.2}
            decay={2}
          />
        )}

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
        {!preview && (
          <NonColorCueOverlay
            cue={stateVisual.nonColorCue}
            frosted={stateVisual.frosted}
            size={size}
            type={structure.type}
          />
        )}
      </group>
    </group>
  )
}

function FoundationPad({
  size,
  statusColor,
  nightGlow,
}: {
  size: number
  statusColor: string
  nightGlow: boolean
}) {
  const span = size * 0.88
  const legOffset = span * 0.4
  const bollardOffset = span * 0.44
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
      {/* Diagonal corner deck perimeter light bollards (illuminate during winter darkness) */}
      {(
        [
          [-bollardOffset, bollardOffset],
          [bollardOffset, -bollardOffset],
        ] as const
      ).map(([bx, bz], idx) => (
        <group key={`bollard-${idx}`} position={[bx, 0.14, bz]}>
          <mesh position={[0, 0.03, 0]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[0.022, 0.028, 0.06, 6]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          <mesh position={[0, 0.07, 0]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[0.024, 0.022, 0.026, 6]} />
            <meshStandardMaterial
              color={nightGlow ? WARM_WINDOW_LIGHT : '#566475'}
              emissive={nightGlow ? WARM_WINDOW_LIGHT : '#000000'}
              emissiveIntensity={nightGlow ? 2.1 : 0}
              flatShading
            />
          </mesh>
        </group>
      ))}
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
        <BatteryMesh
          hullColor={hullColor}
          secondaryColor={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          nightGlow={nightGlow}
        />
      )

    case 'mine':
      return (
        <MineMesh
          hullColor={hullColor}
          secondaryColor={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          nightGlow={nightGlow}
        />
      )

    case 'oxygen_generator':
      return (
        <OxygenGeneratorMesh
          hullColor={hullColor}
          secondaryColor={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          nightGlow={nightGlow}
        />
      )

    case 'ice_melter':
      return (
        <IceMelterMesh
          hullColor={hullColor}
          secondaryColor={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          nightGlow={nightGlow}
        />
      )

    case 'iron_refinery':
      return (
        <IronRefineryMesh
          hullColor={hullColor}
          secondaryColor={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          nightGlow={nightGlow}
        />
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
        <RepairWorkshopMesh
          hullColor={hullColor}
          secondaryColor={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          nightGlow={nightGlow}
        />
      )

    case 'steel_factory':
      return (
        <SteelFactoryMesh
          hullColor={hullColor}
          secondaryColor={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          nightGlow={nightGlow}
        />
      )

    case 'nuclear_reactor':
      return (
        <NuclearReactorMesh
          hullColor={hullColor}
          secondaryColor={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          nightGlow={nightGlow}
        />
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

const STRUCTURE_CUE_HEIGHT: Record<string, number> = {
  solar_panel: 0.82,
  battery: 0.84,
  repair_workshop: 0.9,
  ice_melter: 0.92,
  oxygen_generator: 0.96,
  steel_factory: 0.98,
  greenhouse: 1.06,
  habitat: 1.14,
  nuclear_reactor: 1.16,
  iron_refinery: 1.36,
  mine: 1.44,
}

function getStructureCueHeight(type: string, size: number) {
  return STRUCTURE_CUE_HEIGHT[type] ?? (size >= 2 ? 1.16 : 0.88)
}

interface DustCapPlacement {
  pos: readonly [number, number, number]
  rot?: readonly [number, number, number]
  scale: readonly [number, number, number]
}

const DUST_CAPS_BY_TYPE: Record<string, ReadonlyArray<DustCapPlacement>> = {
  solar_panel: [
    { pos: [-0.14, 0.56, -0.02], rot: [0.48, 0.2, 0], scale: [0.22, 0.06, 0.16] },
    { pos: [0.16, 0.52, 0.09], rot: [0.48, -0.3, 0], scale: [0.18, 0.05, 0.15] },
  ],
  battery: [
    { pos: [-0.12, 0.68, 0.04], rot: [0, 0.4, 0], scale: [0.18, 0.07, 0.14] },
    { pos: [0.15, 0.2, 0.24], rot: [0, -0.5, 0], scale: [0.16, 0.08, 0.12] },
  ],
  oxygen_generator: [
    { pos: [-0.15, 0.85, -0.04], rot: [0, 0.3, 0], scale: [0.15, 0.05, 0.15] },
    { pos: [-0.14, 0.22, 0.25], rot: [0, -0.4, 0], scale: [0.18, 0.08, 0.12] },
  ],
  ice_melter: [
    { pos: [0.23, 0.43, 0.24], rot: [0, 0.5, 0], scale: [0.14, 0.06, 0.14] },
    { pos: [-0.24, 0.22, 0.14], rot: [0, -0.3, 0], scale: [0.17, 0.08, 0.14] },
  ],
  repair_workshop: [
    { pos: [0.2, 0.27, 0.22], rot: [0, 0.2, 0], scale: [0.16, 0.06, 0.14] },
    { pos: [-0.1, 0.2, -0.24], rot: [0, -0.5, 0], scale: [0.18, 0.08, 0.12] },
  ],
  habitat: [
    { pos: [0.72, 0.2, 0.18], rot: [0, 0.4, 0], scale: [0.22, 0.09, 0.16] },
    { pos: [-0.46, 0.22, -0.46], rot: [0, -0.7, 0], scale: [0.24, 0.1, 0.2] },
    { pos: [0.24, 0.72, -0.22], rot: [0.25, 0.4, -0.25], scale: [0.19, 0.07, 0.17] },
  ],
  greenhouse: [
    { pos: [-0.64, 0.42, -0.18], rot: [0, 0.2, 0.3], scale: [0.14, 0.1, 0.18] },
    { pos: [0.74, 0.2, 0.18], rot: [0, 0.5, 0], scale: [0.22, 0.09, 0.16] },
    { pos: [0.05, 0.24, 0.56], rot: [0, 0.1, 0], scale: [0.34, 0.08, 0.14] },
  ],
  mine: [
    { pos: [-0.32, 0.33, 0.32], rot: [0, 0.3, 0], scale: [0.22, 0.09, 0.2] },
    { pos: [0.46, 0.2, 0.46], rot: [0, -0.4, 0], scale: [0.24, 0.09, 0.2] },
  ],
  iron_refinery: [
    { pos: [-0.24, 0.24, 0.52], rot: [0, 0.2, 0], scale: [0.28, 0.09, 0.18] },
    { pos: [0.42, 0.2, 0.48], rot: [0, -0.5, 0], scale: [0.24, 0.09, 0.2] },
  ],
  steel_factory: [
    { pos: [0.22, 0.25, 0.56], rot: [0, 0.15, 0], scale: [0.24, 0.08, 0.2] },
    { pos: [-0.38, 0.2, 0.56], rot: [0, -0.4, 0], scale: [0.26, 0.09, 0.18] },
  ],
  nuclear_reactor: [
    { pos: [0.32, 0.22, 0.42], rot: [0, 0.3, 0], scale: [0.26, 0.09, 0.2] },
    { pos: [-0.34, 0.22, -0.34], rot: [0, -0.6, 0], scale: [0.28, 0.09, 0.22] },
  ],
}

const CUE_GEO = {
  sparkBolt: (() => {
    const s = new Shape()
    s.moveTo(0.03, 0.24)
    s.lineTo(-0.1, 0.035)
    s.lineTo(-0.01, 0.035)
    s.lineTo(-0.075, -0.2)
    s.lineTo(0.11, 0.025)
    s.lineTo(0.015, 0.025)
    s.closePath()
    const g = new ExtrudeGeometry(s, {
      depth: 0.044,
      bevelEnabled: false,
    })
    g.translate(0, 0, -0.022)
    return g
  })(),
  hazardPrism: (() => {
    const s = new Shape()
    s.moveTo(0, 0.18)
    s.lineTo(-0.15, -0.1)
    s.lineTo(0.15, -0.1)
    s.closePath()
    const g = new ExtrudeGeometry(s, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 1,
    })
    g.translate(0, 0, -0.03)
    return g
  })(),
}

function NonColorCueOverlay({
  cue,
  frosted,
  size,
  type,
}: {
  cue: NonColorCue
  frosted: boolean
  size: number
  type: string
}) {
  const topY = getStructureCueHeight(type, size)
  return (
    <group>
      {cue === 'construction' && <ConstructionCue size={size} topY={topY} />}
      {cue === 'damage' && <DamageCue size={size} topY={topY} />}
      {cue === 'dust' && <DustCue size={size} type={type} />}
      {cue === 'sparks' && <SparksCue size={size} topY={topY} />}
      {(cue === 'frost' || frosted) && <FrostCue />}
    </group>
  )
}

function ConstructionCue({ size, topY }: { size: number; topY: number }) {
  const beaconMatRef = useRef<MeshStandardMaterial>(null)
  const trolleyRef = useRef<Group>(null)
  const hookRef = useRef<Group>(null)
  const weldRef = useRef<Mesh>(null)
  const weldMatRef = useRef<MeshStandardMaterial>(null)
  const baseY = 0.14
  const half = size * 0.435
  const height = topY - baseY
  const midY = baseY + height * 0.5
  const postR = size >= 2 ? 0.028 : 0.021
  const beamThick = size >= 2 ? 0.038 : 0.028
  const cableLen = Math.max(0.16, height * 0.34)
  const trolleyTravel = half * 0.68

  const { diagBraces, span } = useMemo(() => {
    const corners: ReadonlyArray<readonly [number, number]> = [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half],
    ]
    const braces = corners.map(([ax, az], idx) => {
      const [bx, bz] = corners[(idx + 1) % 4]!
      return idx % 2 === 0
        ? makeStrutTransform([ax, baseY + 0.04, az], [bx, topY - 0.03, bz])
        : makeStrutTransform([bx, baseY + 0.04, bz], [ax, topY - 0.03, az])
    })
    return { diagBraces: braces, span: half * 2 + beamThick }
  }, [half, baseY, topY, beamThick])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (beaconMatRef.current) {
      beaconMatRef.current.emissiveIntensity = 0.4 + 0.85 * (0.5 + 0.5 * Math.sin(t * 5.2))
    }
    if (trolleyRef.current) {
      trolleyRef.current.position.x = Math.sin(t * 1.15) * trolleyTravel
    }
    if (hookRef.current) {
      const lift = 0.55 + 0.38 * Math.sin(t * 2.15 + 0.6)
      hookRef.current.scale.y = lift
      hookRef.current.position.y = -cableLen * lift * 0.5
    }
    if (weldRef.current && weldMatRef.current) {
      const burst = Math.sin(t * 19.0) * Math.sin(t * 7.3)
      const active = burst > 0.25 ? (burst - 0.25) / 0.75 : 0
      const s = 0.35 + active * 1.25
      weldRef.current.scale.set(s, s, s)
      weldRef.current.rotation.y = t * 6.0
      weldMatRef.current.emissiveIntensity = 0.15 + active * 2.4
    }
  })

  return (
    <group>
      {/* Corner footplates and vertical gantry posts */}
      {(
        [
          [-half, -half],
          [half, -half],
          [-half, half],
          [half, half],
        ] as const
      ).map(([px, pz], idx) => (
        <group key={`post-${idx}`} position={[px, 0, pz]}>
          <mesh position={[0, baseY + 0.015, 0]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[beamThick * 2.1, 0.03, beamThick * 2.1]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          <mesh position={[0, midY, 0]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[postR, postR * 1.12, height, 6]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
        </group>
      ))}

      {/* Solid low-poly top perimeter gantry frame */}
      {([-half, half] as const).map((pz, idx) => (
        <mesh key={`top-x-${idx}`} position={[0, topY, pz]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[span, beamThick, beamThick]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
      ))}
      {([-half, half] as const).map((px, idx) => (
        <mesh key={`top-z-${idx}`} position={[px, topY, 0]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[beamThick, beamThick, span]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
      ))}

      {/* Mid-height horizontal tie rails on rear faces for clear scaffolding depth */}
      <mesh position={[0, midY, -half]} raycast={NOOP_RAYCAST}>
        <boxGeometry args={[span * 0.96, beamThick * 0.65, beamThick * 0.65]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh position={[-half, midY, 0]} raycast={NOOP_RAYCAST}>
        <boxGeometry args={[beamThick * 0.65, beamThick * 0.65, span * 0.96]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Diagonal truss cross-braces on all 4 gantry faces */}
      {diagBraces.map((brace, idx) => (
        <mesh
          key={`brace-${idx}`}
          position={brace.position}
          quaternion={brace.quaternion}
          raycast={NOOP_RAYCAST}
        >
          <cylinderGeometry args={[postR * 0.5, postR * 0.5, brace.length, 4]} />
          <meshStandardMaterial color={idx < 2 ? SAFETY_ORANGE : METAL_DARK} flatShading />
        </mesh>
      ))}

      {/* Overhead hoist bridge beam, sliding trolley crane & pulsing top beacon */}
      <mesh position={[0, topY + beamThick * 0.9, 0]} raycast={NOOP_RAYCAST}>
        <boxGeometry args={[span, beamThick * 1.15, beamThick * 1.5]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <group ref={trolleyRef} position={[0, topY + beamThick * 0.4, 0]}>
        {/* Sliding hoist carriage */}
        <mesh raycast={NOOP_RAYCAST}>
          <boxGeometry args={[beamThick * 2.8, beamThick * 1.3, beamThick * 2.2]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        {/* Extending hoist cable + suspended hull crate */}
        <group ref={hookRef} position={[0, -cableLen * 0.5, 0]}>
          <mesh raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[0.008, 0.008, cableLen, 4]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          <mesh position={[0, -cableLen * 0.54, 0]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[beamThick * 2.1, beamThick * 1.4, beamThick * 1.6]} />
            <meshStandardMaterial color={HULL_GRAY} flatShading />
          </mesh>
        </group>
      </group>

      {/* Intermittent welding flash on the front-right scaffolding post */}
      <mesh ref={weldRef} position={[half * 0.96, midY * 0.88, half * 0.96]} raycast={NOOP_RAYCAST}>
        <octahedronGeometry args={[size >= 2 ? 0.065 : 0.048, 0]} />
        <meshStandardMaterial
          ref={weldMatRef}
          color="#fff1b8"
          emissive="#7ce8ff"
          emissiveIntensity={1.2}
          flatShading
        />
      </mesh>

      <mesh position={[0, topY + beamThick * 2.1, 0]} raycast={NOOP_RAYCAST}>
        <cylinderGeometry args={[beamThick * 1.35, beamThick * 1.75, beamThick * 1.6, 6]} />
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>
      <mesh position={[0, topY + beamThick * 3.5, 0]} raycast={NOOP_RAYCAST}>
        <octahedronGeometry args={[size >= 2 ? 0.085 : 0.065, 0]} />
        <meshStandardMaterial
          ref={beaconMatRef}
          color="#ffb84d"
          emissive="#ffb84d"
          emissiveIntensity={0.85}
          flatShading
        />
      </mesh>
    </group>
  )
}

const SMOKE_PHASES = [0, 0.33, 0.66] as const

function DamageCue({ size, topY }: { size: number; topY: number }) {
  const puff0Ref = useRef<Mesh>(null)
  const puff1Ref = useRef<Mesh>(null)
  const puff2Ref = useRef<Mesh>(null)
  const mat0Ref = useRef<MeshStandardMaterial>(null)
  const mat1Ref = useRef<MeshStandardMaterial>(null)
  const mat2Ref = useRef<MeshStandardMaterial>(null)
  const beaconGroupRef = useRef<Group>(null)
  const beaconMatRef = useRef<MeshStandardMaterial>(null)

  const scaleUnit = size >= 2 ? 1.18 : 0.9
  const smokeBaseY = topY * 0.62
  const riseSpan = 0.72 * scaleUnit
  const edge = size * 0.36

  useFrame(({ clock }) => {
    const tNow = clock.elapsedTime
    const puffs = [puff0Ref.current, puff1Ref.current, puff2Ref.current]
    const mats = [mat0Ref.current, mat1Ref.current, mat2Ref.current]

    for (let i = 0; i < 3; i++) {
      const puff = puffs[i]
      const mat = mats[i]
      if (!puff || !mat) continue
      const phase = (tNow * 0.42 + SMOKE_PHASES[i]!) % 1
      const y = smokeBaseY + phase * riseSpan
      const driftX = -0.06 + phase * 0.24 + Math.sin(tNow * 1.8 + i * 2.1) * 0.04
      const driftZ = 0.04 - phase * 0.14 + Math.cos(tNow * 1.5 + i * 1.7) * 0.03
      const radiusScale = (0.11 + Math.sin(phase * Math.PI) * 0.16) * scaleUnit
      puff.position.set(driftX, y, driftZ)
      puff.scale.set(radiusScale, radiusScale * 0.85, radiusScale)
      puff.rotation.set(tNow * 0.4 + i, tNow * 0.6 + i, 0)
      mat.opacity = Math.max(0.05, 0.88 * (1 - phase))
    }

    if (beaconGroupRef.current && beaconMatRef.current) {
      beaconGroupRef.current.position.y = topY + 0.28 + Math.sin(tNow * 3.5) * 0.035
      beaconGroupRef.current.rotation.y = Math.PI / 4 + Math.sin(tNow * 1.4) * 0.28
      beaconMatRef.current.emissiveIntensity = 0.4 + 0.7 * (0.5 + 0.5 * Math.sin(tNow * 6.5))
    }
  })

  return (
    <group>
      {/* Scorched & buckled debris plates settled on FoundationPad perimeter */}
      <mesh position={[-edge, 0.158, edge]} rotation={[0.28, 0.5, -0.35]} raycast={NOOP_RAYCAST}>
        <boxGeometry args={[0.16 * scaleUnit, 0.022, 0.11 * scaleUnit]} />
        <meshStandardMaterial color={SMOKE_CHAR} flatShading />
      </mesh>
      <mesh
        position={[edge, 0.16, edge * 0.72]}
        rotation={[-0.22, -0.7, 0.4]}
        raycast={NOOP_RAYCAST}
      >
        <boxGeometry args={[0.13 * scaleUnit, 0.02, 0.1 * scaleUnit]} />
        <meshStandardMaterial color="#8a411f" flatShading />
      </mesh>
      <mesh
        position={[edge * 0.8, 0.156, -edge]}
        rotation={[0.32, 0.3, 0.28]}
        raycast={NOOP_RAYCAST}
      >
        <boxGeometry args={[0.12 * scaleUnit, 0.02, 0.09 * scaleUnit]} />
        <meshStandardMaterial color={SMOKE_CHAR} flatShading />
      </mesh>

      {/* Three rising & drifting dark low-poly smoke plumes */}
      <mesh ref={puff0Ref} position={[0, smokeBaseY, 0]} raycast={NOOP_RAYCAST}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          ref={mat0Ref}
          color={SMOKE_DARK}
          transparent
          opacity={0.8}
          depthWrite={false}
          flatShading
        />
      </mesh>
      <mesh ref={puff1Ref} position={[0, smokeBaseY + 0.25, 0]} raycast={NOOP_RAYCAST}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          ref={mat1Ref}
          color={SMOKE_CHAR}
          transparent
          opacity={0.65}
          depthWrite={false}
          flatShading
        />
      </mesh>
      <mesh ref={puff2Ref} position={[0, smokeBaseY + 0.45, 0]} raycast={NOOP_RAYCAST}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          ref={mat2Ref}
          color={SMOKE_DARK}
          transparent
          opacity={0.45}
          depthWrite={false}
          flatShading
        />
      </mesh>

      {/* Pulsing hazard warning beacon (!) clearly above the structure, double-sided */}
      <group ref={beaconGroupRef} position={[0, topY + 0.28, 0]} rotation={[0, Math.PI / 4, 0]}>
        <mesh geometry={CUE_GEO.hazardPrism} position={[0, 0.05, 0]} raycast={NOOP_RAYCAST}>
          <meshStandardMaterial
            ref={beaconMatRef}
            color={SAFETY_ORANGE}
            emissive={SAFETY_ORANGE}
            emissiveIntensity={0.85}
            flatShading
          />
        </mesh>
        {([-0.038, 0.038] as const).map((zOff, idx) => (
          <group key={idx} position={[0, 0, zOff]}>
            <mesh position={[0, 0.09, 0]} raycast={NOOP_RAYCAST}>
              <boxGeometry args={[0.04, 0.1, 0.016]} />
              <meshStandardMaterial color={METAL_DARK} flatShading />
            </mesh>
            <mesh position={[0, 0.002, 0]} raycast={NOOP_RAYCAST}>
              <boxGeometry args={[0.04, 0.036, 0.016]} />
              <meshStandardMaterial color={METAL_DARK} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function DustCue({ size, type }: { size: number; type: string }) {
  const edge = size * 0.44
  const moundScale = size >= 2 ? 1.25 : 0.78
  const caps = DUST_CAPS_BY_TYPE[type] ?? []

  return (
    <group>
      {/* Banked Martian sand drifts hugging FoundationPad perimeter & stilts */}
      {(
        [
          { pos: [-edge * 0.92, 0.09, edge * 0.55], rot: [0, 0.4, 0], s: [0.3, 0.12, 0.22] },
          { pos: [edge * 0.88, 0.09, edge * 0.62], rot: [0, -0.5, 0], s: [0.28, 0.11, 0.24] },
          { pos: [0, 0.095, edge * 0.96], rot: [0, 0.15, 0], s: [0.36, 0.12, 0.2] },
          { pos: [-edge * 0.96, 0.09, -edge * 0.35], rot: [0, 0.8, 0], s: [0.24, 0.11, 0.28] },
          { pos: [edge * 0.95, 0.085, -edge * 0.42], rot: [0, -0.7, 0], s: [0.25, 0.1, 0.28] },
          { pos: [-edge * 0.28, 0.09, -edge * 0.95], rot: [0, 0.2, 0], s: [0.34, 0.11, 0.2] },
        ] as const
      ).map((d, idx) => (
        <mesh
          key={`drift-${idx}`}
          position={d.pos}
          rotation={d.rot}
          scale={[d.s[0] * moundScale, d.s[1] * moundScale, d.s[2] * moundScale]}
          raycast={NOOP_RAYCAST}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={idx % 2 === 0 ? DUST_DRIFT : DUST_DRIFT_DARK} flatShading />
        </mesh>
      ))}

      {/* Smaller sand wedges climbing over pad corners */}
      {(
        [
          [-edge * 0.78, 0.155, edge * 0.78, 0.4],
          [edge * 0.78, 0.155, edge * 0.76, -0.6],
          [-edge * 0.76, 0.155, -edge * 0.76, 0.9],
        ] as const
      ).map(([cx, cy, cz, ry], idx) => (
        <mesh
          key={`corner-dune-${idx}`}
          position={[cx, cy, cz]}
          rotation={[0, ry, 0]}
          scale={[0.18 * moundScale, 0.065 * moundScale, 0.16 * moundScale]}
          raycast={NOOP_RAYCAST}
        >
          <coneGeometry args={[1, 1.4, 5]} />
          <meshStandardMaterial color={DUST_DRIFT} flatShading />
        </mesh>
      ))}

      {/* Settled dust caps on actual structure intakes, louvers & panels */}
      {caps.map((cap, idx) => (
        <mesh
          key={`cap-${idx}`}
          position={cap.pos}
          rotation={cap.rot ?? [0, 0, 0]}
          scale={cap.scale}
          raycast={NOOP_RAYCAST}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={idx % 2 === 0 ? DUST_DRIFT : DUST_DRIFT_DARK} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function SparksCue({ size, topY }: { size: number; topY: number }) {
  const arc0Ref = useRef<Mesh>(null)
  const arc1Ref = useRef<Mesh>(null)
  const arc2Ref = useRef<Mesh>(null)
  const badgeRef = useRef<Group>(null)
  const arc0MatRef = useRef<MeshStandardMaterial>(null)
  const arc1MatRef = useRef<MeshStandardMaterial>(null)
  const arc2MatRef = useRef<MeshStandardMaterial>(null)
  const badgeMatRef = useRef<MeshStandardMaterial>(null)

  const radius = size * 0.36
  const arcScale = size >= 2 ? 1.25 : 0.94

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const arcs = [arc0Ref.current, arc1Ref.current, arc2Ref.current]
    const mats = [arc0MatRef.current, arc1MatRef.current, arc2MatRef.current]
    const anchors = [
      [-radius, topY * 0.58, radius * 0.65],
      [radius, topY * 0.68, -radius * 0.45],
      [radius * 0.35, topY * 0.86, radius * 0.72],
    ] as const
    const baseYaws = [0.78, -0.45, 0.92] as const
    const baseTilts = [0.48, -0.58, 0.92] as const

    for (let i = 0; i < 3; i++) {
      const mesh = arcs[i]
      const mat = mats[i]
      if (!mesh || !mat) continue
      const [ax, ay, az] = anchors[i]!
      // Discrete high-frequency electric crackle/jitter without allocating objects
      const step = Math.floor(t * (11 + i * 3))
      const jitterX = Math.sin(step * 12.9898 + i) * 0.045
      const jitterY = Math.cos(step * 78.233 + i) * 0.04
      const pulse = 0.78 + 0.45 * Math.sin(step * 4.7 + i * 2.1)
      mesh.position.set(ax + jitterX, ay + jitterY, az)
      mesh.rotation.set(
        0.2 * i,
        baseYaws[i]! + Math.sin(step * 3.1) * 0.25,
        baseTilts[i]! + Math.cos(step * 2.3) * 0.25,
      )
      mesh.scale.setScalar(arcScale * pulse)
      mat.emissiveIntensity = 0.75 + 0.85 * Math.max(0, Math.sin(t * (14 + i * 4) + i))
    }

    if (badgeRef.current && badgeMatRef.current) {
      badgeRef.current.position.y = topY + 0.26 + Math.sin(t * 5) * 0.025
      badgeRef.current.rotation.y = Math.PI / 4 + t * 1.4
      badgeMatRef.current.emissiveIntensity = 0.65 + 0.65 * Math.abs(Math.sin(t * 7))
    }
  })

  return (
    <group>
      {/* Three flickering jagged electric lightning arcs around structure */}
      <mesh ref={arc0Ref} geometry={CUE_GEO.sparkBolt} raycast={NOOP_RAYCAST}>
        <meshStandardMaterial
          ref={arc0MatRef}
          color={SPARK_YELLOW}
          emissive={SPARK_YELLOW}
          emissiveIntensity={1.1}
          flatShading
        />
      </mesh>
      <mesh ref={arc1Ref} geometry={CUE_GEO.sparkBolt} raycast={NOOP_RAYCAST}>
        <meshStandardMaterial
          ref={arc1MatRef}
          color={SPARK_CYAN}
          emissive={SPARK_CYAN}
          emissiveIntensity={1.0}
          flatShading
        />
      </mesh>
      <mesh ref={arc2Ref} geometry={CUE_GEO.sparkBolt} raycast={NOOP_RAYCAST}>
        <meshStandardMaterial
          ref={arc2MatRef}
          color={SPARK_YELLOW}
          emissive={SPARK_YELLOW}
          emissiveIntensity={1.1}
          flatShading
        />
      </mesh>

      {/* Distinct 3D crossed-fault + spark core indicator above structure */}
      <group ref={badgeRef} position={[0, topY + 0.26, 0]}>
        <mesh rotation={[0, 0, Math.PI / 4]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[0.33 * arcScale, 0.062 * arcScale, 0.062 * arcScale]} />
          <meshStandardMaterial
            ref={badgeMatRef}
            color="#ff5a5a"
            emissive="#ff5a5a"
            emissiveIntensity={0.95}
            flatShading
          />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[0.33 * arcScale, 0.062 * arcScale, 0.062 * arcScale]} />
          <meshStandardMaterial
            color="#ff5a5a"
            emissive="#ff5a5a"
            emissiveIntensity={0.95}
            flatShading
          />
        </mesh>
        {([-0.04, 0.04] as const).map((zOff, idx) => (
          <mesh
            key={idx}
            position={[0, 0, zOff]}
            scale={0.82 * arcScale}
            geometry={CUE_GEO.sparkBolt}
            raycast={NOOP_RAYCAST}
          >
            <meshStandardMaterial
              color={SPARK_YELLOW}
              emissive={SPARK_YELLOW}
              emissiveIntensity={1.1}
              flatShading
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// Faceted ice shelves encrusting the dark FoundationPad corners for high daytime contrast
const PAD_FROST_DRIFTS: ReadonlyArray<{
  pos: readonly [number, number, number]
  rotY: number
  scale: readonly [number, number, number]
}> = [
  { pos: [0.64, 0.045, 0.64], rotY: 0.45, scale: [0.32, 0.14, 0.28] },
  { pos: [-0.66, 0.04, 0.62], rotY: 1.9, scale: [0.3, 0.13, 0.26] },
  { pos: [0.64, 0.04, -0.64], rotY: 3.6, scale: [0.3, 0.13, 0.25] },
  { pos: [-0.62, 0.04, -0.66], rotY: 5.1, scale: [0.28, 0.12, 0.24] },
  { pos: [0.16, 0.035, 0.68], rotY: 0.2, scale: [0.34, 0.11, 0.18] },
  { pos: [0.68, 0.035, 0.22], rotY: 1.3, scale: [0.18, 0.11, 0.3] },
]

// Chunky pentagonal crystal clusters around dome shoulders, skirt, airlock & cupola
const FROST_CLUSTERS: ReadonlyArray<{
  pos: readonly [number, number, number]
  rot: readonly [number, number, number]
  r: number
  h: number
}> = [
  // Dome shoulders (clear of airlock +X, armor plates pi/4 & -3pi/4, viewports, and comms mast)
  { pos: [0.38, 0.52, -0.36], rot: [0.38, 0.4, -0.38], r: 0.115, h: 0.34 },
  { pos: [0.48, 0.45, -0.24], rot: [0.44, 0.2, -0.48], r: 0.085, h: 0.25 },
  { pos: [-0.36, 0.56, -0.35], rot: [-0.36, -0.3, -0.34], r: 0.11, h: 0.33 },
  { pos: [0.35, 0.54, 0.36], rot: [0.38, 0.5, 0.36], r: 0.112, h: 0.32 },
  { pos: [-0.46, 0.44, 0.22], rot: [0.24, 0.2, 0.5], r: 0.1, h: 0.29 },
  // Lower base-skirt perimeter ice spires (visible contrast against pad + dark skirt)
  { pos: [0.46, 0.18, 0.48], rot: [0.3, 0.3, -0.25], r: 0.095, h: 0.28 },
  { pos: [-0.5, 0.18, 0.38], rot: [0.26, -0.2, 0.32], r: 0.09, h: 0.26 },
  { pos: [0.06, 0.18, 0.58], rot: [0.34, 0.1, 0.05], r: 0.092, h: 0.25 },
  // Airlock tunnel roof frost ridge (+X)
  { pos: [0.58, 0.35, 0.04], rot: [0.16, 0.3, -0.24], r: 0.095, h: 0.29 },
  { pos: [0.6, 0.33, -0.08], rot: [-0.18, 0, -0.3], r: 0.075, h: 0.22 },
  // Cupola rim spires (clear of central skylight so night glow shines through)
  { pos: [0.17, 0.81, -0.11], rot: [-0.15, 0.2, -0.22], r: 0.09, h: 0.28 },
  { pos: [-0.16, 0.8, -0.12], rot: [-0.18, -0.3, 0.2], r: 0.08, h: 0.24 },
]

function FrostCue() {
  return (
    <group>
      {/* Crusty glacial ice shelves around the dark FoundationPad deck */}
      {PAD_FROST_DRIFTS.map((drift, idx) => (
        <mesh
          key={`pad-frost-${idx}`}
          position={drift.pos}
          rotation={[0, drift.rotY, 0]}
          scale={drift.scale}
          raycast={NOOP_RAYCAST}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={idx % 2 === 0 ? FROST_ICE_DEEP : FROST_ICE}
            emissive="#4da6d9"
            emissiveIntensity={0.07}
            roughness={0.35}
            flatShading
          />
        </mesh>
      ))}

      <group position={[0, 0.12, 0]}>
        {/* Saturated glacial-blue frost cap hugging upper dome above perimeter glowBand */}
        <mesh geometry={HABITAT_GEO.frostShell} raycast={NOOP_RAYCAST}>
          <meshStandardMaterial
            color={FROST_ICE_DEEP}
            emissive="#4da6d9"
            emissiveIntensity={0.07}
            transparent
            opacity={0.56}
            depthWrite={false}
            roughness={0.35}
            flatShading
          />
        </mesh>
        {/* Faceted pentagonal ice crystal clusters seated cleanly on dome, skirt, airlock & cupola */}
        {FROST_CLUSTERS.map((c, idx) => (
          <mesh key={`frost-spire-${idx}`} position={c.pos} rotation={c.rot} raycast={NOOP_RAYCAST}>
            <coneGeometry args={[c.r, c.h, 5]} />
            <meshStandardMaterial
              color={idx % 2 === 0 ? FROST_ICE_DEEP : FROST_ICE}
              emissive="#4da6d9"
              emissiveIntensity={0.09}
              roughness={0.3}
              flatShading
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function MineMesh({
  hullColor,
  secondaryColor,
  emissive,
  emissiveIntensity,
  nightGlow,
}: {
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
  nightGlow: boolean
}) {
  // Faceted Martian rock outcrops framing the -X/-Z pit rim (inside ±0.84)
  const pitRocks = [
    {
      pos: [-0.64, MINE_BASE_Y + 0.11, -0.48] as const,
      r: 0.18,
      s: [1.05, 0.85, 1.1] as const,
      c: MARS_ROCK,
    },
    {
      pos: [-0.66, MINE_BASE_Y + 0.09, -0.16] as const,
      r: 0.16,
      s: [0.95, 0.72, 1.2] as const,
      c: '#7a3419',
    },
    {
      pos: [-0.14, MINE_BASE_Y + 0.08, -0.64] as const,
      r: 0.13,
      s: [1.15, 0.7, 0.95] as const,
      c: '#7a3419',
    },
    {
      pos: [-0.54, MINE_BASE_Y + 0.07, 0.04] as const,
      r: 0.13,
      s: [1.0, 0.65, 1.05] as const,
      c: MARS_ROCK,
    },
    {
      pos: [-0.58, MINE_BASE_Y + 0.08, -0.66] as const,
      r: 0.13,
      s: [1.0, 0.72, 0.95] as const,
      c: '#b5532f',
    },
  ] as const

  const hopperX = 0.5
  const hopperZ = 0.3
  const convStartX = -0.22
  const convStartY = MINE_BASE_Y + 0.155
  const convEndX = 0.34
  const convEndY = MINE_BASE_Y + 0.555
  const convDx = convEndX - convStartX
  const convDy = convEndY - convStartY
  const convLen = Math.hypot(convDx, convDy)
  const convPitch = Math.atan2(convDy, convDx)
  const conveyorSteps = [0.22, 0.48, 0.74] as const

  return (
    <group position={[0, 0.12, 0]}>
      {/* Excavated dark pit floor & continuous stepped collar (-X/-Z) */}
      <mesh position={[MINE_PIT_X, MINE_BASE_Y + 0.006, MINE_PIT_Z]}>
        <cylinderGeometry args={[0.185, 0.195, 0.012, 8]} />
        <meshStandardMaterial color="#1a110e" flatShading />
      </mesh>
      <mesh geometry={MINE_GEO.pitCollar} position={[MINE_PIT_X, MINE_BASE_Y, MINE_PIT_Z]}>
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Faceted Martian rock berm framing the excavation (Lote 3) */}
      {pitRocks.map((rk, idx) => (
        <mesh
          key={idx}
          position={rk.pos}
          scale={rk.s}
          rotation={[0.2 * idx, 0.8 * idx, 0.15 * idx]}
        >
          <dodecahedronGeometry args={[rk.r, 0]} />
          <meshStandardMaterial color={rk.c} flatShading />
        </mesh>
      ))}

      {/* Shaft winch floodlight station on the back pit collar (clear of bucket) */}
      <group position={[MINE_PIT_X - 0.04, MINE_BASE_Y, MINE_PIT_Z - 0.28]}>
        <mesh position={[0, 0.11, 0]}>
          <boxGeometry args={[0.2, 0.22, 0.12]} />
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <boxGeometry args={[0.22, 0.04, 0.14]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        <mesh position={[0, 0.16, 0.068]}>
          <boxGeometry args={[0.14, 0.05, 0.02]} />
          <meshStandardMaterial
            color={WARM_WINDOW_LIGHT}
            emissive={WARM_WINDOW_LIGHT}
            emissiveIntensity={nightGlow ? 0.95 : 0.45}
            flatShading
          />
        </mesh>
      </group>

      {/* Open 4-leg tapered steel headframe lattice tower */}
      {MINE_TRUSS_STRUTS.legs.map((s, idx) => (
        <mesh key={`leg-${idx}`} position={s.position} quaternion={s.quaternion}>
          <cylinderGeometry args={[0.02, 0.026, s.length, 6]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      ))}
      {MINE_TRUSS_STRUTS.midRings.map((s, idx) => (
        <mesh key={`ring-${idx}`} position={s.position} quaternion={s.quaternion}>
          <cylinderGeometry args={[0.014, 0.014, s.length, 4]} />
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
      ))}
      {MINE_TRUSS_STRUTS.diagBraces.map((s, idx) => (
        <mesh key={`d1-${idx}`} position={s.position} quaternion={s.quaternion}>
          <cylinderGeometry args={[0.01, 0.01, s.length, 4]} />
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
      ))}
      {MINE_TRUSS_STRUTS.upperBraces.map((s, idx) => (
        <mesh key={`d2-${idx}`} position={s.position} quaternion={s.quaternion}>
          <cylinderGeometry args={[0.01, 0.01, s.length, 4]} />
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
      ))}

      {/* Headframe crown deck, machinery cabin & elevated gantry pylon */}
      <mesh position={[MINE_TOWER_X, MINE_TOWER_TOP_Y + 0.02, MINE_TOWER_Z]}>
        <boxGeometry args={[0.29, 0.04, 0.29]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh position={[MINE_TOWER_X + 0.01, MINE_TOWER_TOP_Y + 0.11, MINE_TOWER_Z]}>
        <boxGeometry args={[0.23, 0.14, 0.22]} />
        <meshStandardMaterial
          color={hullColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          flatShading
        />
      </mesh>
      <mesh position={[MINE_TOWER_X + 0.01, MINE_TOWER_TOP_Y + 0.195, MINE_TOWER_Z]}>
        <boxGeometry args={[0.18, 0.032, 0.17]} />
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>
      {/* Raised A-frame tension pylon so stay cable clears the boom completely */}
      <mesh position={[MINE_TOWER_X + 0.08, MINE_TOWER_TOP_Y + 0.27, MINE_TOWER_Z + 0.02]}>
        <boxGeometry args={[0.045, 0.15, 0.1]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Crane boom, overhead tension stay, pulley sheave & suspended ore skip */}
      <mesh
        position={MINE_TRUSS_STRUTS.boomArm.position}
        quaternion={MINE_TRUSS_STRUTS.boomArm.quaternion}
      >
        <boxGeometry args={[0.068, MINE_TRUSS_STRUTS.boomArm.length, 0.084]} />
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>
      <mesh
        position={MINE_TRUSS_STRUTS.boomStay.position}
        quaternion={MINE_TRUSS_STRUTS.boomStay.quaternion}
      >
        <cylinderGeometry args={[0.012, 0.012, MINE_TRUSS_STRUTS.boomStay.length, 4]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      {/* Top sheave bracket & wheel */}
      <mesh position={[MINE_BOOM_TIP[0], MINE_BOOM_TIP[1] + 0.035, MINE_BOOM_TIP[2]]}>
        <boxGeometry args={[0.04, 0.055, 0.065]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh position={MINE_BOOM_TIP} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.052, 0.052, 0.04, 8]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      {/* Hoist cable & suspended ore skip bucket over shaft */}
      <mesh
        position={[
          MINE_BOOM_TIP[0],
          (MINE_BOOM_TIP[1] + MINE_BASE_Y + 0.4) * 0.5,
          MINE_BOOM_TIP[2],
        ]}
      >
        <cylinderGeometry args={[0.009, 0.009, MINE_BOOM_TIP[1] - (MINE_BASE_Y + 0.4), 4]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <group position={[MINE_BOOM_TIP[0], MINE_BASE_Y + 0.32, MINE_BOOM_TIP[2]]}>
        <mesh>
          <cylinderGeometry args={[0.105, 0.075, 0.15, 6]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        <mesh position={[0, 0.075, 0]}>
          <octahedronGeometry args={[0.08, 0]} />
          <meshStandardMaterial color="#7a3419" flatShading />
        </mesh>
      </group>

      {/* Ore grizzly intake boot at start of conveyor (+Z corridor, clear of tower) */}
      <group position={[-0.32, MINE_BASE_Y, hopperZ]}>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.24, 0.14, 0.24]} />
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
        <mesh position={[0, 0.155, 0]}>
          <boxGeometry args={[0.26, 0.03, 0.26]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0, 0.19, 0]}>
          <dodecahedronGeometry args={[0.09, 0]} />
          <meshStandardMaterial color="#7a3419" flatShading />
        </mesh>
      </group>

      {/* Upright axis-aligned inclined ore conveyor from intake boot into hopper mouth */}
      <group
        position={[(convStartX + convEndX) * 0.5, (convStartY + convEndY) * 0.5, hopperZ]}
        rotation={[0, 0, convPitch]}
      >
        {/* Belt bed */}
        <mesh>
          <boxGeometry args={[convLen, 0.04, 0.14]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Twin safety-orange side skirt rails */}
        {([-0.078, 0.078] as const).map((rz, idx) => (
          <mesh key={idx} position={[0, 0.02, rz]}>
            <boxGeometry args={[convLen, 0.045, 0.022]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
        ))}
        {/* Ore chunks riding up the belt */}
        {conveyorSteps.map((t, idx) => (
          <mesh
            key={`ore-${idx}`}
            position={[(t - 0.5) * convLen, 0.042, idx % 2 === 0 ? -0.015 : 0.018]}
            rotation={[idx * 0.5, idx * 0.7, 0]}
          >
            <octahedronGeometry args={[0.042, 0]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#7a3419' : MARS_ROCK} flatShading />
          </mesh>
        ))}
      </group>

      {/* Mid conveyor A-frame support trestle seated cleanly under the belt */}
      <group position={[(convStartX + convEndX) * 0.5, MINE_BASE_Y, hopperZ]}>
        {([-0.075, 0.075] as const).map((tz, idx) => (
          <mesh key={idx} position={[0, 0.155, tz]}>
            <boxGeometry args={[0.036, 0.31, 0.03]} />
            <meshStandardMaterial color={secondaryColor} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.295, 0]}>
          <boxGeometry args={[0.042, 0.032, 0.18]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      </group>

      {/* Ore crusher hopper & braced steel frame (+X/+Z) */}
      <group position={[hopperX, MINE_BASE_Y, hopperZ]}>
        {(
          [
            [-0.14, -0.14],
            [0.14, -0.14],
            [-0.14, 0.14],
            [0.14, 0.14],
          ] as const
        ).map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, 0.14, lz]}>
            <boxGeometry args={[0.038, 0.28, 0.038]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}
        {/* Horizontal structural leg tie-bars */}
        {([-0.14, 0.14] as const).map((zPos, idx) => (
          <mesh key={`hx-${idx}`} position={[0, 0.11, zPos]}>
            <boxGeometry args={[0.28, 0.025, 0.025]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}
        {([-0.14, 0.14] as const).map((xPos, idx) => (
          <mesh key={`hz-${idx}`} position={[xPos, 0.11, 0]}>
            <boxGeometry args={[0.025, 0.025, 0.28]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}
        <mesh geometry={MINE_GEO.hopperBody} position={[0, 0.2, 0]}>
          <meshStandardMaterial color={hullColor} flatShading />
        </mesh>
        <mesh geometry={MINE_GEO.hopperRim} position={[0, 0.47, 0]}>
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        {/* Collected hematite ore mound nested inside the open hopper */}
        <mesh position={[0, 0.42, 0]}>
          <dodecahedronGeometry args={[0.115, 0]} />
          <meshStandardMaterial color="#7a3419" flatShading />
        </mesh>
        {/* Side chute/breaker control box */}
        <mesh position={[0.18, 0.3, 0]}>
          <boxGeometry args={[0.06, 0.14, 0.12]} />
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
      </group>
    </group>
  )
}

function OxygenGeneratorMesh({
  hullColor,
  secondaryColor,
  emissive,
  emissiveIntensity,
  nightGlow,
}: {
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
  nightGlow: boolean
}) {
  const glowLevel = nightGlow ? 0.9 : 0.42
  const statorSlats = [-0.055, 0, 0.055] as const
  const cradleLegs = [
    [-0.1, -0.1],
    [0.1, -0.1],
    [-0.1, 0.1],
    [0.1, 0.1],
  ] as const

  return (
    <group position={[0, 0.12, 0]}>
      {/* Equipment skid tray under MOXIE processor (-X) */}
      <mesh position={[-0.14, OXY_BASE_Y + 0.022, 0]}>
        <boxGeometry args={[0.35, 0.044, 0.5]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Beveled MOXIE electrolysis core housing */}
      <mesh geometry={OXY_GEO.coreHousing} position={[-0.14, OXY_BASE_Y + 0.058, 0]}>
        <meshStandardMaterial
          color={hullColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          flatShading
        />
      </mesh>

      {/* Front louver radiator panel & glowing O2 telemetry bar (+Z) */}
      <group position={[-0.14, OXY_BASE_Y + 0.23, 0.228]}>
        <mesh>
          <boxGeometry args={[0.21, 0.17, 0.018]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {statorSlats.map((sy, idx) => (
          <mesh key={idx} position={[-0.02, sy, 0.011]}>
            <boxGeometry args={[0.13, 0.024, 0.012]} />
            <meshStandardMaterial color={secondaryColor} flatShading />
          </mesh>
        ))}
        <mesh position={[0.072, 0, 0.012]}>
          <boxGeometry args={[0.026, 0.12, 0.012]} />
          <meshStandardMaterial
            color={MINT_GREEN}
            emissive={MINT_GREEN}
            emissiveIntensity={glowLevel}
            flatShading
          />
        </mesh>
      </group>

      {/* Rear radiator louvers (-Z) & side service hatch (-X) */}
      <group position={[-0.14, OXY_BASE_Y + 0.23, -0.228]}>
        <mesh>
          <boxGeometry args={[0.19, 0.15, 0.016]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {statorSlats.map((sy, idx) => (
          <mesh key={idx} position={[0, sy, -0.01]}>
            <boxGeometry args={[0.14, 0.022, 0.012]} />
            <meshStandardMaterial color={secondaryColor} flatShading />
          </mesh>
        ))}
      </group>
      <group position={[-0.296, OXY_BASE_Y + 0.22, 0]}>
        <mesh>
          <boxGeometry args={[0.016, 0.2, 0.16]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[-0.01, 0, -0.032]}>
          <boxGeometry args={[0.01, 0.13, 0.055]} />
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
        <mesh position={[-0.01, 0.02, 0.042]}>
          <boxGeometry args={[0.01, 0.09, 0.024]} />
          <meshStandardMaterial
            color={WATER_BLUE}
            emissive={WATER_BLUE}
            emissiveIntensity={glowLevel}
            flatShading
          />
        </mesh>
      </group>

      {/* CO2 intake dust-filter turbine stack on MOXIE roof (aligned to HAB_PHI) */}
      <group position={[-0.15, OXY_BASE_Y + 0.43, -0.04]}>
        <mesh position={[0, 0.03, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.088, 0.105, 0.06, 8]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0, 0.102, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.092, 0.092, 0.09, 8]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        <mesh geometry={OXY_GEO.intakeCowl} position={[0, 0.145, 0]}>
          <meshStandardMaterial color={hullColor} flatShading />
        </mesh>
        <mesh position={[0, 0.27, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.06, 0.075, 0.025, 8]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      </group>

      {/* Pressurized O2 storage capsule & steel cradle (+X) */}
      <group position={[0.21, OXY_BASE_Y, 0.04]}>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.28, 0.04, 0.28]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {cradleLegs.map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, 0.125, lz]}>
            <boxGeometry args={[0.03, 0.19, 0.03]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}
        {/* Phase-matched clamping girdle around the O2 tank waist */}
        <mesh position={[0, 0.22, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.158, 0.158, 0.044, 8]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Faceted WATER_BLUE O2 tank */}
        <mesh geometry={OXY_GEO.tankBody} position={[0, 0.035, 0]}>
          <meshStandardMaterial color={WATER_BLUE} flatShading />
        </mesh>
        {/* Top safety-orange pressure relief dome */}
        <mesh position={[0, 0.415, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.038, 0.062, 0.045, 8]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
      </group>

      {/* Secondary CO exhaust condenser stack (+X / -Z) */}
      <group position={[0.16, OXY_BASE_Y, -0.21]}>
        <mesh position={[0, 0.02, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.072, 0.082, 0.04, 8]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0, 0.24, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.05, 0.056, 0.42, 8]} />
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
        <mesh position={[0, 0.47, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.066, 0.05, 0.05, 8]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      </group>

      {/* Curved high-pressure O2 manifold, flange collar & CO exhaust pipe */}
      <mesh geometry={OXY_GEO.o2FeedPipe}>
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>
      <mesh position={[0.016, OXY_BASE_Y + 0.34, 0.04]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.034, 0.034, 0.022, 6]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh geometry={OXY_GEO.exhaustPipe}>
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh position={[0.016, OXY_BASE_Y + 0.24, -0.16]} rotation={[0, 0.28, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.022, 6]} />
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>
    </group>
  )
}

function IceMelterMesh({
  hullColor,
  secondaryColor,
  emissive,
  emissiveIntensity,
  nightGlow,
}: {
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
  nightGlow: boolean
}) {
  const vatX = 0.12
  const vatZ = -0.06
  const heatGlow = nightGlow ? 0.8 : 0.38
  const iceGlow = nightGlow ? 0.35 : 0.16

  // Raw glacier crystal spires & ice blocks staged cleanly beside the feed chute (-X/+Z)
  const iceCrystals = [
    {
      pos: [-0.3, 0.13, 0.11] as const,
      r: 0.066,
      h: 0.2,
      rot: [0.15, 0.3, -0.16] as const,
      c: FROST_ICE,
    },
    {
      pos: [-0.23, 0.11, 0.17] as const,
      r: 0.056,
      h: 0.16,
      rot: [-0.14, 0.9, 0.12] as const,
      c: '#b8f0ff',
    },
    {
      pos: [-0.31, 0.1, 0.01] as const,
      r: 0.05,
      h: 0.13,
      rot: [0.18, -0.5, 0.14] as const,
      c: FROST_GLOW,
    },
    {
      pos: [-0.18, 0.09, 0.13] as const,
      r: 0.048,
      h: 0.12,
      rot: [-0.12, 0.4, -0.18] as const,
      c: FROST_ICE,
    },
  ] as const

  // Inclined ice feed chute geometry (runs along +X from ice staging tray into open vat)
  const chuteStartX = -0.23
  const chuteStartY = ICE_BASE_Y + 0.11
  const chuteEndX = -0.02
  const chuteEndY = ICE_BASE_Y + 0.445
  const chuteLen = Math.hypot(chuteEndX - chuteStartX, chuteEndY - chuteStartY)
  const chutePitch = Math.atan2(chuteEndY - chuteStartY, chuteEndX - chuteStartX)

  const vatLegs = [
    [-0.105, -0.105],
    [0.105, -0.105],
    [-0.105, 0.105],
    [0.105, 0.105],
  ] as const

  const coilHeights = [0.24, 0.315] as const

  return (
    <group position={[0, 0.12, 0]}>
      {/* -X Glacier ice staging skid & jagged faceted ice crystal cluster */}
      <group position={[0, ICE_BASE_Y, 0]}>
        <mesh position={[-0.25, 0.018, 0.06]}>
          <boxGeometry args={[0.27, 0.036, 0.38]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[-0.25, 0.04, 0.06]}>
          <boxGeometry args={[0.22, 0.01, 0.32]} />
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
        {iceCrystals.map((cr, idx) => (
          <mesh key={idx} position={cr.pos} rotation={cr.rot}>
            <cylinderGeometry args={[0.01, cr.r, cr.h, 6]} />
            <meshStandardMaterial
              color={cr.c}
              emissive={FROST_GLOW}
              emissiveIntensity={iceGlow}
              flatShading
            />
          </mesh>
        ))}
        {/* Chunky irregular base ice boulder */}
        <mesh position={[-0.25, 0.08, 0.09]} rotation={[0.4, 0.7, 0.2]}>
          <dodecahedronGeometry args={[0.075, 0]} />
          <meshStandardMaterial
            color="#d8f6ff"
            emissive={FROST_GLOW}
            emissiveIntensity={iceGlow}
            flatShading
          />
        </mesh>
      </group>

      {/* Inclined ice feed chute delivering ice blocks straight into open vat */}
      <group
        position={[(chuteStartX + chuteEndX) * 0.5, (chuteStartY + chuteEndY) * 0.5, vatZ]}
        rotation={[0, 0, chutePitch]}
      >
        <mesh>
          <boxGeometry args={[chuteLen, 0.026, 0.115]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {([-0.056, 0.056] as const).map((rz, idx) => (
          <mesh key={idx} position={[0, 0.02, rz]}>
            <boxGeometry args={[chuteLen, 0.036, 0.016]} />
            <meshStandardMaterial color={secondaryColor} flatShading />
          </mesh>
        ))}
        {/* Ice blocks sliding up the chute into the heated cauldron */}
        <mesh position={[-0.06, 0.044, 0]} rotation={[0.2, 0.4, 0.15]}>
          <dodecahedronGeometry args={[0.045, 0]} />
          <meshStandardMaterial
            color={FROST_ICE}
            emissive={FROST_GLOW}
            emissiveIntensity={iceGlow + 0.08}
            flatShading
          />
        </mesh>
        <mesh position={[0.08, 0.044, 0]} rotation={[-0.3, 0.6, 0.2]}>
          <octahedronGeometry args={[0.042, 0]} />
          <meshStandardMaterial
            color="#b8f0ff"
            emissive={FROST_GLOW}
            emissiveIntensity={iceGlow + 0.08}
            flatShading
          />
        </mesh>
      </group>
      {/* Chute support stanchion */}
      <mesh position={[-0.14, ICE_BASE_Y + 0.11, vatZ]}>
        <boxGeometry args={[0.038, 0.22, 0.085]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Open heated melting vat with glowing orange thermal coils & floating melting ice */}
      <group position={[vatX, ICE_BASE_Y, vatZ]}>
        {vatLegs.map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, 0.075, lz]}>
            <boxGeometry args={[0.034, 0.15, 0.034]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}
        {/* Continuous open-top cauldron wall & cavity */}
        <mesh geometry={ICE_GEO.openVat} position={[0, 0.12, 0]}>
          <meshStandardMaterial
            color={hullColor}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            flatShading
          />
        </mesh>
        {/* Exposed glowing orange heating coils wrapping the cauldron */}
        {coilHeights.map((cy, idx) => (
          <mesh key={idx} position={[0, cy, 0]} rotation={[0, HAB_PHI, 0]}>
            <cylinderGeometry args={[0.212, 0.212, 0.03, 8]} />
            <meshStandardMaterial
              color={SAFETY_ORANGE}
              emissive={SAFETY_ORANGE}
              emissiveIntensity={heatGlow}
              flatShading
            />
          </mesh>
        ))}
        {/* Hollow dark upper bezel rim leaving the cauldron interior wide open */}
        <mesh geometry={ICE_GEO.vatRim} position={[0, 0.404, 0]}>
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Liquid meltwater pool inside the open cauldron */}
        <mesh position={[0, 0.375, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.156, 0.156, 0.02, 8]} />
          <meshStandardMaterial
            color={WATER_BLUE}
            emissive={WATER_BLUE}
            emissiveIntensity={nightGlow ? 0.38 : 0.14}
            flatShading
          />
        </mesh>
        {/* Partially melted ice blocks floating right inside the water bath */}
        <mesh position={[-0.045, 0.4, 0.035]} rotation={[0.4, 0.5, 0.25]}>
          <dodecahedronGeometry args={[0.068, 0]} />
          <meshStandardMaterial
            color={FROST_ICE}
            emissive={FROST_GLOW}
            emissiveIntensity={iceGlow + 0.1}
            flatShading
          />
        </mesh>
        <mesh position={[0.058, 0.398, 0.025]} rotation={[-0.3, 0.8, 0.4]}>
          <octahedronGeometry args={[0.056, 0]} />
          <meshStandardMaterial
            color="#c4f3ff"
            emissive={FROST_GLOW}
            emissiveIntensity={iceGlow + 0.1}
            flatShading
          />
        </mesh>
        <mesh position={[0.01, 0.42, -0.05]} rotation={[0.2, -0.4, -0.2]}>
          <cylinderGeometry args={[0.012, 0.042, 0.095, 5]} />
          <meshStandardMaterial
            color={FROST_ICE}
            emissive={FROST_GLOW}
            emissiveIntensity={iceGlow + 0.1}
            flatShading
          />
        </mesh>

        {/* High overhead radiant heat lamp mast & emitter positioned so ice bath stays visible */}
        <mesh position={[0, 0.335, -0.235]}>
          <boxGeometry args={[0.046, 0.67, 0.046]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0, 0.655, -0.145]}>
          <boxGeometry args={[0.044, 0.042, 0.21]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <group position={[0, 0.615, -0.055]} rotation={[0.28, 0, 0]}>
          <mesh rotation={[0, HAB_PHI, 0]}>
            <cylinderGeometry args={[0.05, 0.088, 0.06, 8]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
          <mesh position={[0, -0.032, 0]} rotation={[0, HAB_PHI, 0]}>
            <cylinderGeometry args={[0.072, 0.072, 0.014, 8]} />
            <meshStandardMaterial
              color={WARM_WINDOW_LIGHT}
              emissive={SAFETY_ORANGE}
              emissiveIntensity={nightGlow ? 0.95 : 0.55}
              flatShading
            />
          </mesh>
        </group>
      </group>

      {/* Clarified meltwater collector tank (+X / +Z corner) */}
      <group position={[0.23, ICE_BASE_Y, 0.24]}>
        <mesh position={[0, 0.018, 0]}>
          <boxGeometry args={[0.24, 0.036, 0.24]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0, 0.145, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.105, 0.105, 0.22, 8]} />
          <meshStandardMaterial color={WATER_BLUE} flatShading />
        </mesh>
        <mesh position={[0, 0.268, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.095, 0.112, 0.035, 8]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0, 0.3, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.036, 0.052, 0.035, 8]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        {/* Illuminated frost-blue water level sight gauge */}
        <mesh position={[0.098, 0.145, 0.04]} rotation={[0, Math.PI / 8, 0]}>
          <boxGeometry args={[0.014, 0.13, 0.036]} />
          <meshStandardMaterial
            color={FROST_ICE}
            emissive={FROST_GLOW}
            emissiveIntensity={nightGlow ? 0.85 : 0.35}
            flatShading
          />
        </mesh>
      </group>

      {/* Meltwater transfer pipe draining out of the heated cauldron into the collector tank */}
      <mesh geometry={ICE_GEO.meltDrainPipe}>
        <meshStandardMaterial color={WATER_BLUE} flatShading />
      </mesh>
    </group>
  )
}

function IronRefineryMesh({
  hullColor,
  secondaryColor,
  emissive,
  emissiveIntensity,
  nightGlow,
}: {
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
  nightGlow: boolean
}) {
  const moltenIntensity = nightGlow ? 0.92 : 0.48
  const furnaceX = 0.38
  const furnaceZ = -0.22
  const buttressAngles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2] as const
  const stackPositions = [
    { x: -0.42, z: -0.48, h: 0.86 },
    { x: -0.14, z: -0.48, h: 0.96 },
  ] as const

  return (
    <group position={[0, 0.12, 0]}>
      {/* Smelter hall plinth & beveled processing nave (-X / center) */}
      <mesh position={[-0.24, IRON_BASE_Y + 0.025, -0.02]}>
        <boxGeometry args={[0.56, 0.05, 0.64]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh geometry={IRON_GEO.smelterHall} position={[-0.24, IRON_BASE_Y + 0.06, -0.02]}>
        <meshStandardMaterial
          color={secondaryColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          flatShading
        />
      </mesh>
      {/* Hall top vent monitor & orange ridge accent */}
      <mesh position={[-0.24, IRON_BASE_Y + 0.51, -0.02]}>
        <boxGeometry args={[0.38, 0.055, 0.18]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh position={[-0.24, IRON_BASE_Y + 0.55, -0.02]}>
        <boxGeometry args={[0.34, 0.028, 0.12]} />
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>
      {/* Front foundry shutter door & glowing smelter inspection slit (+Z) */}
      <group position={[-0.24, IRON_BASE_Y, 0.278]}>
        <mesh position={[0, 0.17, 0]}>
          <boxGeometry args={[0.3, 0.24, 0.024]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0, 0.135, 0.014]}>
          <boxGeometry args={[0.22, 0.16, 0.012]} />
          <meshStandardMaterial color={hullColor} flatShading />
        </mesh>
        <mesh position={[0, 0.25, 0.016]}>
          <boxGeometry args={[0.2, 0.036, 0.012]} />
          <meshStandardMaterial
            color={WARM_WINDOW_LIGHT}
            emissive={SAFETY_ORANGE}
            emissiveIntensity={moltenIntensity}
            flatShading
          />
        </mesh>
      </group>
      {/* Rear hall exhaust louvers (-Z) */}
      <group position={[-0.24, IRON_BASE_Y + 0.22, -0.318]}>
        <mesh>
          <boxGeometry args={[0.28, 0.16, 0.02]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {([-0.045, 0, 0.045] as const).map((ly, idx) => (
          <mesh key={idx} position={[0, ly, -0.012]}>
            <boxGeometry args={[0.22, 0.022, 0.01]} />
            <meshStandardMaterial color={hullColor} flatShading />
          </mesh>
        ))}
      </group>
      {/* Inclined intake chute hood connecting hematite bin into -X hall wall */}
      <mesh position={[-0.515, IRON_BASE_Y + 0.215, -0.02]} rotation={[0, 0, -0.45]}>
        <boxGeometry args={[0.14, 0.09, 0.22]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      {/* Flue breech connecting smelter hall into blast furnace base */}
      <mesh position={[0.08, IRON_BASE_Y + 0.24, -0.16]}>
        <boxGeometry args={[0.24, 0.24, 0.22]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Raw red hematite ore feed bin (-X edge) */}
      <group position={[-0.62, IRON_BASE_Y, -0.02]}>
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.22, 0.18, 0.34]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0, 0.195, 0]}>
          <boxGeometry args={[0.25, 0.032, 0.37]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        <mesh position={[0, 0.22, -0.06]} rotation={[0.2, 0.6, 0.1]}>
          <dodecahedronGeometry args={[0.082, 0]} />
          <meshStandardMaterial color="#7a3419" flatShading />
        </mesh>
        <mesh position={[0.01, 0.215, 0.06]} rotation={[-0.3, 0.4, 0.2]}>
          <dodecahedronGeometry args={[0.075, 0]} />
          <meshStandardMaterial color={MARS_ROCK} flatShading />
        </mesh>
      </group>

      {/* Twin braced exhaust / Cowper preheater stacks (-X / -Z quadrant) */}
      {stackPositions.map((st, idx) => (
        <group key={idx} position={[st.x, IRON_BASE_Y, st.z]}>
          <mesh position={[0, 0.03, 0]} rotation={[0, HAB_PHI, 0]}>
            <cylinderGeometry args={[0.115, 0.13, 0.06, 8]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          <mesh position={[0, st.h * 0.5 + 0.04, 0]} rotation={[0, HAB_PHI, 0]}>
            <cylinderGeometry args={[0.078, 0.105, st.h, 8]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          <mesh position={[0, st.h - 0.1, 0]} rotation={[0, HAB_PHI, 0]}>
            <cylinderGeometry args={[0.088, 0.09, 0.06, 8]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
          <mesh position={[0, st.h + 0.055, 0]} rotation={[0, HAB_PHI, 0]}>
            <cylinderGeometry args={[0.095, 0.078, 0.04, 8]} />
            <meshStandardMaterial color={secondaryColor} flatShading />
          </mesh>
        </group>
      ))}
      {/* Structural tie girders & pipe flange linking the twin stacks */}
      <mesh position={[-0.28, IRON_BASE_Y + 0.46, -0.48]}>
        <boxGeometry args={[0.3, 0.04, 0.06]} />
        <meshStandardMaterial color={secondaryColor} flatShading />
      </mesh>
      <mesh position={[-0.28, IRON_BASE_Y + 0.72, -0.48]}>
        <boxGeometry args={[0.3, 0.04, 0.06]} />
        <meshStandardMaterial color={secondaryColor} flatShading />
      </mesh>
      <mesh position={[-0.08, IRON_BASE_Y + 0.79, -0.47]} rotation={[0, -0.4, Math.PI / 2]}>
        <cylinderGeometry args={[0.056, 0.056, 0.05, 6]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      {/* Curved hot-blast downcomer pipe from blast furnace crown to stacks */}
      <mesh geometry={IRON_GEO.hotBlastPipe}>
        <meshStandardMaterial color={secondaryColor} flatShading />
      </mesh>

      {/* Main tapered blast furnace tower (+X / -Z) */}
      <group position={[furnaceX, IRON_BASE_Y, furnaceZ]}>
        <mesh geometry={IRON_GEO.blastFurnace}>
          <meshStandardMaterial color={hullColor} flatShading />
        </mesh>
        {/* Phase-matched incandescent molten hearth ring */}
        <mesh position={[0, 0.24, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.278, 0.292, 0.11, 8]} />
          <meshStandardMaterial
            color={SAFETY_ORANGE}
            emissive={SAFETY_ORANGE}
            emissiveIntensity={moltenIntensity}
            flatShading
          />
        </mesh>
        {/* Mid-shaft structural bust-ring collar receiving the 4 tapered buttresses */}
        <mesh position={[0, 0.64, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.244, 0.252, 0.045, 8]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Upper furnace safety collar & crown beacon */}
        <mesh position={[0, 0.88, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.18, 0.195, 0.045, 8]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0, 1.095, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.055, 0.075, 0.04, 8]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        {/* 4 sloped steel buttress ribs hugging the furnace taper into the bust-ring collar */}
        {buttressAngles.map((ang, idx) => (
          <group key={idx} rotation={[0, ang + Math.PI / 4, 0]}>
            <mesh position={[0, 0.325, 0.262]} rotation={[-0.088, 0, 0]}>
              <boxGeometry args={[0.054, 0.66, 0.054]} />
              <meshStandardMaterial color={METAL_DARK} flatShading />
            </mesh>
          </group>
        ))}
      </group>

      {/* Elevated tapping runner channel & downward molten stream pouring into the open ladle */}
      <group position={[furnaceX, IRON_BASE_Y, 0.16]}>
        {/* Runner support pier */}
        <mesh position={[0, 0.148, -0.02]}>
          <boxGeometry args={[0.14, 0.296, 0.22]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Runner trough clearing the crucible rim cleanly (>= 0.012 above 0.28) */}
        <mesh position={[0, 0.315, 0.045]}>
          <boxGeometry args={[0.15, 0.044, 0.34]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0, 0.342, 0.045]}>
          <boxGeometry args={[0.082, 0.022, 0.33]} />
          <meshStandardMaterial
            color={WARM_WINDOW_LIGHT}
            emissive={SAFETY_ORANGE}
            emissiveIntensity={moltenIntensity + 0.15}
            flatShading
          />
        </mesh>
        {/* Glowing vertical molten pour stream dropping into the crucible bath */}
        <mesh position={[0, 0.29, 0.2]}>
          <cylinderGeometry args={[0.026, 0.02, 0.1, 6]} />
          <meshStandardMaterial
            color={WARM_WINDOW_LIGHT}
            emissive={SAFETY_ORANGE}
            emissiveIntensity={moltenIntensity + 0.2}
            flatShading
          />
        </mesh>
      </group>

      {/* Open foundry pouring ladle cradle filled with glowing liquid iron (+X / +Z) */}
      <group position={[furnaceX, IRON_BASE_Y, 0.44]}>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.38, 0.04, 0.34]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {([-0.17, 0.17] as const).map((tx, idx) => (
          <mesh key={idx} position={[tx, 0.12, 0]}>
            <boxGeometry args={[0.04, 0.19, 0.06]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}
        <mesh geometry={IRON_GEO.crucibleCup} position={[0, 0.06, 0]}>
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
        <mesh position={[0, 0.245, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.02, 8]} />
          <meshStandardMaterial
            color={WARM_WINDOW_LIGHT}
            emissive={SAFETY_ORANGE}
            emissiveIntensity={moltenIntensity + 0.18}
            flatShading
          />
        </mesh>
      </group>

      {/* Finished cast-iron ingot stack on steel skid (-X / +Z front) */}
      <group position={[-0.24, IRON_BASE_Y, 0.48]}>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.42, 0.04, 0.28]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {([-0.12, 0, 0.12] as const).map((ix, idx) => (
          <mesh key={`b-${idx}`} geometry={IRON_GEO.ingotBar} position={[ix, 0.042, 0]}>
            <meshStandardMaterial color="#7d8a9c" flatShading />
          </mesh>
        ))}
        {([-0.06, 0.06] as const).map((ix, idx) => (
          <mesh key={`t-${idx}`} geometry={IRON_GEO.ingotBar} position={[ix, 0.09, 0]}>
            <meshStandardMaterial color="#96a3b5" flatShading />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function RepairWorkshopMesh({
  hullColor,
  secondaryColor,
  emissive,
  emissiveIntensity,
  nightGlow,
}: {
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
  nightGlow: boolean
}) {
  const glowFactor = nightGlow ? 1 : 0
  const interiorEmissive = emissiveIntensity > 0 ? emissive : WARM_WINDOW_LIGHT
  const interiorEmissiveIntensity =
    emissiveIntensity > 0 ? emissiveIntensity : 0.42 + 0.65 * glowFactor

  return (
    <group position={[0, WORK_BASE_Y, 0]}>
      {/* Low workshop service deck apron over the 1x1 foundation */}
      <mesh position={[0, 0.008, 0]} receiveShadow>
        <boxGeometry args={[0.8, 0.016, 0.8]} />
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Beveled service garage cabin (-X / -Z) */}
      <group position={[-0.1, 0.016, -0.06]}>
        <mesh geometry={WORK_GEO.garageBody} castShadow receiveShadow>
          <meshStandardMaterial
            color={hullColor}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            flatShading
          />
        </mesh>
        {/* Safety-orange chamfered garage roof cap + ridge vent */}
        <mesh geometry={WORK_GEO.roofCap} position={[0, 0.295, 0]} castShadow>
          <meshStandardMaterial
            color={SAFETY_ORANGE}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity * 0.5}
            flatShading
          />
        </mesh>
        <mesh position={[0, 0.375, 0]} castShadow>
          <boxGeometry args={[0.14, 0.032, 0.32]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>

        {/* Front +Z garage shutter bay frame & warm illuminated workshop interior */}
        <mesh geometry={WORK_GEO.doorFrame} position={[0, 0.11, 0.218]}>
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Glowing interior garage backdrop */}
        <mesh position={[0, 0.085, 0.205]}>
          <boxGeometry args={[0.21, 0.15, 0.02]} />
          <meshStandardMaterial
            color={WARM_WINDOW_LIGHT}
            emissive={interiorEmissive}
            emissiveIntensity={interiorEmissiveIntensity}
            flatShading
          />
        </mesh>
        {/* Half-raised ribbed roll-up garage shutter */}
        <mesh position={[0, 0.165, 0.222]} castShadow>
          <boxGeometry args={[0.205, 0.058, 0.022]} />
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
        <mesh position={[0, 0.138, 0.228]}>
          <boxGeometry args={[0.205, 0.014, 0.022]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>

        {/* Side (-X) steel tool locker cabinet */}
        <mesh position={[-0.245, 0.125, -0.02]} castShadow>
          <boxGeometry args={[0.06, 0.22, 0.22]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        <mesh position={[-0.278, 0.13, -0.02]}>
          <boxGeometry args={[0.012, 0.16, 0.16]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      </group>

      {/* Overhanging jib hoist crane (+X / -Z mast extending forward over service bay) */}
      <group>
        <mesh geometry={WORK_GEO.cranePedestal} position={[0.22, 0, -0.22]} castShadow>
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Vertical crane column */}
        <mesh position={[0.22, 0.32, -0.22]} rotation={[0, HAB_PHI, 0]} castShadow>
          <cylinderGeometry args={[0.042, 0.048, 0.62, 8]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Diagonal truss brace */}
        <mesh
          position={WORK_CRANE_STRUT.position}
          quaternion={WORK_CRANE_STRUT.quaternion}
          castShadow
        >
          <cylinderGeometry args={[0.022, 0.022, WORK_CRANE_STRUT.length, 6]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Cantilevered safety-orange jib boom */}
        <mesh position={[0.22, 0.585, 0.015]} castShadow>
          <boxGeometry args={[0.075, 0.055, 0.52]} />
          <meshStandardMaterial
            color={SAFETY_ORANGE}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity * 0.5}
            flatShading
          />
        </mesh>
        {/* Jib-tip downward work floodlight */}
        <mesh position={[0.21, 0.554, 0.245]}>
          <boxGeometry args={[0.056, 0.012, 0.038]} />
          <meshStandardMaterial
            color={WARM_WINDOW_LIGHT}
            emissive={WARM_WINDOW_LIGHT}
            emissiveIntensity={0.35 + 0.85 * glowFactor}
            flatShading
          />
        </mesh>
        {/* Mast head cap + counterweight */}
        <mesh position={[0.22, 0.605, -0.26]} castShadow>
          <boxGeometry args={[0.11, 0.075, 0.09]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Trolley + vertical steel hoist cable + hook pulley block */}
        <mesh position={[0.21, 0.545, 0.21]}>
          <boxGeometry args={[0.088, 0.036, 0.07]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0.21, 0.43, 0.21]}>
          <cylinderGeometry args={[0.008, 0.008, 0.22, 6]} />
          <meshStandardMaterial color={HULL_GRAY} flatShading />
        </mesh>
        <mesh position={[0.21, 0.305, 0.21]} castShadow>
          <boxGeometry args={[0.045, 0.048, 0.045]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        <mesh position={[0.21, 0.268, 0.21]} rotation={[0, 0, Math.PI / 6]}>
          <cylinderGeometry args={[0.01, 0.014, 0.032, 6]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      </group>

      {/* Front service workbench & rover drive module under hoist (+X / +Z) */}
      <group position={[0.2, 0, 0.22]}>
        {/* Four workbench legs */}
        {(
          [
            [-0.1, -0.09],
            [0.1, -0.09],
            [-0.1, 0.09],
            [0.1, 0.09],
          ] as const
        ).map(([lx, lz], idx) => (
          <mesh key={`leg-${idx}`} position={[lx, 0.045, lz]} castShadow>
            <boxGeometry args={[0.026, 0.09, 0.026]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}
        {/* Heavy steel bench top */}
        <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 0.026, 0.23]} />
          <meshStandardMaterial color={secondaryColor} flatShading />
        </mesh>
        {/* Rover core module / motor block undergoing repair */}
        <mesh position={[0, 0.155, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.046, 0.046, 0.14, 8]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0.03, 0.165, 0.045]} castShadow>
          <boxGeometry args={[0.06, 0.045, 0.03]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
      </group>

      {/* Articulated robotic welding arm (-X / +Z) reaching toward service bench */}
      <group>
        <mesh geometry={WORK_GEO.armTurret} position={[-0.2, 0, 0.27]} castShadow>
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={WORK_ARM_LOWER.position} quaternion={WORK_ARM_LOWER.quaternion} castShadow>
          <cylinderGeometry args={[0.026, 0.03, WORK_ARM_LOWER.length, 6]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        <mesh position={[-0.11, 0.25, 0.23]} castShadow>
          <octahedronGeometry args={[0.042, 0]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={WORK_ARM_UPPER.position} quaternion={WORK_ARM_UPPER.quaternion} castShadow>
          <cylinderGeometry args={[0.02, 0.024, WORK_ARM_UPPER.length, 6]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        {/* Welding torch nozzle sleeve & glowing arc tip */}
        <mesh position={[0.052, 0.168, 0.22]} castShadow>
          <octahedronGeometry args={[0.024, 0]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0.074, 0.156, 0.22]}>
          <octahedronGeometry args={[0.017, 0]} />
          <meshStandardMaterial
            color={SPARK_YELLOW}
            emissive={SPARK_YELLOW}
            emissiveIntensity={0.65 + 0.55 * glowFactor}
            flatShading
          />
        </mesh>
      </group>

      {/* Side spare parts rack: spare rover wheel + welding gas tank (+X side) */}
      <group position={[0.31, 0, -0.02]}>
        {/* Rack stand */}
        <mesh position={[0, 0.025, 0]} castShadow>
          <boxGeometry args={[0.1, 0.05, 0.18]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Spare chunky low-poly wheel */}
        <group position={[0.01, 0.125, -0.02]} rotation={[0, 0, Math.PI / 2 - 0.15]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.082, 0.082, 0.052, 8]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.042, 0.042, 0.06, 8]} />
            <meshStandardMaterial color={secondaryColor} flatShading />
          </mesh>
        </group>
        {/* Welding gas cylinder */}
        <mesh position={[0, 0.135, 0.075]} rotation={[0, HAB_PHI, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.032, 0.17, 8]} />
          <meshStandardMaterial color={WATER_BLUE} flatShading />
        </mesh>
      </group>
    </group>
  )
}

function SteelFactoryMesh({
  hullColor,
  secondaryColor,
  emissive,
  emissiveIntensity,
  nightGlow,
}: {
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
  nightGlow: boolean
}) {
  const glowFactor = nightGlow ? 1 : 0
  const furnaceEmissive = emissiveIntensity > 0 ? emissive : SAFETY_ORANGE
  const furnaceEmissiveIntensity =
    emissiveIntensity > 0 ? emissiveIntensity : 0.65 + 0.55 * glowFactor
  const clerestoryEmissive = emissiveIntensity > 0 ? emissive : WARM_WINDOW_LIGHT
  const clerestoryEmissiveIntensity =
    emissiveIntensity > 0 ? emissiveIntensity : 0.32 + 0.68 * glowFactor

  return (
    <group position={[0, STEEL_BASE_Y, 0]}>
      {/* Main beveled alloy rolling mill hall (-Z, offset slightly +X) */}
      <group position={[0.16, 0, -0.36]}>
        <mesh geometry={STEEL_GEO.millHall} castShadow receiveShadow>
          <meshStandardMaterial
            color={hullColor}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            flatShading
          />
        </mesh>

        {/* Exterior side structural buttress ribs */}
        {([-0.2, 0, 0.2] as const).map((rz, idx) => (
          <mesh key={`rib-${idx}`} position={[0, 0.2, rz]} castShadow>
            <boxGeometry args={[1.15, 0.36, 0.055]} />
            <meshStandardMaterial color={secondaryColor} flatShading />
          </mesh>
        ))}

        {/* Raised monitor clerestory roof + illuminated side strip windows */}
        <mesh geometry={STEEL_GEO.clerestory} position={[0, 0.495, 0]} castShadow>
          <meshStandardMaterial
            color={SAFETY_ORANGE}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity * 0.5}
            flatShading
          />
        </mesh>
        <mesh position={[0, 0.515, 0.02]}>
          <boxGeometry args={[0.76, 0.055, 0.42]} />
          <meshStandardMaterial
            color={WARM_WINDOW_LIGHT}
            emissive={clerestoryEmissive}
            emissiveIntensity={clerestoryEmissiveIntensity}
            flatShading
          />
        </mesh>

        {/* Mill exit rolling portal (+Z wall aligned with roller conveyor at world x=+0.22) */}
        <mesh position={[0.06, 0.14, 0.34]} castShadow>
          <boxGeometry args={[0.3, 0.25, 0.04]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        <mesh position={[0.06, 0.11, 0.35]}>
          <boxGeometry args={[0.21, 0.16, 0.024]} />
          <meshStandardMaterial
            color={SAFETY_ORANGE}
            emissive={furnaceEmissive}
            emissiveIntensity={furnaceEmissiveIntensity}
            flatShading
          />
        </mesh>

        {/* Rear -Z exhaust intake louver & vertical cooling conduits */}
        <group position={[0, 0.21, -0.342]}>
          <mesh>
            <boxGeometry args={[0.42, 0.2, 0.02]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          {([-0.055, 0, 0.055] as const).map((ly, idx) => (
            <mesh key={`slat-${idx}`} position={[0, ly, -0.012]}>
              <boxGeometry args={[0.34, 0.024, 0.01]} />
              <meshStandardMaterial color={secondaryColor} flatShading />
            </mesh>
          ))}
        </group>
        {([-0.34, 0.34] as const).map((px, idx) => (
          <mesh key={`conduit-${idx}`} position={[px, 0.22, -0.352]} rotation={[0, HAB_PHI, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.4, 8]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}
      </group>

      {/* External electric-arc converter & off-gas stack (-X / -Z) */}
      <group position={[-0.63, 0, -0.36]}>
        <mesh geometry={STEEL_GEO.converterVessel} castShadow>
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Glowing converter collar ring */}
        <mesh position={[0, 0.38, 0]} rotation={[0, HAB_PHI, 0]}>
          <cylinderGeometry args={[0.165, 0.165, 0.05, 8]} />
          <meshStandardMaterial
            color={SAFETY_ORANGE}
            emissive={furnaceEmissive}
            emissiveIntensity={0.45 + 0.55 * glowFactor}
            flatShading
          />
        </mesh>
        {/* Stack rim cap */}
        <mesh position={[0, 0.675, 0]} rotation={[0, HAB_PHI, 0]} castShadow>
          <cylinderGeometry args={[0.135, 0.12, 0.035, 8]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
      </group>
      {/* Off-gas duct bridging converter crown to mill hall */}
      <mesh geometry={STEEL_GEO.converterDuct} castShadow>
        <meshStandardMaterial color={secondaryColor} flatShading />
      </mesh>

      {/* Paired horizontal pressurized CO2 / carbon gas tanks on cradles (-X / +Z, Lote 2 img3) */}
      {(
        [
          { z: 0.28, color: secondaryColor, band: SAFETY_ORANGE },
          { z: 0.56, color: SAFETY_ORANGE, band: METAL_DARK },
        ] as const
      ).map(({ z, color, band }, tIdx) => (
        <group key={`tank-${tIdx}`} position={[-0.38, 0, z]}>
          {/* Paired steel support cradles */}
          {([-0.16, 0.16] as const).map((cx, cIdx) => (
            <mesh key={`cradle-${cIdx}`} position={[cx, 0.06, 0]} castShadow>
              <boxGeometry args={[0.05, 0.12, 0.2]} />
              <meshStandardMaterial color={METAL_DARK} flatShading />
            </mesh>
          ))}
          {/* Horizontal chamfered domed cylinder */}
          <mesh
            geometry={STEEL_GEO.gasTank}
            position={[0, 0.155, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <meshStandardMaterial
              color={color}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity * 0.6}
              flatShading
            />
          </mesh>
          {/* Twin pressure saddle straps */}
          {([-0.16, 0.16] as const).map((bx, bIdx) => (
            <mesh
              key={`band-${bIdx}`}
              position={[bx, 0.155, 0]}
              rotation={[HAB_PHI, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.123, 0.123, 0.03, 8]} />
              <meshStandardMaterial color={band} flatShading />
            </mesh>
          ))}
        </group>
      ))}
      {/* Overhead curved gas feed manifolds into mill hall */}
      <mesh geometry={STEEL_GEO.tankPipeA} castShadow>
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>
      <mesh geometry={STEEL_GEO.tankPipeB} castShadow>
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Continuous hot steel rolling conveyor line & rolling press cages (+X / +Z) */}
      <group position={[0.22, 0, 0.34]}>
        {/* Conveyor roller table frame */}
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.26, 0.08, 0.68]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Conveyor side rails */}
        {([-0.12, 0.12] as const).map((rx, idx) => (
          <mesh key={`rail-${idx}`} position={[rx, 0.092, 0]}>
            <boxGeometry args={[0.025, 0.026, 0.68]} />
            <meshStandardMaterial color={secondaryColor} flatShading />
          </mesh>
        ))}
        {/* Hot glowing rolled steel slab emerging from mill portal */}
        <mesh position={[0, 0.096, -0.14]} castShadow>
          <boxGeometry args={[0.15, 0.034, 0.28]} />
          <meshStandardMaterial
            color={SAFETY_ORANGE}
            emissive={furnaceEmissive}
            emissiveIntensity={furnaceEmissiveIntensity}
            flatShading
          />
        </mesh>
        {/* Cooled pressed steel plate exiting second rolling stand */}
        <mesh position={[0, 0.092, 0.18]} castShadow>
          <boxGeometry args={[0.17, 0.022, 0.24]} />
          <meshStandardMaterial color="#8fa0b3" flatShading />
        </mesh>
        {/* Twin heavy rolling mill press stand arches straddling the slab */}
        {([-0.14, 0.12] as const).map((sz, sIdx) => (
          <group key={`stand-${sIdx}`} position={[0, 0, sz]}>
            <mesh position={[-0.14, 0.16, 0]} castShadow>
              <boxGeometry args={[0.055, 0.24, 0.07]} />
              <meshStandardMaterial color={METAL_DARK} flatShading />
            </mesh>
            <mesh position={[0.14, 0.16, 0]} castShadow>
              <boxGeometry args={[0.055, 0.24, 0.07]} />
              <meshStandardMaterial color={METAL_DARK} flatShading />
            </mesh>
            <mesh position={[0, 0.265, 0]} castShadow>
              <boxGeometry args={[0.35, 0.055, 0.085]} />
              <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
            </mesh>
          </group>
        ))}
      </group>

      {/* Finished structural steel yard: stacked I-beams + coiled steel rolls (+X edge) */}
      <group position={[0.59, 0, 0.34]}>
        {/* Timber/steel dunnage sleepers */}
        {([-0.14, 0.14] as const).map((dz, idx) => (
          <mesh key={`dun-${idx}`} position={[0, 0.015, dz]} castShadow>
            <boxGeometry args={[0.26, 0.03, 0.04]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}
        {/* Three stacked structural steel I-beams (flange + web silhouettes) */}
        {(
          [
            [-0.07, 0.06],
            [0.04, 0.06],
            [-0.015, 0.118],
          ] as const
        ).map(([bx, by], idx) => (
          <group key={`beam-${idx}`} position={[bx, by, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.075, 0.016, 0.38]} />
              <meshStandardMaterial color="#96a3b5" flatShading />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[0.024, 0.06, 0.38]} />
              <meshStandardMaterial color="#586778" flatShading />
            </mesh>
            <mesh position={[0, 0.03, 0]} castShadow>
              <boxGeometry args={[0.075, 0.016, 0.38]} />
              <meshStandardMaterial color="#96a3b5" flatShading />
            </mesh>
          </group>
        ))}
        {/* Pair of upright coiled sheet steel rolls */}
        {(
          [
            [-0.04, 0.31],
            [0.1, 0.28],
          ] as const
        ).map(([cx, cz], idx) => (
          <mesh
            key={`coil-${idx}`}
            geometry={STEEL_GEO.steelCoil}
            position={[cx, 0, cz]}
            castShadow
          >
            <meshStandardMaterial color={idx === 0 ? '#96a3b5' : secondaryColor} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function NuclearReactorMesh({
  hullColor,
  secondaryColor,
  emissive,
  emissiveIntensity,
  nightGlow,
}: {
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
  nightGlow: boolean
}) {
  const glowFactor = nightGlow ? 1 : 0
  const coreEmissive = emissiveIntensity > 0 ? emissive : MINT_GREEN
  const coreEmissiveIntensity = emissiveIntensity > 0 ? emissiveIntensity : 0.7 + 0.75 * glowFactor
  const towerPhi = Math.PI / 10

  return (
    <group position={[0, REACTOR_BASE_Y, 0]}>
      {/* Hyperbolic nuclear cooling tower (-X / -Z) */}
      <group position={[-0.26, 0, -0.24]}>
        <mesh geometry={REACTOR_GEO.coolingTower} castShadow receiveShadow>
          <meshStandardMaterial
            color={hullColor}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            flatShading
          />
        </mesh>
        {/* Heavy dark base plinth skirt */}
        <mesh position={[0, 0.045, 0]} rotation={[0, towerPhi, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.36, 0.09, 10]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Safety-orange hazard collar band around upper flared lip (open-ended so throat stays hollow) */}
        <mesh position={[0, 0.87, 0]} rotation={[0, towerPhi, 0]}>
          <cylinderGeometry args={[0.258, 0.242, 0.072, 10, 1, true]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>
        {/* Inner cooling throat shadow ring + glowing condenser vapor mist */}
        <mesh position={[0, 0.76, 0]} rotation={[0, towerPhi, 0]}>
          <cylinderGeometry args={[0.175, 0.165, 0.03, 10]} />
          <meshStandardMaterial
            color={WATER_BLUE}
            emissive={WATER_BLUE}
            emissiveIntensity={0.45 + 0.65 * glowFactor}
            flatShading
          />
        </mesh>
      </group>

      {/* Armored concrete containment dome + exposed Cherenkov fuel rods (+X / +Z) */}
      <group position={[0.28, 0, 0.22]} rotation={[0, Math.PI / 4, 0]}>
        <mesh geometry={REACTOR_GEO.containmentDome} castShadow receiveShadow>
          <meshStandardMaterial
            color={secondaryColor}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            flatShading
          />
        </mesh>
        {/* Dark blast shield base collar */}
        <mesh position={[0, 0.04, 0]} rotation={[0, towerPhi, 0]} castShadow>
          <cylinderGeometry args={[0.325, 0.33, 0.08, 10]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Orange dome crane/ring collar */}
        <mesh position={[0, 0.345, 0]} rotation={[0, towerPhi, 0]}>
          <cylinderGeometry args={[0.318, 0.318, 0.04, 10]} />
          <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
        </mesh>

        {/* Front armored viewport revealing glowing MINT_GREEN Cherenkov core + 3 fuel rods */}
        <group position={[0, 0.2, 0.295]}>
          <mesh castShadow>
            <boxGeometry args={[0.24, 0.2, 0.05]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          <mesh position={[0, 0, 0.016]}>
            <boxGeometry args={[0.185, 0.145, 0.025]} />
            <meshStandardMaterial
              color={MINT_GREEN}
              emissive={coreEmissive}
              emissiveIntensity={coreEmissiveIntensity}
              flatShading
            />
          </mesh>
          {/* Three vertical dark reactor control rods silhouette inside glowing viewport */}
          {([-0.052, 0, 0.052] as const).map((rx, idx) => (
            <mesh key={`rod-${idx}`} position={[rx, 0, 0.032]}>
              <cylinderGeometry args={[0.014, 0.014, 0.135, 6]} />
              <meshStandardMaterial color={METAL_DARK} flatShading />
            </mesh>
          ))}
        </group>

        {/* Side vertical reinforcement blast ribs on dome */}
        {([-0.295, 0.295] as const).map((bx, idx) => (
          <mesh key={`rib-${idx}`} position={[bx, 0.2, 0]} castShadow>
            <boxGeometry args={[0.05, 0.34, 0.08]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}

        {/* Top radiation trefoil emblem plate (☢) mounted on top crown of containment dome */}
        <mesh position={[0, 0.596, 0]}>
          <cylinderGeometry args={[0.095, 0.1, 0.016, 12]} />
          <meshStandardMaterial color={SPARK_YELLOW} flatShading />
        </mesh>
        <group position={[0, 0.605, 0]}>
          {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((ang, idx) => (
            <group key={`trefoil-${idx}`} rotation={[0, ang, 0]}>
              <mesh geometry={REACTOR_GEO.trefoilBlade} rotation={[-Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color={METAL_DARK} flatShading />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.006, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.012, 8]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        </group>
      </group>

      {/* Dual primary insulated coolant bridge pipes connecting containment dome <-> cooling tower */}
      <mesh geometry={REACTOR_GEO.coolantPipeUpper} castShadow>
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>
      <mesh geometry={REACTOR_GEO.coolantPipeLower} castShadow>
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Quadrant (-X / +Z): Spent-fuel cask + HV output transformer & 3 ceramic bushings */}
      <group position={[-0.44, 0, 0.4]}>
        {/* HV output transformer skid facing outward (-X / +Z) */}
        <group position={[-0.08, 0, 0.08]} rotation={[0, -Math.PI / 4, 0]}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.24, 0.2, 0.19]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          <mesh position={[0, 0.21, 0]} castShadow>
            <boxGeometry args={[0.26, 0.024, 0.21]} />
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
          {([-0.072, 0, 0.072] as const).map((bx, idx) => (
            <mesh
              key={`bushing-${idx}`}
              position={[bx, 0.275, 0]}
              rotation={[0, HAB_PHI, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.02, 0.026, 0.11, 8]} />
              <meshStandardMaterial color={HULL_WHITE} flatShading />
            </mesh>
          ))}
          <mesh position={[0, 0.11, 0.1]}>
            <boxGeometry args={[0.14, 0.05, 0.014]} />
            <meshStandardMaterial
              color={MINT_GREEN}
              emissive={coreEmissive}
              emissiveIntensity={coreEmissiveIntensity}
              flatShading
            />
          </mesh>
        </group>

        {/* Shielded yellow/black nuclear fuel cask drum cleanly separated beside transformer */}
        <group position={[0.17, 0, -0.14]}>
          <mesh geometry={REACTOR_GEO.fuelCask} castShadow>
            <meshStandardMaterial color={SPARK_YELLOW} flatShading />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[0, HAB_PHI, 0]}>
            <cylinderGeometry args={[0.102, 0.102, 0.045, 8]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        </group>
      </group>

      {/* Quadrant (+X / -Z): Ground-mounted low angled condenser fin bank + floor pipes */}
      <group position={[0.45, 0, -0.45]} rotation={[0, Math.PI / 4, 0]}>
        <mesh position={[0, 0.045, 0]} castShadow>
          <boxGeometry args={[0.38, 0.09, 0.26]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
        {/* Twin ground return pipes linking condenser skid back toward cooling loop */}
        {([-0.065, 0.065] as const).map((pz, idx) => (
          <mesh key={`cpipe-${idx}`} position={[-0.24, 0.03, pz]} castShadow>
            <boxGeometry args={[0.2, 0.045, 0.045]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        ))}
        <group position={[0, 0.13, 0]} rotation={[0.42, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.36, 0.032, 0.24]} />
            <meshStandardMaterial color={secondaryColor} flatShading />
          </mesh>
          {([-0.12, -0.04, 0.04, 0.12] as const).map((fx, idx) => (
            <mesh key={`cond-fin-${idx}`} position={[fx, 0.024, 0]}>
              <boxGeometry args={[0.026, 0.024, 0.22]} />
              <meshStandardMaterial color="#475569" flatShading />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

function BatteryMesh({
  hullColor,
  secondaryColor,
  emissive,
  emissiveIntensity,
  nightGlow,
}: {
  hullColor: string
  secondaryColor: string
  emissive: string
  emissiveIntensity: number
  nightGlow: boolean
}) {
  const chargeIntensity = nightGlow ? 0.85 : 0.4
  const cellPositions = [
    [-0.145, -0.115],
    [0.145, -0.115],
    [-0.145, 0.115],
    [0.145, 0.115],
  ] as const

  return (
    <group position={[0, 0.12, 0]}>
      {/* Chamfered dark-metal battery rack tray */}
      <mesh
        geometry={BATTERY_GEO.rackTray}
        position={[0, BAT_BASE_Y + 0.043, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial color={METAL_DARK} flatShading />
      </mesh>

      {/* Four corner structural rack stanchions */}
      {(
        [
          [-0.285, -0.235],
          [0.285, -0.235],
          [-0.285, 0.235],
          [0.285, 0.235],
        ] as const
      ).map(([px, pz], idx) => (
        <mesh key={idx} position={[px, BAT_BASE_Y + 0.265, pz]}>
          <boxGeometry args={[0.036, 0.45, 0.036]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      ))}

      {/* Upper perimeter rack rails */}
      {([-0.235, 0.235] as const).map((rz, idx) => (
        <mesh key={idx} position={[0, BAT_BASE_Y + 0.46, rz]}>
          <boxGeometry args={[0.57, 0.028, 0.028]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      ))}
      {([-0.285, 0.285] as const).map((rx, idx) => (
        <mesh key={idx} position={[rx, BAT_BASE_Y + 0.46, 0]}>
          <boxGeometry args={[0.028, 0.028, 0.47]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      ))}

      {/* 2x2 vertical lithium-ion storage cells */}
      {cellPositions.map(([cx, cz], idx) => (
        <group key={idx} position={[cx, BAT_BASE_Y + 0.048, cz]}>
          <mesh geometry={BATTERY_GEO.cellBody}>
            <meshStandardMaterial
              color={idx % 2 === 0 ? hullColor : secondaryColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              flatShading
            />
          </mesh>
          <mesh geometry={BATTERY_GEO.cellBand}>
            <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
          </mesh>
          <mesh position={[0, 0.445, 0]}>
            <cylinderGeometry args={[0.046, 0.056, 0.035, 6]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
        </group>
      ))}

      {/* Upper busbar collector bridge, rail tie-clamps & charge beacon */}
      <mesh
        geometry={BATTERY_GEO.busbar}
        position={[0, BAT_BASE_Y + 0.528, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial color={secondaryColor} flatShading />
      </mesh>
      {([-0.26, 0.26] as const).map((bx, idx) => (
        <mesh key={idx} position={[bx, BAT_BASE_Y + 0.485, 0]}>
          <boxGeometry args={[0.055, 0.036, 0.12]} />
          <meshStandardMaterial color={METAL_DARK} flatShading />
        </mesh>
      ))}
      <mesh position={[0, BAT_BASE_Y + 0.552, 0]}>
        <boxGeometry args={[0.26, 0.026, 0.12]} />
        <meshStandardMaterial
          color={MINT_GREEN}
          emissive={MINT_GREEN}
          emissiveIntensity={chargeIntensity}
          flatShading
        />
      </mesh>

      {/* High-voltage side conduit */}
      <mesh geometry={BATTERY_GEO.hvConduit}>
        <meshStandardMaterial color={SAFETY_ORANGE} flatShading />
      </mesh>

      {/* Front & rear charge controller panels with stacked mint-green charge bars */}
      {([-1, 1] as const).map((dir) => (
        <group key={dir} position={[0, BAT_BASE_Y + 0.175, dir * 0.255]}>
          <mesh>
            <boxGeometry args={[0.22, 0.21, 0.05]} />
            <meshStandardMaterial color={METAL_DARK} flatShading />
          </mesh>
          {([-0.055, 0, 0.055] as const).map((barY, barIdx) => (
            <mesh key={barIdx} position={[0, barY, dir * 0.028]}>
              <boxGeometry args={[0.145, 0.034, 0.016]} />
              <meshStandardMaterial
                color={MINT_GREEN}
                emissive={MINT_GREEN}
                emissiveIntensity={chargeIntensity}
                flatShading
              />
            </mesh>
          ))}
        </group>
      ))}
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
          {
            pos: [0, 0.205, viewportFrameOffset] as const,
            rotY: 0,
            glass: [0, 0.205, viewportGlassOffset] as const,
          },
          {
            pos: [0, 0.205, -viewportFrameOffset] as const,
            rotY: 0,
            glass: [0, 0.205, -viewportGlassOffset] as const,
          },
          {
            pos: [-viewportFrameOffset, 0.205, 0] as const,
            rotY: Math.PI / 2,
            glass: [-viewportGlassOffset, 0.205, 0] as const,
          },
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

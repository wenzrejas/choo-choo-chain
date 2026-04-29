import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../store/gameStore'
import type { ObstacleEntity } from '../../types'

// ─── Materials ────────────────────────────────────────────────────────────────
const MAT = (color: string) =>
  new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 })

const trunkMat   = MAT('#a0522d')
const leafMat1   = MAT('#4caf50')
const leafMat2   = MAT('#388e3c')
const bushMat    = MAT('#66bb6a')
const bushMat2   = MAT('#57a05a')
const boulderMat  = MAT('#9e9e9e')
const boulderMat2 = MAT('#bdbdbd')

// ─── Geometries ───────────────────────────────────────────────────────────────
const trunkGeo   = new THREE.CylinderGeometry(0.14, 0.2, 1.0, 8)
const canopyGeo  = new THREE.SphereGeometry(0.72, 8, 7)
const canopyGeo2 = new THREE.SphereGeometry(0.52, 8, 7)
const bushGeo    = new THREE.SphereGeometry(0.55, 8, 6)
const boulderGeo = new THREE.DodecahedronGeometry(0.6, 0)

// ─── Instance budget ─────────────────────────────────────────────────────────
// ZONE_RADIUS=8 → 289 zones × up to 4 obstacles each = ~1156 max.
// Rough thirds per type; bush1 holds 2 instances per bush (center + left sphere).
const MAX_TREES    = 500
const MAX_BUSHES   = 500
const MAX_BOULDERS = 500

const _dummy = new THREE.Object3D()

// ─── ObstacleInstances ────────────────────────────────────────────────────────
// Renders ALL non-destroyed obstacles in exactly 7 draw calls:
//   tree  → trunk + canopy + canopy_top
//   bush  → bush_center/left (bushMat) + bush_right (bushMat2)
//   boulder → rock_main + rock_pebble
// Matrices are rebuilt only when the obstacles array reference changes.
export function ObstacleInstances(): null {
  const { scene } = useThree()

  const trunkRef   = useRef<THREE.InstancedMesh | null>(null)
  const canopy1Ref = useRef<THREE.InstancedMesh | null>(null)
  const canopy2Ref = useRef<THREE.InstancedMesh | null>(null)
  // bush1: bushMat — centre sphere (scale 1) + left sphere (scale 0.68)
  const bush1Ref   = useRef<THREE.InstancedMesh | null>(null)
  // bush2: bushMat2 — right sphere (scale 0.78)
  const bush2Ref   = useRef<THREE.InstancedMesh | null>(null)
  const rock1Ref   = useRef<THREE.InstancedMesh | null>(null)
  const rock2Ref   = useRef<THREE.InstancedMesh | null>(null)

  const prevObstaclesRef = useRef<ObstacleEntity[] | null>(null)

  useEffect(() => {
    const trunk   = new THREE.InstancedMesh(trunkGeo,   trunkMat,    MAX_TREES)
    const canopy1 = new THREE.InstancedMesh(canopyGeo,  leafMat1,    MAX_TREES)
    const canopy2 = new THREE.InstancedMesh(canopyGeo2, leafMat2,    MAX_TREES)
    const bush1   = new THREE.InstancedMesh(bushGeo,    bushMat,     MAX_BUSHES * 2)
    const bush2   = new THREE.InstancedMesh(bushGeo,    bushMat2,    MAX_BUSHES)
    const rock1   = new THREE.InstancedMesh(boulderGeo, boulderMat,  MAX_BOULDERS)
    const rock2   = new THREE.InstancedMesh(boulderGeo, boulderMat2, MAX_BOULDERS)

    const all = [trunk, canopy1, canopy2, bush1, bush2, rock1, rock2]
    all.forEach(m => {
      m.count         = 0
      m.castShadow    = true
      m.receiveShadow = true
      m.frustumCulled = false
    })

    scene.add(...all)
    trunkRef.current   = trunk
    canopy1Ref.current = canopy1
    canopy2Ref.current = canopy2
    bush1Ref.current   = bush1
    bush2Ref.current   = bush2
    rock1Ref.current   = rock1
    rock2Ref.current   = rock2

    return () => {
      scene.remove(...all)
      trunkRef.current = canopy1Ref.current = canopy2Ref.current =
        bush1Ref.current = bush2Ref.current = rock1Ref.current = rock2Ref.current = null
    }
  }, [scene])

  useFrame(() => {
    const trunk   = trunkRef.current
    const canopy1 = canopy1Ref.current
    const canopy2 = canopy2Ref.current
    const bush1   = bush1Ref.current
    const bush2   = bush2Ref.current
    const rock1   = rock1Ref.current
    const rock2   = rock2Ref.current
    if (!trunk || !canopy1 || !canopy2 || !bush1 || !bush2 || !rock1 || !rock2) return

    const obstacles = useGameStore.getState().obstacles
    // Zustand produces a new array reference on every mutation — O(1) check.
    if (obstacles === prevObstaclesRef.current) return
    prevObstaclesRef.current = obstacles

    let treeI = 0, bush1I = 0, bush2I = 0, boulderI = 0

    for (const obs of obstacles) {
      if (obs.destroyed) continue
      const { x, z } = obs.position
      const ry = obs.rotation
      const v  = obs.variant

      if (obs.type === 'tree') {
        // Variant shape: [scaleXZ, scaleY, canopy1YOffset, canopy1Scale, canopy2YOffset, canopy2Scale]
        const [sxz, sy, c1dy, c1s, c2dy, c2s] =
          v === 1 ? [0.75, 1.40, 0.38, 0.60, 0.56, 0.44]   // tall & thin
        : v === 2 ? [1.30, 0.70, 0.60, 0.95, 0.52, 0.68]   // short & wide
        :           [1.00, 1.00, 0.50, 0.72, 0.60, 0.52]    // standard

        const trunkY  = 0.5 * sy   // half height above ground
        const trunkTop = sy         // top of trunk in world Y

        _dummy.position.set(x, trunkY, z)
        _dummy.rotation.set(0, ry, 0)
        _dummy.scale.set(sxz, sy, sxz)
        _dummy.updateMatrix()
        trunk.setMatrixAt(treeI, _dummy.matrix)

        _dummy.position.set(x, trunkTop + c1dy, z)
        _dummy.scale.setScalar(c1s)
        _dummy.updateMatrix()
        canopy1.setMatrixAt(treeI, _dummy.matrix)

        _dummy.position.set(x, trunkTop + c1dy + c2dy, z)
        _dummy.scale.setScalar(c2s)
        _dummy.updateMatrix()
        canopy2.setMatrixAt(treeI, _dummy.matrix)

        treeI++
      } else if (obs.type === 'bush') {
        // Sphere configs per variant: [dx, dy, dz, scale] for center, left, right
        // dx/dz are local offsets that get rotated by ry
        const [c, l, r] =
          v === 1
            ? [[0.00, 0.52, 0.10, 1.10], [-0.50, 0.32, -0.15, 0.72], [ 0.38, 0.40, -0.20, 0.65]]
          : v === 2
            ? [[-0.15, 0.38, 0.00, 0.85], [ 0.40, 0.35,  0.30, 0.80], [ 0.55, 0.42, -0.25, 0.60]]
          :   [[ 0.00, 0.48, 0.00, 1.00], [-0.36, 0.36,  0.22, 0.68], [ 0.44, 0.38,  0.10, 0.78]]

        const cosR = Math.cos(ry), sinR = Math.sin(ry)

        // Centre sphere → bush1
        _dummy.position.set(x + c[0] * cosR - c[2] * sinR, c[1], z + c[0] * sinR + c[2] * cosR)
        _dummy.rotation.set(0, ry, 0)
        _dummy.scale.setScalar(c[3])
        _dummy.updateMatrix()
        bush1.setMatrixAt(bush1I++, _dummy.matrix)

        // Left sphere → bush1
        _dummy.position.set(x + l[0] * cosR - l[2] * sinR, l[1], z + l[0] * sinR + l[2] * cosR)
        _dummy.scale.setScalar(l[3])
        _dummy.updateMatrix()
        bush1.setMatrixAt(bush1I++, _dummy.matrix)

        // Right sphere → bush2
        _dummy.position.set(x + r[0] * cosR - r[2] * sinR, r[1], z + r[0] * sinR + r[2] * cosR)
        _dummy.scale.setScalar(r[3])
        _dummy.updateMatrix()
        bush2.setMatrixAt(bush2I++, _dummy.matrix)
      } else if (obs.type === 'boulder') {
        if (v === 1) {
          // Two medium boulders side by side
          _dummy.position.set(x - 0.25, 0.36, z)
          _dummy.rotation.set(0.30, ry,        0.10)
          _dummy.scale.setScalar(0.85)
          _dummy.updateMatrix()
          rock1.setMatrixAt(boulderI, _dummy.matrix)

          _dummy.position.set(x + 0.30, 0.30, z + 0.15)
          _dummy.rotation.set(0.10, ry + 0.8,  0.50)
          _dummy.scale.setScalar(0.75)
          _dummy.updateMatrix()
          rock2.setMatrixAt(boulderI, _dummy.matrix)
        } else if (v === 2) {
          // Large boulder + tiny pebble tucked behind
          _dummy.position.set(x, 0.50, z)
          _dummy.rotation.set(0.40, ry,        0.20)
          _dummy.scale.setScalar(1.15)
          _dummy.updateMatrix()
          rock1.setMatrixAt(boulderI, _dummy.matrix)

          _dummy.position.set(x - 0.30, 0.22, z - 0.40)
          _dummy.rotation.set(0.80, ry + 1.2,  0.30)
          _dummy.scale.setScalar(0.35)
          _dummy.updateMatrix()
          rock2.setMatrixAt(boulderI, _dummy.matrix)
        } else {
          // Standard: main boulder + pebble
          _dummy.position.set(x, 0.42, z)
          _dummy.rotation.set(0.20, ry,        0.15)
          _dummy.scale.setScalar(1)
          _dummy.updateMatrix()
          rock1.setMatrixAt(boulderI, _dummy.matrix)

          _dummy.position.set(x + 0.50, 0.32, z + 0.30)
          _dummy.rotation.set(0.50, ry + 0.2,  0.80)
          _dummy.scale.setScalar(0.45)
          _dummy.updateMatrix()
          rock2.setMatrixAt(boulderI, _dummy.matrix)
        }
        boulderI++
      }
    }

    trunk.count   = canopy1.count = canopy2.count = treeI
    bush1.count   = bush1I
    bush2.count   = bush2I
    rock1.count   = rock2.count = boulderI

    trunk.instanceMatrix.needsUpdate   = true
    canopy1.instanceMatrix.needsUpdate = true
    canopy2.instanceMatrix.needsUpdate = true
    bush1.instanceMatrix.needsUpdate   = true
    bush2.instanceMatrix.needsUpdate   = true
    rock1.instanceMatrix.needsUpdate   = true
    rock2.instanceMatrix.needsUpdate   = true
  })

  return null
}

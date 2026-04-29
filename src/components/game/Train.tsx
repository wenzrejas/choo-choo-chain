import { useRef, useEffect, type JSX } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { useGameStore } from '../../store/gameStore'
import {
  trainPosRef,
  trainAngleRef,
  trainPrevAngleRef,
  trainSpeedRef,
  trainHistoryRef,
  trainTailLenRef,
} from '../../trainState'
import {
  TRAIN_BASE_SPEED,
  TRAIN_BOOST_SPEED,
  TRAIN_STEER_STRENGTH,
  TRAIN_SEGMENT_GAP,
  ENERGY_DRAIN_RATE,
  COLLISION_RADII,
  WAGON_COLORS,
} from '../../utils/constants'
import { angleDelta, distXZ, distXZRaw } from '../../utils/math'
import type { MouseNDC, WagonType } from '../../types'
import {
  sfxWagonCollect,
  sfxObstacleHit,
  sfxGameOver,
  sfxPowerup,
  sfxShieldActivate,
  sfxClockBonus,
  sfxBoostStart,
} from '../../audio/sfx'

// ─── Tail history parameters ──────────────────────────────────────────────────
const SAMPLES_PER_GAP     = 10
const SAMPLE_STEP         = TRAIN_SEGMENT_GAP / SAMPLES_PER_GAP
const HISTORY_PER_SEGMENT = SAMPLES_PER_GAP
const MAX_TAIL            = 80

// ─── Shared geometry / materials (module-level, never recreated) ──────────────
const LOCO_GEO    = new THREE.BoxGeometry(0.9, 0.7, 1.6)
const SEG_GEO     = new THREE.BoxGeometry(0.8, 0.55, 1.1)
const WHEEL_GEO   = new THREE.CylinderGeometry(0.13, 0.13, 0.12, 8)
const CHIMNEY_GEO = new THREE.CylinderGeometry(0.11, 0.15, 0.38, 8)

// ── Kenney-style materials: flat matte, roughness 1, metalness 0 ──────────────
// Locomotive body: bold Kenney red — same hue as the iconic Kenney train kit
const LOCO_MAT    = new THREE.MeshStandardMaterial({ color: '#e53935', roughness: 1, metalness: 0 })
// Roof stripe / cab — slightly darker red for contrast
const ROOF_MAT    = new THREE.MeshStandardMaterial({ color: '#b71c1c', roughness: 1, metalness: 0 })
// Wheels: dark charcoal — still readable against bright ground
const WHEEL_MAT   = new THREE.MeshStandardMaterial({ color: '#424242', roughness: 1, metalness: 0 })
// Chimney: near-black to pop against the bright scene
const CHIMNEY_MAT = new THREE.MeshStandardMaterial({ color: '#212121', roughness: 1, metalness: 0 })
// Cabin windows: cream/off-white
const WINDOW_MAT  = new THREE.MeshStandardMaterial({ color: '#fff9c4', roughness: 1, metalness: 0 })

/**
 * White base for per-instance colour via setColorAt().
 * Flat matte — no specular highlights on the snake tail.
 */
const SEG_MAT = new THREE.MeshStandardMaterial({
  color:     '#ffffff',
  roughness: 1,
  metalness: 0,
})

// Pre-built colour objects (avoids per-frame allocation)
const SEGMENT_COLORS: Record<WagonType, THREE.Color> = {
  copper: new THREE.Color(WAGON_COLORS.copper),
  silver: new THREE.Color(WAGON_COLORS.silver),
  gold:   new THREE.Color(WAGON_COLORS.gold),
}

// Module-level scratch objects (never reallocated)
const _dummy       = new THREE.Object3D()
const _raycaster   = new THREE.Raycaster()
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _mouseWorld  = new THREE.Vector3()

// ─── Locomotive visual ────────────────────────────────────────────────────────
interface LocoProps {
  groupRef:     React.RefObject<THREE.Group>
  shieldActive: boolean
}

function Locomotive({ groupRef, shieldActive }: LocoProps): JSX.Element {
  const wheelPositions: [number, number][] = [
    [-0.42, 0.38], [0.42, 0.38], [-0.42, -0.38], [0.42, -0.38],
  ]
  return (
    <group ref={groupRef}>
      {/* Main body — bold Kenney red */}
      <mesh geometry={LOCO_GEO} material={LOCO_MAT} castShadow receiveShadow />

      {/* Darker red roof stripe for visual depth */}
      <mesh material={ROOF_MAT} position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.88, 0.08, 1.58]} />
      </mesh>

      {/* Cabin / cab — rear section slightly taller */}
      <mesh material={ROOF_MAT} position={[0, 0.5, -0.36]} castShadow>
        <boxGeometry args={[0.72, 0.28, 0.72]} />
      </mesh>

      {/* Cabin window — cream rectangle */}
      <mesh material={WINDOW_MAT} position={[0, 0.52, -0.73]}>
        <boxGeometry args={[0.42, 0.22, 0.04]} />
      </mesh>

      {/* Chimney */}
      <mesh geometry={CHIMNEY_GEO} material={CHIMNEY_MAT} position={[0, 0.62, 0.46]} castShadow />

      {/* Boiler front bump */}
      <mesh material={LOCO_MAT} position={[0, 0.1, 0.72]} castShadow>
        <boxGeometry args={[0.6, 0.32, 0.18]} />
      </mesh>

      {/* Wheels */}
      {wheelPositions.map(([x, z], i) => (
        <mesh
          key={i}
          geometry={WHEEL_GEO}
          material={WHEEL_MAT}
          position={[x, -0.3, z]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        />
      ))}

      {/* Shield bubble — kept simple, orange wireframe reads clearly on bright scene */}
      {shieldActive && (
        <mesh>
          <sphereGeometry args={[1.35, 16, 16]} />
          <meshStandardMaterial color="#ff8800" transparent opacity={0.18} wireframe />
        </mesh>
      )}
    </group>
  )
}

// ─── Train ────────────────────────────────────────────────────────────────────
interface TrainProps {
  mouseRef: React.MutableRefObject<MouseNDC>
}

export default function Train({ mouseRef }: TrainProps): JSX.Element {
  const { camera, scene } = useThree()

  // ── Refs owned entirely by this component ─────────────────────────────────
  const groupRef      = useRef<THREE.Group>(null)
  const instanceRef   = useRef<THREE.InstancedMesh | null>(null)
  const posRef        = useRef(new THREE.Vector3(0, 0.4, 0))
  const angleRef      = useRef(0)
  const historyRef    = useRef<THREE.Vector3[]>([])
  const lastSampleRef = useRef(new THREE.Vector3(0, 0.4, 0))

  // ── Sfx edge-detection refs (track previous values) ──────────────────────
  const prevBoostRef  = useRef(false)
  const prevShieldRef = useRef(false)

  // ── React subscription for shield visual only (Locomotive re-render) ──────
  // We intentionally limit React subscriptions to values that drive JSX.
  // Everything else is read from useGameStore.getState() inside useFrame.
  const shieldActive = useGameStore((s) => s.shieldActive)

  // ── Imperative InstancedMesh — never put in JSX ───────────────────────────
  //
  // Root cause of the disappearing tail: putting <instancedMesh args={[...]} />
  // in JSX creates a NEW array literal every render. R3F compares the array
  // reference, sees it changed, and RECONSTRUCTS the InstancedMesh — wiping
  // all instance matrices back to identity (world origin) for that frame.
  //
  // By creating and managing the mesh ourselves we bypass R3F reconciliation
  // entirely. The mesh is added to the scene once and never touched by React.
  useEffect(() => {
    const mesh = new THREE.InstancedMesh(SEG_GEO, SEG_MAT, MAX_TAIL)
    mesh.count        = 0
    mesh.castShadow   = true
    // Frustum cull disabled — tail segments move each frame; letting Three.js
    // cull them based on a stale bounding box causes intermittent disappearing.
    mesh.frustumCulled = false

    scene.add(mesh)
    instanceRef.current = mesh

    return () => {
      scene.remove(mesh)
      instanceRef.current = null
    }
  }, [scene])

  // ── Frame loop ────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!groupRef.current) return

    // ── Read ALL dynamic game state fresh from the store ───────────────────
    //
    // Root cause #2: values from useGameStore((s) => s.x) are stale closures
    // bound at the last React render. Between renders, collectWagon / store
    // mutations have already run but the closure hasn't updated yet.
    //
    // useGameStore.getState() always returns the live store state — no
    // closures, no stale reads, no React scheduler involvement.
    const {
      isBoosting,
      tailTypes,
      wagons,
      obstacles,
      powerups,
      drainEnergy,
      tickTimer,
      collectWagon,
      collectPowerup,
      destroyObstacle,
      triggerGameOver,
    } = useGameStore.getState()

    const tailLength = tailTypes.length
    const dt         = Math.min(delta, 0.05)

    // ── 1. Clock & energy ─────────────────────────────────────────────────
    tickTimer(dt)
    if (isBoosting) drainEnergy(ENERGY_DRAIN_RATE * dt)

    // ── 2. Sfx edge detection (boost / shield) ────────────────────────────
    const shieldNow = useGameStore.getState().shieldActive
    if (isBoosting && !prevBoostRef.current)  sfxBoostStart()
    if (shieldNow  && !prevShieldRef.current) sfxShieldActivate()
    prevBoostRef.current  = isBoosting
    prevShieldRef.current = shieldNow

    // ── 3. Steer toward mouse ─────────────────────────────────────────────
    _raycaster.setFromCamera(mouseRef.current, camera)
    _raycaster.ray.intersectPlane(_groundPlane, _mouseWorld)

    const dx = _mouseWorld.x - posRef.current.x
    const dz = _mouseWorld.z - posRef.current.z
    if (Math.abs(dx) + Math.abs(dz) > 0.2) {
      const targetAngle = Math.atan2(dx, dz)
      angleRef.current += angleDelta(angleRef.current, targetAngle) * TRAIN_STEER_STRENGTH * dt
    }

    // ── 4. Move forward ───────────────────────────────────────────────────
    const speed = isBoosting ? TRAIN_BOOST_SPEED : TRAIN_BASE_SPEED
    posRef.current.x += Math.sin(angleRef.current) * speed * dt
    posRef.current.z += Math.cos(angleRef.current) * speed * dt
    posRef.current.y  = 0.4

    // ── 5. Record position history (distance-based) ───────────────────────
    if (posRef.current.distanceTo(lastSampleRef.current) >= SAMPLE_STEP) {
      historyRef.current.unshift(posRef.current.clone())
      lastSampleRef.current.copy(posRef.current)
      // Keep enough history for ALL current segments (use live tailLength)
      const needed = (tailLength + 2) * HISTORY_PER_SEGMENT + 8
      if (historyRef.current.length > needed) {
        historyRef.current.length = needed
      }
    }

    // ── 6. Update locomotive transform ────────────────────────────────────
    groupRef.current.position.copy(posRef.current)
    groupRef.current.rotation.y = angleRef.current

    // ── 7. Sync shared module-level refs ──────────────────────────────────
    trainPrevAngleRef.current  = trainAngleRef.current
    trainPosRef.current.copy(posRef.current)
    trainAngleRef.current   = angleRef.current
    trainSpeedRef.current   = speed
    trainHistoryRef.current = historyRef.current
    trainTailLenRef.current = tailLength

    // ── 8. Drive tail segment instances ───────────────────────────────────
    const mesh    = instanceRef.current
    const history = historyRef.current

    if (mesh) {
      // Set count first — always, even if 0 — using the LIVE tailLength.
      // This is the authoritative write; nothing else touches mesh.count.
      mesh.count = tailLength

      for (let i = 0; i < tailLength; i++) {
        const idx     = (i + 1) * HISTORY_PER_SEGMENT
        const prevIdx = i       * HISTORY_PER_SEGMENT

        const segPos  = history[idx]     ?? history[history.length - 1] ?? posRef.current
        const prevPos = history[prevIdx] ?? posRef.current

        const faceAngle = Math.atan2(prevPos.x - segPos.x, prevPos.z - segPos.z)

        _dummy.position.set(segPos.x, 0.35, segPos.z)
        _dummy.rotation.set(0, faceAngle, 0)
        _dummy.updateMatrix()
        mesh.setMatrixAt(i, _dummy.matrix)

        // tailTypes[i] is read from live store state — never stale
        mesh.setColorAt(i, SEGMENT_COLORS[tailTypes[i]])
      }

      if (tailLength > 0) {
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      }
    }

    // ── 9. Collision: wagons ──────────────────────────────────────────────
    for (const w of wagons) {
      if (distXZRaw(posRef.current, w.position) <
          COLLISION_RADII.wagon + COLLISION_RADII.trainHead) {
        sfxWagonCollect(w.type)
        collectWagon(w.id, w.type)
        break
      }
    }

    // ── 10. Collision: power-ups ──────────────────────────────────────────
    for (const p of powerups) {
      if (distXZRaw(posRef.current, p.position) <
          COLLISION_RADII.powerup + COLLISION_RADII.trainHead) {
        if (p.type === 'energy')      sfxPowerup('energy')
        else if (p.type === 'clock')  sfxClockBonus()
        else if (p.type === 'shield') sfxShieldActivate()
        collectPowerup(p.id, p.type)
        break
      }
    }

    // ── 11. Collision: obstacles ──────────────────────────────────────────
    for (const o of obstacles) {
      if (o.destroyed) continue
      if (distXZRaw(posRef.current, o.position) <
          COLLISION_RADII.obstacle + COLLISION_RADII.trainHead) {
        if (shieldNow) {
          sfxObstacleHit()
          destroyObstacle(o.id)
        } else {
          sfxGameOver()
          triggerGameOver()
          return
        }
        break
      }
    }

    // ── 12. Self-collision ────────────────────────────────────────────────
    const gracePeriod = Math.max(3, Math.min(6, Math.floor(tailLength * 0.25)))
    for (let i = gracePeriod; i < tailLength; i++) {
      const segPos = history[(i + 1) * HISTORY_PER_SEGMENT]
      if (!segPos) continue
      if (distXZ(posRef.current, segPos) <
          COLLISION_RADII.trainHead + COLLISION_RADII.segment) {
        sfxGameOver()
        triggerGameOver()
        return
      }
    }
  })

  // Only the locomotive uses JSX — the InstancedMesh is managed imperatively
  // above and never appears here, so R3F can never reconcile or reconstruct it.
  return <Locomotive groupRef={groupRef} shieldActive={shieldActive} />
}

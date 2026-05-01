import { useRef, useEffect, useLayoutEffect, type JSX } from 'react'
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
  cameraShakeRef,
} from '../../trainState'
import {
  TRAIN_BASE_SPEED,
  TRAIN_BOOST_SPEED,
  TRAIN_STEER_STRENGTH,
  TRAIN_SEGMENT_GAP,
  ENERGY_DRAIN_RATE,
  ENERGY_REGEN_RATE,
  COLLISION_RADII,
} from '../../utils/constants'
import { angleDelta, distXZ, distXZRaw } from '../../utils/math'
import type { MouseNDC } from '../../types'
import {
  sfxWagonCollect,
  sfxObstacleHit,
  sfxGameOver,
  sfxPowerup,
  sfxShieldActivate,
  sfxClockBonus,
} from '../../audio/sfx'
import { TrainHead } from '../models/TrainHead'
import { useWagonGLTF, TYPE_COLORS, cargoInstanceMat } from '../models/Wagon'

// ─── Tail history parameters ──────────────────────────────────────────────────
const SAMPLES_PER_GAP     = 10
const SAMPLE_STEP         = TRAIN_SEGMENT_GAP / SAMPLES_PER_GAP
const HISTORY_PER_SEGMENT = SAMPLES_PER_GAP
const MAX_TAIL            = 80

// Module-level scratch objects (never reallocated)
const _dummy       = new THREE.Object3D()
const _raycaster   = new THREE.Raycaster()
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _mouseWorld  = new THREE.Vector3()

// ─── Train ────────────────────────────────────────────────────────────────────
interface TrainProps {
  mouseRef: React.RefObject<MouseNDC>
}

export default function Train({ mouseRef }: TrainProps): JSX.Element {
  const { camera, scene } = useThree()

  const { nodes, materials } = useWagonGLTF()

  // ── Refs owned entirely by this component ─────────────────────────────────
  const groupRef   = useRef<THREE.Group>(null)
  const bodyRef    = useRef<THREE.InstancedMesh | null>(null)
  const wfRef      = useRef<THREE.InstancedMesh | null>(null)
  const wbRef      = useRef<THREE.InstancedMesh | null>(null)
  const cargoRef   = useRef<THREE.InstancedMesh | null>(null)
  const posRef     = useRef(new THREE.Vector3(0, 0.4, 0))
  const angleRef      = useRef(0)
  const historyRef    = useRef<THREE.Vector3[]>([])
  const lastSampleRef = useRef(new THREE.Vector3(0, 0.4, 0))

  // Reset module-level shared refs on each new game session so FollowCamera
  // snaps to the correct spawn position instead of the stale last-game position.
  // useLayoutEffect fires after React commits but before the first useFrame.
  useLayoutEffect(() => {
    trainPosRef.current.copy(posRef.current)
    trainAngleRef.current     = angleRef.current
    trainPrevAngleRef.current = angleRef.current
    trainSpeedRef.current     = 0
    trainHistoryRef.current   = []
    trainTailLenRef.current   = 0
  }, [])

  // ── React subscription for shield visual only (Locomotive re-render) ──────
  // We intentionally limit React subscriptions to values that drive JSX.
  // Everything else is read from useGameStore.getState() inside useFrame.
  const shieldActive = useGameStore((s) => s.shieldActive)

  // ── Imperative InstancedMeshes — never put in JSX ────────────────────────
  //
  // Root cause of the disappearing tail: putting <instancedMesh args={[...]} />
  // in JSX creates a NEW array literal every render. R3F compares the array
  // reference, sees it changed, and RECONSTRUCTS the InstancedMesh — wiping
  // all instance matrices back to identity (world origin) for that frame.
  //
  // By creating and managing the meshes ourselves we bypass R3F reconciliation
  // entirely. Four meshes render the full wagon model per tail segment:
  // body, wheels-front, wheels-back, cargo (type-coloured via setColorAt).
  useEffect(() => {
    const body  = new THREE.InstancedMesh(nodes['train-carriage-dirt_1'].geometry, materials.colormap, MAX_TAIL)
    const wf    = new THREE.InstancedMesh(nodes['wheels-front'].geometry,          materials.colormap, MAX_TAIL)
    const wb    = new THREE.InstancedMesh(nodes['wheels-back'].geometry,           materials.colormap, MAX_TAIL)
    const cargo = new THREE.InstancedMesh(nodes.cargo.geometry,                    cargoInstanceMat,   MAX_TAIL)

    ;[body, wf, wb, cargo].forEach(m => {
      m.count         = 0
      m.castShadow    = true
      // Frustum cull disabled — segments move each frame; stale bounding box
      // causes intermittent disappearing.
      m.frustumCulled = false
    })

    scene.add(body, wf, wb, cargo)
    bodyRef.current  = body
    wfRef.current    = wf
    wbRef.current    = wb
    cargoRef.current = cargo

    return () => {
      scene.remove(body, wf, wb, cargo)
      bodyRef.current = wfRef.current = wbRef.current = cargoRef.current = null
    }
  }, [scene, nodes, materials.colormap])

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
      addEnergy,
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
    addEnergy(ENERGY_REGEN_RATE * dt)

    // ── 2. Steer toward mouse ─────────────────────────────────────────────
    _raycaster.setFromCamera(mouseRef.current as THREE.Vector2, camera)
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
      lastSampleRef.current.copy(posRef.current)
      const needed = (tailLength + 2) * HISTORY_PER_SEGMENT + 8
      // Recycle the oldest entry when at capacity — avoids allocating a new
      // Vector3 every sample (which at base speed fires every frame at 60fps).
      let sample: THREE.Vector3
      if (historyRef.current.length >= needed) {
        sample = historyRef.current.pop()!
        if (historyRef.current.length >= needed - 1) historyRef.current.length = needed - 1
      } else {
        sample = new THREE.Vector3()
      }
      sample.copy(posRef.current)
      historyRef.current.unshift(sample)
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
    const body    = bodyRef.current
    const wf      = wfRef.current
    const wb      = wbRef.current
    const cargo   = cargoRef.current
    const history = historyRef.current

    if (body && wf && wb && cargo) {
      // Set count first — always, even if 0 — using the LIVE tailLength.
      // This is the authoritative write; nothing else touches these counts.
      body.count = wf.count = wb.count = cargo.count = tailLength

      for (let i = 0; i < tailLength; i++) {
        const idx     = (i + 1) * HISTORY_PER_SEGMENT
        const prevIdx = i       * HISTORY_PER_SEGMENT

        const segPos  = history[idx]     ?? history[history.length - 1] ?? posRef.current
        const prevPos = history[prevIdx] ?? posRef.current

        const faceAngle = Math.atan2(prevPos.x - segPos.x, prevPos.z - segPos.z)
        const sy        = Math.sin(faceAngle)
        const cy        = Math.cos(faceAngle)

        // All wagon parts share scale 0.7 — matches TrainHead scale
        _dummy.scale.setScalar(0.7)

        // Body
        _dummy.position.set(segPos.x, 0, segPos.z)
        _dummy.rotation.set(0, faceAngle, 0)
        _dummy.updateMatrix()
        body.setMatrixAt(i, _dummy.matrix)

        // Wheels-front: offset (0, 0.359, 0.6) × 0.7 → world Y = 0.4 + 0.251
        _dummy.position.set(segPos.x + 0.42 * sy, 0.251, segPos.z + 0.42 * cy)
        _dummy.updateMatrix()
        wf.setMatrixAt(i, _dummy.matrix)

        // Wheels-back: offset (0, 0.359, -0.6) × 0.7
        _dummy.position.set(segPos.x - 0.42 * sy, 0.251, segPos.z - 0.42 * cy)
        _dummy.updateMatrix()
        wb.setMatrixAt(i, _dummy.matrix)

        // Cargo: offset (0, 1.298, 0) × 0.7 → world Y = 0.4 + 0.909
        _dummy.position.set(segPos.x, 0.909, segPos.z)
        _dummy.updateMatrix()
        cargo.setMatrixAt(i, _dummy.matrix)

        // tailTypes[i] is read from live store state — never stale
        cargo.setColorAt(i, TYPE_COLORS[tailTypes[i]])
      }

      if (tailLength > 0) {
        body.instanceMatrix.needsUpdate  = true
        wf.instanceMatrix.needsUpdate    = true
        wb.instanceMatrix.needsUpdate    = true
        cargo.instanceMatrix.needsUpdate = true
        if (cargo.instanceColor) cargo.instanceColor.needsUpdate = true
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
    const shieldActive = useGameStore.getState().shieldActive
    for (const o of obstacles) {
      if (o.destroyed) continue
      if (distXZRaw(posRef.current, o.position) <
          COLLISION_RADII.obstacle + COLLISION_RADII.trainHead) {
        if (shieldActive) {
          sfxObstacleHit()
          destroyObstacle(o.id)
          cameraShakeRef.current = 1.0
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
  return <TrainHead groupRef={groupRef} shieldActive={shieldActive} />
}

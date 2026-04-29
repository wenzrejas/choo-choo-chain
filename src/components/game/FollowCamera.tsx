import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  CAMERA_DISTANCE,
  CAMERA_HEIGHT,
  CAMERA_POS_LAG,
  CAMERA_LOOK_LAG,
  CAMERA_LOOK_AHEAD,
  CAMERA_ROLL_STRENGTH,
  CAMERA_ROLL_LAG,
  CAMERA_BASE_FOV,
  CAMERA_BOOST_FOV,
  CAMERA_FOV_LAG,
  TRAIN_BOOST_SPEED,
  TRAIN_BASE_SPEED,
} from '../../utils/constants'
import {
  trainPosRef,
  trainAngleRef,
  trainPrevAngleRef,
  trainSpeedRef,
} from '../../trainState'
import { angleDelta } from '../../utils/math'

// ─── Module-level scratch vectors (never reallocated) ─────────────────────────
const _desiredPos = new THREE.Vector3()
const _lookTarget = new THREE.Vector3()
const _upVec      = new THREE.Vector3()

export default function FollowCamera(): null {
  const { camera } = useThree()

  const smoothLookRef = useRef(new THREE.Vector3())
  const rollRef       = useRef(0)
  const readyRef      = useRef(false)

  useFrame((_, delta) => {
    const dt    = Math.min(Math.max(delta, 0.001), 0.05) // clamp: never 0, never huge
    const pos   = trainPosRef.current
    const angle = trainAngleRef.current
    const speed = trainSpeedRef.current

    // ── 1. Desired camera position ─────────────────────────────────────────
    // Sit behind and slightly above the locomotive.
    // Height drops a tiny bit at full boost — lower horizon = faster feel.
    const speedRatio    = speed / TRAIN_BOOST_SPEED
    const dynamicHeight = CAMERA_HEIGHT - speedRatio * 0.8

    _desiredPos.set(
      pos.x - Math.sin(angle) * CAMERA_DISTANCE,
      pos.y + dynamicHeight,
      pos.z - Math.cos(angle) * CAMERA_DISTANCE,
    )

    // ── 2. Look-at target ──────────────────────────────────────────────────
    // Placed ahead of the train so the player sees what's coming,
    // not the back of the locomotive.
    _lookTarget.set(
      pos.x + Math.sin(angle) * CAMERA_LOOK_AHEAD,
      pos.y + 0.6,
      pos.z + Math.cos(angle) * CAMERA_LOOK_AHEAD,
    )

    // ── 3. Snap on the very first frame ───────────────────────────────────
    if (!readyRef.current) {
      camera.position.copy(_desiredPos)
      smoothLookRef.current.copy(_lookTarget)
      readyRef.current = true
    } else {
      camera.position.lerp(_desiredPos, CAMERA_POS_LAG)
      smoothLookRef.current.lerp(_lookTarget, CAMERA_LOOK_LAG)
    }

    // ── 4. Cinematic roll ─────────────────────────────────────────────────
    // Use the raw per-frame angle delta — no division by dt — so there is
    // no NaN risk from a near-zero first-frame dt.
    //
    // angleDelta gives the shortest arc (handles wrap-around).
    // Multiply by a large constant to convert "radians per frame" to a
    // visible roll range; the exponential smooth damps it naturally.
    const perFrameDelta = angleDelta(trainPrevAngleRef.current, angle)
    const targetRoll    = -perFrameDelta * CAMERA_ROLL_STRENGTH * 60 // 60 = tuning scale
    rollRef.current    += (targetRoll - rollRef.current) * CAMERA_ROLL_LAG

    // Build a rolled-up vector analytically from the train's yaw angle.
    // right = (cos A, 0, -sin A)  when forward = (sin A, 0, cos A)
    // rolledUp = cos(roll)·(0,1,0) + sin(roll)·right
    const roll = rollRef.current
    _upVec.set(
       Math.cos(angle) * Math.sin(roll),   // right.x * sin(roll)
       Math.cos(roll),                      // world-up component
      -Math.sin(angle) * Math.sin(roll),   // right.z * sin(roll)
    ).normalize()

    // Set the up vector BEFORE lookAt — call lookAt exactly once.
    camera.up.copy(_upVec)
    camera.lookAt(smoothLookRef.current)

    // ── 5. FOV boost stretch ──────────────────────────────────────────────
    const targetFov  = speed > TRAIN_BASE_SPEED + 1 ? CAMERA_BOOST_FOV : CAMERA_BASE_FOV
    const cam = camera as THREE.PerspectiveCamera
    if (cam.fov !== undefined) {
      cam.fov += (targetFov - cam.fov) * CAMERA_FOV_LAG
      cam.updateProjectionMatrix()
    }
  })

  return null
}

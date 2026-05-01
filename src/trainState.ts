import * as THREE from 'three'

/**
 * Module-level refs written by Train.tsx every frame.
 * Importing from here (not from Train or FollowCamera) avoids circular deps.
 *
 * These refs are intentionally NOT React state — they update at 60 fps and
 * should never trigger re-renders.
 */

/** World position of the locomotive head. */
export const trainPosRef: { current: THREE.Vector3 } =
  { current: new THREE.Vector3(0, 0.4, 0) }

/** Current yaw angle of the locomotive (radians). */
export const trainAngleRef: { current: number } = { current: 0 }

/** Previous frame's yaw — used by FollowCamera to compute angular velocity for roll. */
export const trainPrevAngleRef: { current: number } = { current: 0 }

/** Current movement speed (units/sec) — used for FOV boost effect. */
export const trainSpeedRef: { current: number } = { current: 0 }

/**
 * Distance-sampled position ring buffer.
 * history[0] = most recent sample (nearest to head).
 * Written by Train.tsx; read by useSpawner for tail-safe spawn placement.
 */
export const trainHistoryRef: { current: THREE.Vector3[] } = { current: [] }

/** Current tail length — mirrors tailTypes.length from the store. */
export const trainTailLenRef: { current: number } = { current: 0 }

/** Trauma value (0–1) for camera shake on shielded obstacle hit. Written by Train.tsx, decayed by FollowCamera.tsx. */
export const cameraShakeRef: { current: number } = { current: 0 }

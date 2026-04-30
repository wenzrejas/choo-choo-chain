import { useRef, useMemo, useEffect, type JSX } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ObjectMap } from '@react-three/fiber'
import type { GLTF } from 'three-stdlib'
import { WAGON_COLORS } from '../../utils/constants'
import { useGameStore } from '../../store/gameStore'
import type { WagonEntity, WagonType } from '../../types'

// ─── Constants ────────────────────────────────────────────────────────────────
export const MODEL_PATH = '/choo-choo-chain/models/train/train-carriage-dirt.glb'

const MAX_INSTANCES = 200

// ─── GLTF result type ────────────────────────────────────────────────────────
type WagonGLTF = GLTF & ObjectMap & {
  nodes: {
    'train-carriage-dirt_1': THREE.Mesh
    'wheels-front': THREE.Mesh
    'wheels-back': THREE.Mesh
    cargo: THREE.Mesh
  }
  materials: {
    colormap: THREE.MeshStandardMaterial
  }
}

// ─── Wagon type → THREE.Color (module-level, never reallocated) ───────────────
export const TYPE_COLORS: Record<WagonType, THREE.Color> = {
  copper: new THREE.Color(WAGON_COLORS.copper),
  silver: new THREE.Color(WAGON_COLORS.silver),
  gold:   new THREE.Color(WAGON_COLORS.gold),
}

// ─── Shared white base material for instanced cargo meshes ───────────────────
// Per-instance colour is applied via InstancedMesh.setColorAt — not the material.
// Exported so Train.tsx tail can reuse the same material instance.
export const cargoInstanceMat = new THREE.MeshStandardMaterial({
  color: '#ffffff', roughness: 1, metalness: 0,
})

// ─── Shadow decal (shared across all collectible instances) ──────────────────
const shadowGeo = new THREE.CircleGeometry(0.7, 24)
const shadowMat = new THREE.MeshBasicMaterial({
  color: '#000000', transparent: true, opacity: 0.14, depthWrite: false,
})

// ─── Ring indicator (flat torus, white) ──────────────────────────────────────
const ringGeo = new THREE.TorusGeometry(0.9, 0.07, 8, 52)
const ringMat = new THREE.MeshBasicMaterial({
  color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false,
})

// ─── Scratch Object3D — reused every frame to build instance matrices ────────
const _dummy = new THREE.Object3D()

// ─── FNV-1a 32-bit hash → deterministic Y-rotation offset ────────────────────
// Gives each wagon a unique stable facing angle without any random() calls.
export function idToYaw(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return (h % 8) * (Math.PI / 4)
}

// Different seed so spin rate is independent of yaw.
function idToSpinRate(id: string): number {
  let h = 0x9e3779b9
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return 0.4 + (h % 100) / 100 * 1.0  // [0.4, 1.4] rad/s
}

// Per-id caches so the FNV hash loops don't run every frame inside useFrame.
const _spinRateCache = new Map<string, number>()
const _yawCache      = new Map<string, number>()
function cachedSpinRate(id: string): number {
  let v = _spinRateCache.get(id)
  if (v === undefined) { v = idToSpinRate(id); _spinRateCache.set(id, v) }
  return v
}
function cachedYaw(id: string): number {
  let v = _yawCache.get(id)
  if (v === undefined) { v = idToYaw(id); _yawCache.set(id, v) }
  return v
}

// ─── GLTF hook ────────────────────────────────────────────────────────────────
// Safe to call in multiple components — useGLTF caches the result by URL.
export function useWagonGLTF(): WagonGLTF {
  return useGLTF(MODEL_PATH) as WagonGLTF
}

// ─── Standalone Wagon ─────────────────────────────────────────────────────────
// Single wagon with cargo coloured by type. Use for UI previews or debugging.
// For game collectibles use <WagonInstances /> (5 draw calls for all wagons).
export function Wagon({ type, position }: WagonEntity): JSX.Element {
  const { nodes, materials } = useWagonGLTF()

  const cargoMat = useMemo(() => {
    const m = materials.colormap.clone()
    m.color.copy(TYPE_COLORS[type])
    m.roughness = 1
    m.metalness = 0
    return m
  }, [materials.colormap, type])

  return (
    <group position={[position.x, 0, position.z]} scale={0.7} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes['train-carriage-dirt_1'].geometry}
        material={materials.colormap}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes['wheels-front'].geometry}
          material={materials.colormap}
          position={[0, 0.359, 0.6]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes['wheels-back'].geometry}
          material={materials.colormap}
          position={[0, 0.359, -0.6]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.cargo.geometry}
          material={cargoMat}
          position={[0, 1.298, 0]}
        />
      </mesh>
    </group>
  )
}

// ─── WagonInstances ───────────────────────────────────────────────────────────
// Renders ALL wagon collectibles from the store as 5 instanced draw calls:
// body, wheels-front, wheels-back, cargo (type-coloured), shadow.
// Imperative InstancedMesh creation mirrors the pattern used by Train.tsx
// to avoid R3F reconciling args=[...] array literals each render.
export function WagonInstances(): null {
  const { scene }          = useThree()
  const { nodes, materials } = useWagonGLTF()

  const bodyRef   = useRef<THREE.InstancedMesh | null>(null)
  const wfRef     = useRef<THREE.InstancedMesh | null>(null)
  const wbRef     = useRef<THREE.InstancedMesh | null>(null)
  const cargoRef  = useRef<THREE.InstancedMesh | null>(null)
  const shadowRef = useRef<THREE.InstancedMesh | null>(null)
  const ringRef   = useRef<THREE.InstancedMesh | null>(null)

  useEffect(() => {
    const body   = new THREE.InstancedMesh(nodes['train-carriage-dirt_1'].geometry, materials.colormap, MAX_INSTANCES)
    const wf     = new THREE.InstancedMesh(nodes['wheels-front'].geometry,          materials.colormap, MAX_INSTANCES)
    const wb     = new THREE.InstancedMesh(nodes['wheels-back'].geometry,           materials.colormap, MAX_INSTANCES)
    const cargo  = new THREE.InstancedMesh(nodes.cargo.geometry,                    cargoInstanceMat,   MAX_INSTANCES)
    const shadow = new THREE.InstancedMesh(shadowGeo,                               shadowMat,          MAX_INSTANCES)
    const ring   = new THREE.InstancedMesh(ringGeo,                                 ringMat.clone(),    MAX_INSTANCES)

    ;[body, wf, wb, cargo].forEach(m => {
      m.count         = 0
      m.castShadow    = true
      m.receiveShadow = true
      m.frustumCulled = false
    })
    shadow.count         = 0
    shadow.frustumCulled = false
    ring.count           = 0
    ring.frustumCulled   = false

    scene.add(body, wf, wb, cargo, shadow, ring)
    bodyRef.current   = body
    wfRef.current     = wf
    wbRef.current     = wb
    cargoRef.current  = cargo
    shadowRef.current = shadow
    ringRef.current   = ring

    return () => {
      ;(ring.material as THREE.MeshBasicMaterial).dispose()
      scene.remove(body, wf, wb, cargo, shadow, ring)
      bodyRef.current = wfRef.current = wbRef.current = cargoRef.current = shadowRef.current = ringRef.current = null
    }
  }, [scene, nodes, materials.colormap])

  useFrame(({ clock }) => {
    const body   = bodyRef.current
    const wf     = wfRef.current
    const wb     = wbRef.current
    const cargo  = cargoRef.current
    const shadow = shadowRef.current
    const ring   = ringRef.current
    if (!body || !wf || !wb || !cargo || !shadow || !ring) return

    const wagons = useGameStore.getState().wagons
    const count  = wagons.length
    const t      = clock.getElapsedTime()

    body.count = wf.count = wb.count = cargo.count = shadow.count = ring.count = count

    // Global ring opacity pulse
    ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(t * 2.5) * 0.25

    for (let i = 0; i < count; i++) {
      const { id, type, position: p } = wagons[i]
      const spin = t * cachedSpinRate(id) + cachedYaw(id)
      const bob  = 0.06 + Math.sin(t * 1.5 + p.x * 0.5) * 0.13
      const sy   = Math.sin(spin)
      const cy   = Math.cos(spin)

      // All wagon parts share scale 0.7 — matches TrainHead scale
      _dummy.scale.setScalar(0.7)

      // Body
      _dummy.position.set(p.x, bob, p.z)
      _dummy.rotation.set(0, spin, 0)
      _dummy.updateMatrix()
      body.setMatrixAt(i, _dummy.matrix)

      // Wheels-front: offset (0, 0.359, 0.6) × 0.7 = (0, 0.251, 0.42)
      _dummy.position.set(p.x + 0.42 * sy, bob + 0.251, p.z + 0.42 * cy)
      _dummy.updateMatrix()
      wf.setMatrixAt(i, _dummy.matrix)

      // Wheels-back: offset (0, 0.359, -0.6) × 0.7
      _dummy.position.set(p.x - 0.42 * sy, bob + 0.251, p.z - 0.42 * cy)
      _dummy.updateMatrix()
      wb.setMatrixAt(i, _dummy.matrix)

      // Cargo: offset (0, 1.298, 0) × 0.7 = (0, 0.909, 0)
      _dummy.position.set(p.x, bob + 0.909, p.z)
      _dummy.updateMatrix()
      cargo.setMatrixAt(i, _dummy.matrix)
      cargo.setColorAt(i, TYPE_COLORS[type])

      // Shadow: flat circle pinned to the ground; stays still while wagon bobs
      _dummy.position.set(p.x, 0.01, p.z)
      _dummy.rotation.set(-Math.PI / 2, 0, 0)
      _dummy.updateMatrix()
      shadow.setMatrixAt(i, _dummy.matrix)

      // Ring: flat torus on the ground, per-instance colour, per-wagon scale pulse
      const pulse = 0.9 + Math.sin(t * 2.5 + p.x) * 0.1
      _dummy.scale.setScalar(pulse)
      _dummy.position.set(p.x, 0.025, p.z)
      _dummy.rotation.set(-Math.PI / 2, 0, 0)
      _dummy.updateMatrix()
      ring.setMatrixAt(i, _dummy.matrix)
    }

    if (count > 0) {
      body.instanceMatrix.needsUpdate   = true
      wf.instanceMatrix.needsUpdate     = true
      wb.instanceMatrix.needsUpdate     = true
      cargo.instanceMatrix.needsUpdate  = true
      shadow.instanceMatrix.needsUpdate = true
      ring.instanceMatrix.needsUpdate   = true
      if (cargo.instanceColor) cargo.instanceColor.needsUpdate = true
    }
  })

  return null
}

useGLTF.preload(MODEL_PATH)

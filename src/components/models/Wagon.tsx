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
export const MODEL_PATH = '/choo-choo-chain/models/train-carriage-dirt.glb'

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

// ─── GLTF hook ────────────────────────────────────────────────────────────────
// Safe to call in multiple components — useGLTF caches the result by URL.
export function useWagonGLTF(): WagonGLTF {
  return useGLTF(MODEL_PATH) as WagonGLTF
}

// ─── Standalone Wagon ─────────────────────────────────────────────────────────
// Single wagon with cargo coloured by type. Use for UI previews or debugging.
// For game collectibles use <WagonInstances /> (5 draw calls for all wagons).
export function Wagon({ id, type, position }: WagonEntity): JSX.Element {
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

  useEffect(() => {
    const body   = new THREE.InstancedMesh(nodes['train-carriage-dirt_1'].geometry, materials.colormap, MAX_INSTANCES)
    const wf     = new THREE.InstancedMesh(nodes['wheels-front'].geometry,          materials.colormap, MAX_INSTANCES)
    const wb     = new THREE.InstancedMesh(nodes['wheels-back'].geometry,           materials.colormap, MAX_INSTANCES)
    const cargo  = new THREE.InstancedMesh(nodes.cargo.geometry,                    cargoInstanceMat,   MAX_INSTANCES)
    const shadow = new THREE.InstancedMesh(shadowGeo,                               shadowMat,          MAX_INSTANCES)

    ;[body, wf, wb, cargo].forEach(m => {
      m.count         = 0
      m.castShadow    = true
      m.receiveShadow = true
      m.frustumCulled = false
    })
    shadow.count         = 0
    shadow.frustumCulled = false

    scene.add(body, wf, wb, cargo, shadow)
    bodyRef.current   = body
    wfRef.current     = wf
    wbRef.current     = wb
    cargoRef.current  = cargo
    shadowRef.current = shadow

    return () => {
      scene.remove(body, wf, wb, cargo, shadow)
      bodyRef.current = wfRef.current = wbRef.current = cargoRef.current = shadowRef.current = null
    }
  }, [scene, nodes, materials.colormap])

  useFrame(({ clock }) => {
    const body   = bodyRef.current
    const wf     = wfRef.current
    const wb     = wbRef.current
    const cargo  = cargoRef.current
    const shadow = shadowRef.current
    if (!body || !wf || !wb || !cargo || !shadow) return

    const wagons = useGameStore.getState().wagons
    const count  = wagons.length
    const t      = clock.getElapsedTime()

    body.count = wf.count = wb.count = cargo.count = shadow.count = count

    for (let i = 0; i < count; i++) {
      const { id, type, position: p } = wagons[i]
      const yaw = idToYaw(id)
      const bob = 0.06 + Math.sin(t * 1.5 + p.x * 0.5) * 0.07
      const sy  = Math.sin(yaw)
      const cy  = Math.cos(yaw)

      // All wagon parts share scale 0.7 — matches TrainHead scale
      _dummy.scale.setScalar(0.7)

      // Body
      _dummy.position.set(p.x, bob, p.z)
      _dummy.rotation.set(0, yaw, 0)
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
    }

    body.instanceMatrix.needsUpdate   = true
    wf.instanceMatrix.needsUpdate     = true
    wb.instanceMatrix.needsUpdate     = true
    cargo.instanceMatrix.needsUpdate  = true
    shadow.instanceMatrix.needsUpdate = true
    if (count > 0 && cargo.instanceColor) cargo.instanceColor.needsUpdate = true
  })

  return null
}

useGLTF.preload(MODEL_PATH)

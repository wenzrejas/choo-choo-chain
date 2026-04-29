import { useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { ObjectMap } from '@react-three/fiber'
import type { GLTF } from 'three-stdlib'
import type { Mesh, MeshStandardMaterial } from 'three'
import * as THREE from 'three'

// ─── Smoke constants ──────────────────────────────────────────────────────────
const MAX_SMOKE      = 120
const SMOKE_LIFETIME = 2.2   // seconds
const SMOKE_PER_SEC  = 22

// Module-level scratch (never reallocated)
const _sd           = new THREE.Object3D()
const _chimneyWorld = new THREE.Vector3()
// Chimney tip in group local space — group scale is 0.7, so world offset = local × 0.7
const _chimneyLocal = new THREE.Vector3(0, 1.3, 0.8)

// ─── Smoke particle system ────────────────────────────────────────────────────
function SmokeParticles({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const { scene } = useThree()

  const meshRef   = useRef<THREE.InstancedMesh | null>(null)
  const pos       = useRef(new Float32Array(MAX_SMOKE * 3))
  const vel       = useRef(new Float32Array(MAX_SMOKE * 3))
  const life      = useRef(new Float32Array(MAX_SMOKE))
  const alive     = useRef(new Uint8Array(MAX_SMOKE))
  const emitTimer = useRef(0)

  useEffect(() => {
    const geo = new THREE.SphereGeometry(0.5, 5, 4)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd0d0d0,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
    })
    const mesh = new THREE.InstancedMesh(geo, mat, MAX_SMOKE)
    mesh.count = 0
    mesh.frustumCulled = false
    scene.add(mesh)
    meshRef.current = mesh

    return () => {
      scene.remove(mesh)
      geo.dispose()
      mat.dispose()
      meshRef.current = null
    }
  }, [scene])

  useFrame((_, delta) => {
    const mesh  = meshRef.current
    const group = groupRef.current
    if (!mesh || !group) return

    const dt = Math.min(delta, 0.05)

    // Chimney world position
    _chimneyWorld.copy(_chimneyLocal)
    group.localToWorld(_chimneyWorld)

    // Emit new puffs
    emitTimer.current += dt
    const emitInterval = 1 / SMOKE_PER_SEC
    while (emitTimer.current >= emitInterval) {
      emitTimer.current -= emitInterval
      let slot = -1
      for (let i = 0; i < MAX_SMOKE; i++) {
        if (!alive.current[i]) { slot = i; break }
      }
      if (slot >= 0) {
        const i3 = slot * 3
        pos.current[i3]     = _chimneyWorld.x + (Math.random() - 0.5) * 0.08
        pos.current[i3 + 1] = _chimneyWorld.y
        pos.current[i3 + 2] = _chimneyWorld.z + (Math.random() - 0.5) * 0.08
        vel.current[i3]     = (Math.random() - 0.5) * 0.3
        vel.current[i3 + 1] = 0.9 + Math.random() * 0.5
        vel.current[i3 + 2] = (Math.random() - 0.5) * 0.3
        life.current[slot]  = SMOKE_LIFETIME
        alive.current[slot] = 1
      }
    }

    // Update active particles and rebuild instance matrices
    let count = 0
    for (let i = 0; i < MAX_SMOKE; i++) {
      if (!alive.current[i]) continue
      life.current[i] -= dt
      if (life.current[i] <= 0) { alive.current[i] = 0; continue }

      const i3 = i * 3
      pos.current[i3]     += vel.current[i3]     * dt
      pos.current[i3 + 1] += vel.current[i3 + 1] * dt
      pos.current[i3 + 2] += vel.current[i3 + 2] * dt

      // Strong horizontal drag, gentle vertical drag so puffs spread and rise
      vel.current[i3]     *= 1 - 3.0 * dt
      vel.current[i3 + 1] *= 1 - 0.8 * dt
      vel.current[i3 + 2] *= 1 - 3.0 * dt

      // t: 0 = just born, 1 = about to die
      const t     = 1 - life.current[i] / SMOKE_LIFETIME
      const scale = 0.08 + t * 0.55

      _sd.position.set(pos.current[i3], pos.current[i3 + 1], pos.current[i3 + 2])
      _sd.scale.setScalar(scale)
      _sd.updateMatrix()
      mesh.setMatrixAt(count, _sd.matrix)
      count++
    }

    mesh.count = count
    if (count > 0) mesh.instanceMatrix.needsUpdate = true
  })

  return null
}

// ─── TrainHead ────────────────────────────────────────────────────────────────
interface TrainProps {
  groupRef: React.RefObject<THREE.Group | null>
  shieldActive: boolean
}

type GLTFResult = GLTF &
  ObjectMap & {
    nodes: {
      ['train-locomotive-b_1']: Mesh
      ['wheel']: Mesh
      ['wheel_1']: Mesh
      ['wheel_2']: Mesh
      ['wheel_3']: Mesh
      ['wheels-front']: Mesh
    }
    materials: {
      ['[colormap]']: MeshStandardMaterial
    }
  }

export function TrainHead({ groupRef, shieldActive }: TrainProps) {
  const { nodes, materials } = useGLTF('./models/train-locomotive-b.glb') as GLTFResult
  return (
    <>
      <group ref={groupRef} dispose={null} scale={0.7}>
        <mesh
          castShadow
          receiveShadow
          position-y={-0.55}
          geometry={nodes['train-locomotive-b_1'].geometry}
          material={materials.colormap}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.wheel.geometry}
            material={materials.colormap}
            position={[0.425, 0.27, -0.093]}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.wheel_1.geometry}
            material={materials.colormap}
            position={[0.425, 0.27, -0.693]}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.wheel_2.geometry}
            material={materials.colormap}
            position={[-0.425, 0.27, -0.093]}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.wheel_3.geometry}
            material={materials.colormap}
            position={[-0.425, 0.27, -0.693]}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes['wheels-front'].geometry}
            material={materials.colormap}
            position={[0, 0, 0.553]}
          />
        </mesh>

        {/* Shield bubble — kept simple, orange wireframe reads clearly on bright scene */}
        {shieldActive && (
          <mesh>
            <sphereGeometry args={[1.35, 16, 16]} />
            <meshStandardMaterial color="#ff8800" transparent opacity={0.18} wireframe />
          </mesh>
        )}
      </group>

      <SmokeParticles groupRef={groupRef} />
    </>
  )
}

useGLTF.preload('/train-locomotive-b.glb')

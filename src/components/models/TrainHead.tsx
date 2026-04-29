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

// ─── ForceField (active shield visual) ───────────────────────────────────────
const FF_COUNT = 180
const FF_R     = 1.3

// Fibonacci hemisphere: front half (z >= 0) — pre-computed once at module level
const _ffPts = (() => {
  const pts    = new Float32Array(FF_COUNT * 3)
  const golden = (1 + Math.sqrt(5)) / 2
  for (let i = 0; i < FF_COUNT; i++) {
    const phi  = Math.acos(1 - i / FF_COUNT)  // 0 → ~PI/2
    const ang  = 2 * Math.PI * i / golden
    const sinP = Math.sin(phi)
    pts[i * 3]     = sinP * Math.cos(ang) * FF_R
    pts[i * 3 + 1] = sinP * Math.sin(ang) * FF_R * 0.88  // slightly flatten vertically
    pts[i * 3 + 2] = Math.cos(phi) * FF_R                 // z: 1 → 0 (front → equator)
  }
  return pts
})()

const _ffDummy = new THREE.Object3D()

// Shared module-level geometries & materials — never reallocated
const ffParticleGeo = new THREE.IcosahedronGeometry(0.068, 0)
const ffParticleMat = new THREE.MeshBasicMaterial({
  color: '#40c4ff',
  transparent: true,
  opacity: 1.0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})
const ffShellMat = new THREE.MeshBasicMaterial({
  color: '#0288d1',
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
})
const ffRimMat = new THREE.MeshBasicMaterial({
  color: '#29b6f6',
  transparent: true,
  opacity: 0.38,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
})
// Separate instances so each ring's opacity can be animated independently
const ffRingMat1 = new THREE.MeshBasicMaterial({
  color: '#4fc3f7',
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
})
const ffRingMat2 = new THREE.MeshBasicMaterial({
  color: '#0288d1',
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
})

function ForceField() {
  const instanceRef = useRef<THREE.InstancedMesh>(null)
  const ring1Ref    = useRef<THREE.Mesh>(null)
  const ring2Ref    = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t    = clock.getElapsedTime()
    const mesh = instanceRef.current
    if (!mesh) return

    for (let i = 0; i < FF_COUNT; i++) {
      const i3 = i * 3
      const bx = _ffPts[i3]
      const by = _ffPts[i3 + 1]
      const bz = _ffPts[i3 + 2]

      // Surface ripple wave
      const phase  = (bx + by) * 0.55 + bz * 0.28 + t * 2.2
      const ripple = 1.0 + Math.sin(phase) * 0.026

      _ffDummy.position.set(bx * ripple, by * ripple, bz * ripple)

      // Equator particles are larger; all pulse in size
      const normZ    = bz / FF_R                            // 1 at front pole, 0 at equator
      const edgeness = 1.0 - normZ                          // 0 at front, 1 at equator
      const pulse    = 0.7 + 0.6 * Math.sin(t * 3.0 + i * 0.33)
      _ffDummy.scale.setScalar(Math.max(0.15, (0.7 + edgeness * 1.5) * pulse))
      _ffDummy.updateMatrix()
      mesh.setMatrixAt(i, _ffDummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true

    // Out-of-phase ring pulses
    ffRingMat1.opacity = 0.28 + Math.abs(Math.sin(t * 1.9))       * 0.45
    ffRingMat2.opacity = 0.20 + Math.abs(Math.sin(t * 2.3 + 1.1)) * 0.35
    if (ring1Ref.current) ring1Ref.current.scale.setScalar(0.95 + Math.sin(t * 1.9)       * 0.055)
    if (ring2Ref.current) ring2Ref.current.scale.setScalar(0.92 + Math.sin(t * 2.3 + 1.1) * 0.07)
  })

  // Positioned at the nose of the train (+Z is train-forward, group scale=0.7)
  return (
    <group position={[0, -0.15, 0.9]}>
      {/* Particle dome — front hemisphere only */}
      <instancedMesh
        ref={instanceRef}
        args={[ffParticleGeo, ffParticleMat, FF_COUNT]}
        frustumCulled={false}
      />

      {/* Translucent energy shell */}
      <mesh material={ffShellMat}>
        <sphereGeometry args={[FF_R, 28, 20]} />
      </mesh>

      {/* Rim glow — BackSide gives an inner-edge highlight */}
      <mesh material={ffRimMat}>
        <sphereGeometry args={[FF_R * 1.05, 28, 20]} />
      </mesh>

      {/* Large equatorial ring — faces train-forward (+Z), pulses */}
      <mesh ref={ring1Ref} material={ffRingMat1}>
        <ringGeometry args={[FF_R * 0.88, FF_R * 1.0, 52]} />
      </mesh>

      {/* Inner angled ring — adds depth */}
      <mesh ref={ring2Ref} rotation={[Math.PI * 0.28, 0, 0.35]} material={ffRingMat2}>
        <ringGeometry args={[FF_R * 0.48, FF_R * 0.60, 36]} />
      </mesh>
    </group>
  )
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
  const { nodes, materials } = useGLTF('/choo-choo-chain/models/train-locomotive-b.glb') as GLTFResult
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

        {shieldActive && <ForceField />}
      </group>

      <SmokeParticles groupRef={groupRef} />
    </>
  )
}

useGLTF.preload('/train-locomotive-b.glb')

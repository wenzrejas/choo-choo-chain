import { useRef, useMemo, type JSX } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Wagon, idToYaw } from '../models/Wagon'
import type { WagonEntity } from '../../types'

// ─── Shadow decal ─────────────────────────────────────────────────────────────
const shadowGeo = new THREE.CircleGeometry(0.7, 24)
const shadowMat = new THREE.MeshBasicMaterial({
  color: '#000000', transparent: true, opacity: 0.14, depthWrite: false,
})

// Stable zero-vector so Wagon renders at local origin (parent group handles world pos)
const ZERO = new THREE.Vector3()

// ─── Component ────────────────────────────────────────────────────────────────
// Single animated wagon collectible — use when you need an individually
// controllable wagon. For all game-field wagons prefer <WagonInstances />.
export default function WagonCollectible({ id, type, position }: WagonEntity): JSX.Element {
  const bobRef = useRef<THREE.Group>(null)
  const yaw    = useMemo(() => idToYaw(id), [id])

  useFrame(({ clock }) => {
    if (!bobRef.current) return
    bobRef.current.position.y = 0.06 + Math.sin(clock.getElapsedTime() * 1.5 + position.x * 0.5) * 0.07
  })

  return (
    <group position={[position.x, 0, position.z]} rotation={[0, yaw, 0]}>
      <group ref={bobRef}>
        <Wagon id={id} type={type} position={ZERO} />
      </group>

      {/* Shadow stays on the ground while the wagon bobs */}
      <mesh
        geometry={shadowGeo}
        material={shadowMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      />
    </group>
  )
}

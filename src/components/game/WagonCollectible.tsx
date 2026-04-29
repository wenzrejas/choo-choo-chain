import { useRef, type JSX } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WAGON_COLORS } from '../../utils/constants'
import type { WagonEntity } from '../../types'

type Props = WagonEntity

/**
 * Kenney-style wagon collectibles.
 * Flat matte body, bright saturated colours, chunky proportions.
 * The glow ring is replaced with a clean shadow decal — more grounded.
 */

const wagonGeo = new THREE.BoxGeometry(0.85, 0.55, 1.3)
const roofGeo  = new THREE.BoxGeometry(0.7,  0.12, 1.1)
const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10)
const axleGeo  = new THREE.CylinderGeometry(0.04, 0.04, 0.95, 6)
const shadowGeo = new THREE.CircleGeometry(0.6, 24)

// Flat matte wheel/axle shared materials
const wheelMat  = new THREE.MeshStandardMaterial({ color: '#424242', roughness: 1, metalness: 0 })
const axleMat   = new THREE.MeshStandardMaterial({ color: '#616161', roughness: 1, metalness: 0 })
const shadowMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.12, depthWrite: false })

const wheelPositions: [number, number][] = [
  [-0.42, -0.52], [0.42, -0.52],
  [-0.42,  0.52], [0.42,  0.52],
]

export default function WagonCollectible({ type, position }: Props): JSX.Element {
  const groupRef = useRef<THREE.Group>(null)
  const color    = WAGON_COLORS[type]

  // Slightly brighter roof color (top face catches more light)
  const roofColor = type === 'copper' ? '#c9894a'
                  : type === 'silver' ? '#d8d8d8'
                  :                     '#ffe033'

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    // Gentle bob — no spin, wagons should look like real toy train cars
    groupRef.current.position.y = 0.38 + Math.sin(t * 1.6 + position.x * 0.3) * 0.08
  })

  return (
    <group position={[position.x, 0, position.z]}>
      {/* Bobbing wagon group */}
      <group ref={groupRef}>
        {/* Body — flat matte in wagon type colour */}
        <mesh geometry={wagonGeo} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={1} metalness={0} />
        </mesh>

        {/* Roof stripe — slightly brighter, gives readable silhouette */}
        <mesh geometry={roofGeo} position={[0, 0.34, 0]} castShadow>
          <meshStandardMaterial color={roofColor} roughness={1} metalness={0} />
        </mesh>

        {/* Wheels — 4 corners */}
        {wheelPositions.map(([x, z], i) => (
          <mesh key={i} geometry={wheelGeo} material={wheelMat}
            position={[x, -0.26, z]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          />
        ))}

        {/* Axles */}
        {[-0.52, 0.52].map((z, i) => (
          <mesh key={i} geometry={axleGeo} material={axleMat}
            position={[0, -0.26, z]}
            rotation={[0, 0, Math.PI / 2]}
          />
        ))}
      </group>

      {/* Soft shadow decal — static on the ground, adds grounding */}
      <mesh geometry={shadowGeo} material={shadowMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      />
    </group>
  )
}

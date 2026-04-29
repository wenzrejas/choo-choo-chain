import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { POWERUP_COLORS } from '../../utils/constants'
import type { PowerUpEntity } from '../../types'

/**
 * Kenney-style power-ups.
 * Clean, bright flat colours — no emissive glow, no point lights.
 * Simple geometric shapes that read clearly from a top-down angle.
 * A gentle bob + slow rotation keeps them visually alive.
 */

// ─── Geometries ───────────────────────────────────────────────────────────────
const energyGeo    = new THREE.OctahedronGeometry(0.48, 0)
const clockBodyGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.18, 16)
const clockFaceGeo = new THREE.CircleGeometry(0.38, 16)
const shieldGeo    = new THREE.CylinderGeometry(0.44, 0.38, 0.52, 6)   // hexagon

const handLongGeo  = new THREE.BoxGeometry(0.05, 0.28, 0.05)
const handShortGeo = new THREE.BoxGeometry(0.05, 0.18, 0.05)

const shadowGeo    = new THREE.CircleGeometry(0.55, 24)
const shadowMat    = new THREE.MeshBasicMaterial({
  color: '#000', transparent: true, opacity: 0.1, depthWrite: false,
})

// ─── Energy pickup (octahedron — lightning bolt stand-in) ─────────────────────
function EnergyPickup({ color }: { color: string }): JSX.Element {
  return (
    <mesh geometry={energyGeo} castShadow>
      <meshStandardMaterial color={color} roughness={0.8} metalness={0} />
    </mesh>
  )
}

// ─── Clock pickup ─────────────────────────────────────────────────────────────
function ClockPickup({ color }: { color: string }): JSX.Element {
  return (
    <group>
      {/* Body disc */}
      <mesh geometry={clockBodyGeo} castShadow>
        <meshStandardMaterial color={color} roughness={1} metalness={0} />
      </mesh>
      {/* White face */}
      <mesh geometry={clockFaceGeo} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={1} metalness={0} />
      </mesh>
      {/* Hour hand */}
      <mesh geometry={handShortGeo} position={[0, 0.12, -0.06]} rotation={[0, 0, Math.PI / 6]}>
        <meshStandardMaterial color="#333" roughness={1} metalness={0} />
      </mesh>
      {/* Minute hand */}
      <mesh geometry={handLongGeo} position={[0.06, 0.12, 0]}>
        <meshStandardMaterial color="#333" roughness={1} metalness={0} />
      </mesh>
    </group>
  )
}

// ─── Shield pickup (hexagonal prism — reads as shield shape) ──────────────────
function ShieldPickup({ color }: { color: string }): JSX.Element {
  return (
    <group>
      <mesh geometry={shieldGeo} castShadow>
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>
      {/* White cross mark on top */}
      <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.12, 0.44]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
      </mesh>
      <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.44, 0.12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
      </mesh>
    </group>
  )
}

// ─── PowerUp ──────────────────────────────────────────────────────────────────

type Props = PowerUpEntity

export default function PowerUp({ type, position }: Props): JSX.Element {
  const groupRef = useRef<THREE.Group>(null)
  const color    = POWERUP_COLORS[type]

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.position.y = 0.55 + Math.sin(t * 1.8 + position.z * 0.3) * 0.1
    groupRef.current.rotation.y = t * 0.9
  })

  return (
    <group position={[position.x, 0, position.z]}>
      <group ref={groupRef}>
        {type === 'energy' && <EnergyPickup color={color} />}
        {type === 'clock'  && <ClockPickup  color={color} />}
        {type === 'shield' && <ShieldPickup color={color} />}
      </group>

      {/* Ground shadow decal */}
      <mesh geometry={shadowGeo} material={shadowMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      />
    </group>
  )
}

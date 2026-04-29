import * as THREE from 'three'
import type { ObstacleEntity } from '../../types'
import type { JSX } from 'react'

/**
 * Kenney-style obstacle materials:
 *   - Flat matte (roughness 1, metalness 0) — no specular highlights
 *   - Saturated, friendly colours matching Kenney's Nature Pack
 *   - Slightly more geometry detail so shadows read well
 */

// ─── Materials ────────────────────────────────────────────────────────────────
const MAT = (color: string) =>
  new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 })

// Tree
const trunkMat  = MAT('#a0522d')   // warm brown trunk
const leafMat1  = MAT('#4caf50')   // vivid mid-green canopy
const leafMat2  = MAT('#388e3c')   // slightly darker top layer

// Bush
const bushMat   = MAT('#66bb6a')   // bright friendly green
const bushMat2  = MAT('#57a05a')   // subtle variation for clusters

// Boulder
const boulderMat  = MAT('#9e9e9e') // neutral mid-grey
const boulderMat2 = MAT('#bdbdbd') // lighter face catching sun

// ─── Geometries ───────────────────────────────────────────────────────────────
// Kenney trees: round blob canopy (sphere), not cone — more toylike
const trunkGeo   = new THREE.CylinderGeometry(0.14, 0.2, 1.0, 8)
const canopyGeo  = new THREE.SphereGeometry(0.72, 8, 7)    // main blob
const canopyGeo2 = new THREE.SphereGeometry(0.52, 8, 7)    // top accent

const bushGeo    = new THREE.SphereGeometry(0.55, 8, 6)
const boulderGeo = new THREE.DodecahedronGeometry(0.6, 0)

// ─── Tree ─────────────────────────────────────────────────────────────────────

function Tree({ pos }: { pos: [number, number, number] }): JSX.Element {
  return (
    <group position={pos}>
      {/* Trunk */}
      <mesh geometry={trunkGeo} material={trunkMat} position={[0, 0.5, 0]} castShadow />
      {/* Main canopy blob */}
      <mesh geometry={canopyGeo} material={leafMat1} position={[0, 1.5, 0]} castShadow receiveShadow />
      {/* Smaller top sphere — Kenney's signature two-blob tree */}
      <mesh geometry={canopyGeo2} material={leafMat2} position={[0, 2.1, 0]} castShadow />
    </group>
  )
}

// ─── Bush ─────────────────────────────────────────────────────────────────────

function Bush({ pos }: { pos: [number, number, number] }): JSX.Element {
  return (
    <group position={pos}>
      <mesh geometry={bushGeo} material={bushMat}  position={[0,     0.48, 0]}    castShadow />
      <mesh geometry={bushGeo} material={bushMat2} position={[0.44,  0.38, 0.1]}  scale={0.78} castShadow />
      <mesh geometry={bushGeo} material={bushMat}  position={[-0.36, 0.36, 0.22]} scale={0.68} castShadow />
    </group>
  )
}

// ─── Boulder ──────────────────────────────────────────────────────────────────

function Boulder({ pos }: { pos: [number, number, number] }): JSX.Element {
  return (
    <group position={[pos[0], 0.42, pos[2]]}>
      {/* Main boulder */}
      <mesh geometry={boulderGeo} material={boulderMat}
        rotation={[0.2, 0.9, 0.15]} castShadow receiveShadow />
      {/* Small accent pebble */}
      <mesh geometry={boulderGeo} material={boulderMat2}
        position={[0.5, -0.1, 0.3]} scale={0.45}
        rotation={[0.5, 0.2, 0.8]} castShadow />
    </group>
  )
}

// ─── Obstacle router ──────────────────────────────────────────────────────────

type Props = ObstacleEntity

export default function Obstacle({ type, position, destroyed }: Props): JSX.Element | null {
  if (destroyed) return null
  const pos: [number, number, number] = [position.x, 0, position.z]

  if (type === 'tree')    return <Tree    pos={pos} />
  if (type === 'bush')    return <Bush    pos={pos} />
  if (type === 'boulder') return <Boulder pos={pos} />
  return null
}

import { useRef, type JSX } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PowerUpEntity } from '../../types'

// ─── Geometries (module-level, never reallocated) ─────────────────────────────
const battBodyGeo   = new THREE.CylinderGeometry(0.34, 0.34, 1.0,  16)
const battCapGeo    = new THREE.CylinderGeometry(0.37, 0.37, 0.1,  16)
const battTermGeo   = new THREE.CylinderGeometry(0.14, 0.14, 0.18, 16)
const clockBodyGeo  = new THREE.CylinderGeometry(0.6, 0.6, 0.26, 20)
const clockFaceGeo  = new THREE.CircleGeometry(0.54, 20)
const handLongGeo   = new THREE.BoxGeometry(0.07, 0.38, 0.07)
const handShortGeo  = new THREE.BoxGeometry(0.07, 0.24, 0.07)
const clockDotGeo   = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8)
const _shieldOutline = (() => {
  const s = new THREE.Shape()
  s.moveTo(-0.48,  0.52)
  s.lineTo( 0.48,  0.52)
  s.lineTo( 0.48,  0.04)
  s.quadraticCurveTo( 0.48, -0.42,  0, -0.68)
  s.quadraticCurveTo(-0.48, -0.42, -0.48, 0.04)
  s.closePath()
  return s
})()
const shieldExtrudeGeo = new THREE.ExtrudeGeometry(_shieldOutline, {
  depth: 0.14, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2,
})
shieldExtrudeGeo.center()
const shieldBossGeo   = new THREE.SphereGeometry(0.09, 10, 8)
const shieldCrossVGeo = new THREE.BoxGeometry(0.09, 0.54, 0.05)
const shieldCrossHGeo = new THREE.BoxGeometry(0.38, 0.09, 0.05)
const ringInnerGeo  = new THREE.RingGeometry(0.78, 0.90, 24)
const ringOuterGeo  = new THREE.RingGeometry(1.05, 1.18, 24)
const shadowGeo     = new THREE.CircleGeometry(0.8, 20)

// ─── Shared materials (one per power-up type) ────────────────────────────────
// energyMat uses MeshBasicMaterial so lighting never muddles its color.
// PowerUpAnimator lerps its color directly between gold and creamy yellow.
const energyMat        = new THREE.MeshBasicMaterial({ color: '#f5a400' })
const energyGoldColor  = new THREE.Color('#f5a400')
const energyCreamColor = new THREE.Color('#fff3a0')
const battCapMat = new THREE.MeshStandardMaterial({
  color: '#b0bec5', roughness: 0.3, metalness: 0.7,
})
const clockBodyMat = new THREE.MeshStandardMaterial({
  color: '#448aff', emissive: '#2962ff', emissiveIntensity: 0.8,
  roughness: 0.5, metalness: 0,
})
const shieldMat = new THREE.MeshStandardMaterial({
  color: '#7c3aed', emissive: '#3d0099', emissiveIntensity: 0.8,
  roughness: 0.4, metalness: 0,
})

// Non-emissive shared materials
const clockFaceMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 })
const clockHandMat = new THREE.MeshStandardMaterial({ color: '#1a237e', roughness: 1, metalness: 0 })
const clockDotMat  = new THREE.MeshStandardMaterial({ color: '#e53935', roughness: 1, metalness: 0 })
const crossMat      = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, side: THREE.DoubleSide })
const shieldBossMat = new THREE.MeshStandardMaterial({ color: '#ffd740', roughness: 0.2, metalness: 0.85 })
const shadowMat    = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.16, depthWrite: false })

// Per-type glow ring materials (inner/outer × 3 types = 6 materials)
function ringMat(color: string, opacity: number) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
}
const RING_MAT: Record<string, [THREE.MeshBasicMaterial, THREE.MeshBasicMaterial,
                                  THREE.MeshBasicMaterial, THREE.MeshBasicMaterial]> = {
  energy: [ringMat('#ffd740', 0.50), ringMat('#ffd740', 0.26), ringMat('#fff080', 0.14), ringMat('#fff080', 0.06)],
  clock:  [ringMat('#448aff', 0.44), ringMat('#448aff', 0.22), ringMat('#448aff', 0.10), ringMat('#448aff', 0.05)],
  shield: [ringMat('#9d46ff', 0.44), ringMat('#9d46ff', 0.22), ringMat('#9d46ff', 0.10), ringMat('#9d46ff', 0.05)],
}

const EMISSIVE_MATS = [clockBodyMat, shieldMat]

// ─── PowerUpAnimator ──────────────────────────────────────────────────────────
// Mount once in the scene. Updates shared emissive materials a single time
// per frame regardless of how many power-ups are active.
export function PowerUpAnimator(): null {
  useFrame(({ clock }) => {
    const t         = clock.getElapsedTime()
    const intensity = 0.4 + Math.sin(t * 2.4) * 0.8
    for (const mat of EMISSIVE_MATS) mat.emissiveIntensity = intensity

    // Lerp energy battery color between gold and creamy yellow
    const lerpT = (Math.sin(t * 2.4) + 1) / 2
    energyMat.color.lerpColors(energyGoldColor, energyCreamColor, lerpT)
  })
  return null
}

// ─── Shapes ───────────────────────────────────────────────────────────────────

function EnergyShape(): JSX.Element {
  return (
    <group>
      <mesh geometry={battBodyGeo} material={energyMat}  castShadow />
      <mesh geometry={battCapGeo}  material={battCapMat} position={[0,  0.55, 0]} castShadow />
      <mesh geometry={battCapGeo}  material={battCapMat} position={[0, -0.55, 0]} castShadow />
      <mesh geometry={battTermGeo} material={battCapMat} position={[0,  0.69, 0]} castShadow />
    </group>
  )
}

function ClockShape(): JSX.Element {
  return (
    <group>
      <mesh geometry={clockBodyGeo} material={clockBodyMat} castShadow />
      <mesh geometry={clockFaceGeo} material={clockFaceMat}
            position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh geometry={handShortGeo} material={clockHandMat} position={[-0.08, 0.16, 0.04]} />
      <mesh geometry={handLongGeo}  material={clockHandMat} position={[0,     0.16, -0.1]} />
      <mesh geometry={clockDotGeo}  material={clockDotMat}  position={[0,     0.17,  0]} />
    </group>
  )
}

function ShieldShape(): JSX.Element {
  return (
    <group>
      <mesh geometry={shieldExtrudeGeo} material={shieldMat}    castShadow />
      <mesh geometry={shieldCrossVGeo}  material={crossMat}     position={[0, 0.04, 0.13]} />
      <mesh geometry={shieldCrossHGeo}  material={crossMat}     position={[0, 0.04, 0.13]} />
      <mesh geometry={shieldBossGeo}    material={shieldBossMat} position={[0, 0.04, 0.14]} castShadow />
    </group>
  )
}

// ─── Glow rings ───────────────────────────────────────────────────────────────

function GlowRings({ type, innerScale, outerScale, matIdx }: {
  type:       string
  innerScale: number
  outerScale: number
  matIdx:     0 | 2   // 0 = animated inner pair, 2 = static outer pair
}): JSX.Element {
  const mats = RING_MAT[type] ?? RING_MAT.energy
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <mesh geometry={ringInnerGeo} material={mats[matIdx]}     scale={[innerScale, innerScale, 1]} />
      <mesh geometry={ringOuterGeo} material={mats[matIdx + 1]} scale={[outerScale, outerScale, 1]} />
    </group>
  )
}

// ─── PowerUp ──────────────────────────────────────────────────────────────────

type Props = PowerUpEntity

export default function PowerUp({ type, position }: Props): JSX.Element {
  const bodyRef      = useRef<THREE.Group>(null)
  const innerRingRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    if (bodyRef.current) {
      bodyRef.current.position.y = 0.65 + Math.sin(t * 1.6 + position.x) * 0.14
      bodyRef.current.rotation.y = t * 0.8
    }

    if (innerRingRef.current) {
      const s = 0.92 + Math.sin(t * 1.8) * 0.08
      innerRingRef.current.scale.setScalar(s)
    }
  })

  return (
    <group position={[position.x, 0, position.z]}>
      <group ref={bodyRef}>
        {type === 'energy' && <group rotation={[Math.PI / 3, 0, Math.PI / 6]}><EnergyShape /></group>}
        {type === 'clock'  && <ClockShape  />}
        {type === 'shield' && <ShieldShape />}
      </group>

      <group ref={innerRingRef}>
        <GlowRings type={type} innerScale={1}    outerScale={1}    matIdx={0} />
      </group>
      <GlowRings type={type} innerScale={1.18} outerScale={1.22} matIdx={2} />

      <mesh geometry={shadowGeo} material={shadowMat}
            rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />
    </group>
  )
}

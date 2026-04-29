import { Suspense, type JSX } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky }    from '@react-three/drei'

import { useMouseSteering }              from '../../hooks/useMouseSteering'
import { useGameStore }                  from '../../store/gameStore'

import Ground                            from './Ground'
import Train                             from './Train'
import { ObstacleInstances }             from './Obstacle'
import PowerUp, { PowerUpAnimator }      from './PowerUp'
import FollowCamera                      from './FollowCamera'
import ZoneManager                       from '../../zones/ZoneManager'
import { WagonInstances }                from '../models/Wagon'
import type { MouseNDC }                 from '../../types'

function Scene({ mouseRef }: { mouseRef: React.MutableRefObject<MouseNDC> }): JSX.Element {
  // Only powerups still need a per-item React component (individual bob/spin).
  // Wagons and obstacles are fully instanced and read the store themselves.
  const powerups = useGameStore((s) => s.powerups)

  return (
    <>
      {/* ── Systems ────────────────────────────────────────────────────── */}
      <ZoneManager />
      <FollowCamera />

      {/* ── Lighting ───────────────────────────────────────────────────── */}
      <ambientLight intensity={1.1} color="#fffdf0" />
      <directionalLight
        position={[30, 50, 20]}
        intensity={1.6}
        color="#fff8e8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0004}
      />
      <hemisphereLight args={['#c9e8ff', '#7ec850', 0.7]} />

      {/* ── Sky ────────────────────────────────────────────────────────── */}
      <Sky
        distance={4500}
        sunPosition={[1, 0.4, 0.2]}
        inclination={0.49}
        azimuth={0.25}
        mieCoefficient={0.003}
        mieDirectionalG={0.8}
        rayleigh={0.4}
        turbidity={3}
      />

      {/* ── World ──────────────────────────────────────────────────────── */}
      <Ground />
      <Train mouseRef={mouseRef} />

      {/* ── Instanced entity renderers (read store internally) ──────────── */}
      <WagonInstances />
      <ObstacleInstances />

      {/* ── Per-item components (still need individual animation) ────────── */}
      <PowerUpAnimator />
      {powerups.map((p) => (
        <PowerUp key={p.id} {...p} />
      ))}
    </>
  )
}

export default function GameScene(): JSX.Element {
  const mouseRef = useMouseSteering()

  return (
    <Canvas
      shadows
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: true }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        <Scene mouseRef={mouseRef} />
      </Suspense>
    </Canvas>
  )
}

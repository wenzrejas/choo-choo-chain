import { useState, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ZONE_SIZE, ZONE_RADIUS } from '../../utils/constants'
import { trainPosRef } from '../../trainState'

interface TileCoord { tx: number; tz: number }

// ─── Seeded tile color ────────────────────────────────────────────────────────

function tileHash(tx: number, tz: number): number {
  let h = (tx * 73856093) ^ (tz * 19349663)
  h = ((h >>> 16) ^ h) * 0x45d9f3b
  h = ((h >>> 16) ^ h)
  return Math.abs(h)
}

/**
 * Kenney-style grass palette — bright, saturated greens with subtle
 * variation so adjacent tiles read as a living field, not a flat plane.
 * Colors sampled from Kenney's Nature Pack and Train Kit screenshots.
 */
const COLOR_PALETTE = [
  '#6abf5e', // vivid mid-green (base)
  '#72c465', // slightly lighter
  '#64b858', // slightly darker
  '#6ec262', // warm tint
  '#68bb5a', // cool tint
  '#74c668', // bright
  '#62b656', // muted
  '#70c060', // neutral
]

function tileColor(hash: number): string {
  return COLOR_PALETTE[hash % COLOR_PALETTE.length]
}

function computeActiveTiles(cx: number, cz: number): TileCoord[] {
  const tiles: TileCoord[] = []
  for (let dx = -ZONE_RADIUS; dx <= ZONE_RADIUS; dx++) {
    for (let dz = -ZONE_RADIUS; dz <= ZONE_RADIUS; dz++) {
      tiles.push({ tx: cx + dx, tz: cz + dz })
    }
  }
  return tiles
}

// ─── Single ground tile ───────────────────────────────────────────────────────

function Tile({ tx, tz }: TileCoord): JSX.Element {
  const hash  = useMemo(() => tileHash(tx, tz), [tx, tz])
  const color = useMemo(() => tileColor(hash), [hash])

  // Every ~4th tile gets a faint lighter stripe for visual rhythm
  const hasStripe = hash % 4 === 0

  const wx = tx * ZONE_SIZE + ZONE_SIZE / 2
  const wz = tz * ZONE_SIZE + ZONE_SIZE / 2

  return (
    <group position={[wx, 0, wz]}>
      {/* Ground plane — flat matte (roughness 1, no metalness = Kenney look) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ZONE_SIZE, ZONE_SIZE]} />
        <meshStandardMaterial color={color} roughness={1} metalness={0} />
      </mesh>

      {/* Subtle lighter stripe on alternating tiles — reads as grass texture */}
      {hasStripe && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          <planeGeometry args={[ZONE_SIZE * 0.96, ZONE_SIZE * 0.3]} />
          <meshBasicMaterial color="#7ecf6a" transparent opacity={0.18} />
        </mesh>
      )}
    </group>
  )
}

// ─── Ground tile manager ──────────────────────────────────────────────────────

export default function Ground(): JSX.Element {
  const initialTiles = useMemo(() => computeActiveTiles(0, 0), [])
  const [tiles, setTiles] = useState<TileCoord[]>(initialTiles)
  const centerRef = useRef<TileCoord>({ tx: 0, tz: 0 })

  useFrame(() => {
    const pos = trainPosRef.current
    const tx  = Math.floor(pos.x / ZONE_SIZE)
    const tz  = Math.floor(pos.z / ZONE_SIZE)

    if (tx !== centerRef.current.tx || tz !== centerRef.current.tz) {
      centerRef.current = { tx, tz }
      setTiles(computeActiveTiles(tx, tz))
    }
  })

  return (
    <group>
      {tiles.map(({ tx, tz }) => (
        <Tile key={`${tx}:${tz}`} tx={tx} tz={tz} />
      ))}
    </group>
  )
}

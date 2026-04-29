import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ZONE_SIZE, ZONE_RADIUS } from '../../utils/constants'
import { trainPosRef } from '../../trainState'

const GRID_SIDE = ZONE_RADIUS * 2 + 1
const MAX_TILES = GRID_SIDE * GRID_SIDE  // 289 with ZONE_RADIUS=8

// Pre-allocated THREE.Color palette — never reallocated
const PALETTE: THREE.Color[] = [
  '#6abf5e', '#72c465', '#64b858', '#6ec262',
  '#68bb5a', '#74c668', '#62b656', '#70c060',
].map(c => new THREE.Color(c))

function tileHash(tx: number, tz: number): number {
  let h = ((tx * 73856093) ^ (tz * 19349663)) >>> 0
  h = (((h >>> 16) ^ h) * 0x45d9f3b) >>> 0
  return ((h >>> 16) ^ h) >>> 0
}

// Rotation baked into geometry so every instance only needs a translation matrix
const tileGeo = new THREE.PlaneGeometry(ZONE_SIZE, ZONE_SIZE)
tileGeo.rotateX(-Math.PI / 2)

const stripeGeo = new THREE.PlaneGeometry(ZONE_SIZE * 0.96, ZONE_SIZE * 0.3)
stripeGeo.rotateX(-Math.PI / 2)

// White base — per-instance colour applied via setColorAt
const tileMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 })
// Single shared stripe colour — no per-instance colour needed
const stripeMat = new THREE.MeshBasicMaterial({ color: '#7ecf6a', transparent: true, opacity: 0.18 })

// Scratch matrix — pure translation, no rotation/scale variation
const _m = new THREE.Matrix4()

export default function Ground(): null {
  const { scene }  = useThree()
  const floorRef   = useRef<THREE.InstancedMesh | null>(null)
  const stripeRef  = useRef<THREE.InstancedMesh | null>(null)
  // Infinity forces a rebuild on the first frame
  const centerRef  = useRef({ tx: Infinity, tz: Infinity })

  useEffect(() => {
    const floor  = new THREE.InstancedMesh(tileGeo,   tileMat,   MAX_TILES)
    const stripe = new THREE.InstancedMesh(stripeGeo, stripeMat, MAX_TILES)

    floor.count          = 0
    floor.receiveShadow  = true
    floor.castShadow     = false
    floor.frustumCulled  = false

    stripe.count         = 0
    stripe.castShadow    = false
    stripe.receiveShadow = false
    stripe.frustumCulled = false

    scene.add(floor, stripe)
    floorRef.current  = floor
    stripeRef.current = stripe

    return () => {
      scene.remove(floor, stripe)
      floorRef.current = stripeRef.current = null
    }
  }, [scene])

  useFrame(() => {
    const floor  = floorRef.current
    const stripe = stripeRef.current
    if (!floor || !stripe) return

    const pos = trainPosRef.current
    const tx  = Math.floor(pos.x / ZONE_SIZE)
    const tz  = Math.floor(pos.z / ZONE_SIZE)
    // Only rebuild when the player crosses into a new tile column/row
    if (tx === centerRef.current.tx && tz === centerRef.current.tz) return
    centerRef.current = { tx, tz }

    let fi = 0  // floor instance index
    let si = 0  // stripe instance index

    for (let dx = -ZONE_RADIUS; dx <= ZONE_RADIUS; dx++) {
      for (let dz = -ZONE_RADIUS; dz <= ZONE_RADIUS; dz++) {
        const ttx  = tx + dx
        const ttz  = tz + dz
        const wx   = ttx * ZONE_SIZE + ZONE_SIZE / 2
        const wz   = ttz * ZONE_SIZE + ZONE_SIZE / 2
        const hash = tileHash(ttx, ttz)

        _m.makeTranslation(wx, 0, wz)
        floor.setMatrixAt(fi, _m)
        floor.setColorAt(fi, PALETTE[hash % PALETTE.length])
        fi++

        if (hash % 4 === 0) {
          _m.makeTranslation(wx, 0.004, wz)
          stripe.setMatrixAt(si, _m)
          si++
        }
      }
    }

    floor.count  = fi
    stripe.count = si
    floor.instanceMatrix.needsUpdate  = true
    stripe.instanceMatrix.needsUpdate = true
    if (floor.instanceColor) floor.instanceColor.needsUpdate = true
  })

  return null
}

/**
 * zoneGenerator.ts
 *
 * Deterministic, seeded content generation for each zone coordinate.
 * Given the same (zx, zz) pair this function always returns identical
 * entity layouts — so re-entering a zone looks the same as leaving it.
 *
 * Difficulty (obstacle density, wagon rarity) scales with grid distance
 * from the origin, not with elapsed game time.  This gives a natural
 * "explore further = more dangerous" feel.
 */

import * as THREE from 'three'
import type { ZoneContent } from './zoneTypes'
import type { WagonType, ObstacleType, PowerUpType } from '../types'
import {
  ZONE_SIZE,
  ZONE_MARGIN,
  ZONE_SAFE_RADIUS,
  ZONE_OBSTACLE_MIN,
  ZONE_OBSTACLE_MAX,
  ZONE_MAX_DIST,
  ZONE_WAGON_CHANCE,
  ZONE_POWERUP_CHANCE,
  ZONE_START_SAFE_DIST,
  OBSTACLE_TYPES,
  POWERUP_TYPES,
} from '../utils/constants'

// ─── Seeded RNG (mulberry32) ──────────────────────────────────────────────────

/**
 * Returns a deterministic pseudo-random number generator seeded by `seed`.
 * Each call to the returned function advances the sequence and returns a
 * float in [0, 1).
 *
 * mulberry32 by Tommy Ettinger — fast, good distribution, no dependencies.
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s += 0x6D2B79F5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

/** Combine zone coords into a reproducible 32-bit seed. */
function zoneSeed(zx: number, zz: number): number {
  // Large prime mixing — must stay within safe integer range
  const a = (zx + 0x8000) & 0xFFFF    // shift so negatives become positive 16-bit
  const b = (zz + 0x8000) & 0xFFFF
  return ((a << 16) | b) ^ 0x9E3779B9
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Clamp t to [0, 1]. */
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t))

/** Linear interpolate between a and b by t ∈ [0, 1]. */
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Euclidean distance (in zone grid steps) from the origin zone.
 * Zone (0,0) is distance 0; its 8 neighbours are distance 1–√2.
 */
const zoneDist = (zx: number, zz: number): number =>
  Math.sqrt(zx * zx + zz * zz)

/**
 * Normalised difficulty factor [0, 1] for a zone.
 * 0 = closest safe ring, 1 = maximum challenge (ZONE_MAX_DIST+ zones out).
 */
const distFactor = (zx: number, zz: number): number =>
  clamp01((zoneDist(zx, zz) - ZONE_START_SAFE_DIST) / (ZONE_MAX_DIST - ZONE_START_SAFE_DIST))

// ─── Position helpers ─────────────────────────────────────────────────────────

/** World-space X of a zone's western edge. */
const zoneOriginX = (zx: number): number => zx * ZONE_SIZE
/** World-space Z of a zone's northern edge. */
const zoneOriginZ = (zz: number): number => zz * ZONE_SIZE
/** World-space centre X of a zone. */
const zoneCentreX = (zx: number): number => zoneOriginX(zx) + ZONE_SIZE / 2
/** World-space centre Z of a zone. */
const zoneCentreZ = (zz: number): number => zoneOriginZ(zz) + ZONE_SIZE / 2

/**
 * Sample a random position within the zone's spawnable area
 * (inside the margin boundary).
 */
function randomPosInZone(
  zx:  number,
  zz:  number,
  rng: () => number,
): THREE.Vector3 {
  const minX = zoneOriginX(zx) + ZONE_MARGIN
  const maxX = zoneOriginX(zx) + ZONE_SIZE - ZONE_MARGIN
  const minZ = zoneOriginZ(zz) + ZONE_MARGIN
  const maxZ = zoneOriginZ(zz) + ZONE_SIZE - ZONE_MARGIN
  return new THREE.Vector3(
    minX + rng() * (maxX - minX),
    0,
    minZ + rng() * (maxZ - minZ),
  )
}

/**
 * Check whether a candidate position is too close to the zone centre.
 * Used to keep a small open area in the middle of each zone so wagons
 * are reachable without immediately hitting an obstacle.
 */
function tooCloseToCenter(pos: THREE.Vector3, zx: number, zz: number): boolean {
  const dx = pos.x - zoneCentreX(zx)
  const dz = pos.z - zoneCentreZ(zz)
  return Math.sqrt(dx * dx + dz * dz) < ZONE_SAFE_RADIUS
}

// ─── Wagon type selection ─────────────────────────────────────────────────────

/**
 * Choose a wagon type based on zone distance.
 * Further out → higher chance of silver/gold.
 *
 *   dist = 0   → copper 80%, silver 18%, gold  2%
 *   dist = 1   → copper 60%, silver 30%, gold 10%
 *   dist = MAX → copper 30%, silver 40%, gold 30%
 */
function pickWagonType(df: number, rng: () => number): WagonType {
  const copperW = lerp(0.80, 0.30, df)
  const silverW = lerp(0.18, 0.40, df)
  // gold weight = remaining probability
  const r = rng()
  if (r < copperW)                  return 'copper'
  if (r < copperW + silverW)        return 'silver'
  return 'gold'
}

// ─── Main generator ───────────────────────────────────────────────────────────

let _idCounter = 0
const nextId = (): string => `z_${(_idCounter++).toString(36)}`

/**
 * Generate the full content for a zone.
 *
 * Deterministic: the same (zx, zz) always produces the same entities
 * at the same positions with the same types.
 *
 * Call once per zone activation — never call this inside useFrame.
 */
export function generateZoneContent(zx: number, zz: number): ZoneContent {
  const rng = mulberry32(zoneSeed(zx, zz))
  const df  = distFactor(zx, zz)

  // ── Early-out: starting safe zone ───────────────────────────────────────
  if (df <= 0) {
    return { obstacles: [], wagons: [], powerup: null }
  }

  const content: ZoneContent = { obstacles: [], wagons: [], powerup: null }

  // ── Obstacles ─────────────────────────────────────────────────────────────
  // Count scales from ZONE_OBSTACLE_MIN to ZONE_OBSTACLE_MAX with distance.
  const obstacleCount = Math.round(lerp(ZONE_OBSTACLE_MIN, ZONE_OBSTACLE_MAX, df))

  for (let i = 0; i < obstacleCount; i++) {
    // Up to 8 attempts to find a position not in the safe centre zone
    let pos: THREE.Vector3 | null = null
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = randomPosInZone(zx, zz, rng)
      if (!tooCloseToCenter(candidate, zx, zz)) {
        pos = candidate
        break
      }
    }
    if (!pos) continue   // couldn't place obstacle — skip slot

    const type = OBSTACLE_TYPES[
      Math.floor(rng() * OBSTACLE_TYPES.length)
    ] as ObstacleType

    content.obstacles.push({
      id:        nextId(),
      type,
      position:  pos,
      destroyed: false,
    })
  }

  // ── Wagon ─────────────────────────────────────────────────────────────────
  // Placed near the zone centre (easy to see and aim for).
  if (rng() < ZONE_WAGON_CHANCE) {
    const spread = ZONE_SIZE * 0.18    // ±18% of zone size from centre
    const pos = new THREE.Vector3(
      zoneCentreX(zx) + (rng() * 2 - 1) * spread,
      0,
      zoneCentreZ(zz) + (rng() * 2 - 1) * spread,
    )
    content.wagons.push({
      id:       nextId(),
      type:     pickWagonType(df, rng),
      position: pos,
    })
  }

  // ── Power-up ──────────────────────────────────────────────────────────────
  // Rarer than wagons — placed in the back half of the zone so the player
  // has to commit to entering to collect it.
  if (rng() < ZONE_POWERUP_CHANCE) {
    const pos = randomPosInZone(zx, zz, rng)
    const type = POWERUP_TYPES[
      Math.floor(rng() * POWERUP_TYPES.length)
    ] as PowerUpType

    content.powerup = {
      id:       nextId(),
      type,
      position: pos,
    }
  }

  return content
}

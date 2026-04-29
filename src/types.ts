import type * as THREE from 'three'

// ─── Game phases ──────────────────────────────────────────────────────────────
export type GamePhase = 'idle' | 'playing' | 'end'

// ─── Entity types ─────────────────────────────────────────────────────────────
export type WagonType    = 'copper' | 'silver' | 'gold'
export type ObstacleType = 'tree'   | 'bush'   | 'boulder'
export type PowerUpType  = 'energy' | 'clock'  | 'shield'

// ─── World entities ───────────────────────────────────────────────────────────
export interface WagonEntity {
  id:       string
  type:     WagonType
  position: THREE.Vector3
}

export interface ObstacleEntity {
  id:        string
  type:      ObstacleType
  position:  THREE.Vector3
  destroyed: boolean
}

export interface PowerUpEntity {
  id:       string
  type:     PowerUpType
  position: THREE.Vector3
}

// ─── Wagon collection breakdown ───────────────────────────────────────────────
export type WagonCounts = Record<WagonType, number>

// ─── Mouse NDC coordinates ────────────────────────────────────────────────────
export interface MouseNDC {
  x: number
  y: number
}

// ─── Spawn zone ───────────────────────────────────────────────────────────────
export type SpawnZoneName = 'FORWARD_CLOSE' | 'FORWARD_MID' | 'FORWARD_FAR' | 'FLANK'

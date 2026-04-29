import type { WagonType, ObstacleType, PowerUpType } from '../types'

// ─── Train ──────────────────────────────────────────────────────────────────
export const TRAIN_BASE_SPEED       = 8    as const
export const TRAIN_BOOST_SPEED      = 14   as const
export const TRAIN_STEER_STRENGTH   = 2  as const
export const TRAIN_SEGMENT_GAP      = 1.3  as const

// ─── Energy ─────────────────────────────────────────────────────────────────
export const ENERGY_MAX             = 100  as const
export const ENERGY_DRAIN_RATE      = 20   as const
export const ENERGY_PICKUP_AMOUNT   = 40   as const

// ─── Timer ──────────────────────────────────────────────────────────────────
export const GAME_DURATION_SECONDS  = 80   as const
export const CLOCK_BONUS_SECONDS    = 10   as const

// ─── Shield ─────────────────────────────────────────────────────────────────
export const SHIELD_DURATION        = 6    as const

// ─── Wagon points & visuals ──────────────────────────────────────────────────
export const WAGON_POINTS: Record<WagonType, number> = {
  copper: 10,
  silver: 50,
  gold:   100,
}

export const WAGON_COLORS: Record<WagonType, string> = {
  // Kenney-style saturated toy colours — pop clearly against bright grass
  copper: '#e07b39',   // warm vivid orange-brown
  silver: '#90a4ae',   // muted blue-grey (Kenney uses this for stone/metal)
  gold:   '#fdd835',   // bright Kenney yellow (same as coin colour in TrainMania)
}

// ─── Entity type lists ────────────────────────────────────────────────────────
export const OBSTACLE_TYPES: ObstacleType[] = ['tree', 'bush', 'boulder']
export const POWERUP_TYPES:  PowerUpType[]  = ['energy', 'clock', 'shield']

// ─── Power-up colors ─────────────────────────────────────────────────────────
export const POWERUP_COLORS: Record<PowerUpType, string> = {
  energy: '#00ffaa',
  clock:  '#4488ff',
  shield: '#ff8800',
}

// ─── Collision radii ─────────────────────────────────────────────────────────
export const COLLISION_RADII = {
  wagon:     0.7,
  obstacle:  0.6,
  powerup:   0.8,
  trainHead: 0.5,
  segment:   0.5,
} as const

// ─── Camera ──────────────────────────────────────────────────────────────────
export const CAMERA_DISTANCE      = 14    as const
export const CAMERA_HEIGHT        = 26    as const
export const CAMERA_POS_LAG       = 0.06 as const
export const CAMERA_LOOK_LAG      = 0.14 as const
export const CAMERA_LOOK_AHEAD    = 2   as const
export const CAMERA_ROLL_STRENGTH = 0 as const
export const CAMERA_ROLL_LAG      = 0 as const
export const CAMERA_BASE_FOV      = 70   as const
export const CAMERA_BOOST_FOV     = 75   as const
export const CAMERA_FOV_LAG       = 0.08 as const

// ─── Zone grid ───────────────────────────────────────────────────────────────
/**
 * World-unit size of each zone (square).
 * One zone = one ground tile = one unit of content.
 * Increasing this makes the world feel more open between obstacles.
 */
export const ZONE_SIZE   = 16 as const

/**
 * How many zones outward from the player's zone to keep loaded.
 * Active grid = (2 * ZONE_RADIUS + 1)² zones.
 * 3 → 7×7 = 49 zones loaded at a time.
 */
export const ZONE_RADIUS = 8  as const

// ─── Zone content generation ──────────────────────────────────────────────────
/**
 * Zone distance (in grid steps from origin) at which obstacle count and wagon
 * quality reach their maximum. Zones beyond this distance stay at max density.
 */
export const ZONE_MAX_DIST = 12 as const

/** Obstacle count range [min, max] — scales linearly with distance factor. */
export const ZONE_OBSTACLE_MIN = 0 as const
export const ZONE_OBSTACLE_MAX = 4 as const

/** Fraction of zone size kept clear around the zone center (no obstacles). */
export const ZONE_SAFE_RADIUS = 4 as const

/** Margin from zone edge where nothing spawns (avoids edge-overlap jank). */
export const ZONE_MARGIN = 2 as const

/** Probability [0, 1] that a zone contains a collectible wagon. */
export const ZONE_WAGON_CHANCE = 0.5 as const

/** Probability [0, 1] that a zone contains a power-up. */
export const ZONE_POWERUP_CHANCE = 0.2 as const

/**
 * Distance (grid steps) inside which zones never spawn any content.
 * Gives the player a clear field at the start of each game.
 */
export const ZONE_START_SAFE_DIST = 1.6 as const

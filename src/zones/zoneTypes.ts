import type { WagonEntity, ObstacleEntity, PowerUpEntity } from "../types";

// ─── Zone coordinate ──────────────────────────────────────────────────────────

export interface ZoneCoord {
  zx: number; // zone column  (world_x = zx * ZONE_SIZE)
  zz: number; // zone row     (world_z = zz * ZONE_SIZE)
}

/** Canonical string key for a zone: "zx:zz". */
export const zoneKey = (zx: number, zz: number): string => `${zx}:${zz}`;

/** Parse a zone key back into coords. */
export const parseZoneKey = (key: string): ZoneCoord => {
  const [zx, zz] = key.split(":").map(Number);
  return { zx, zz };
};

// ─── Zone content ─────────────────────────────────────────────────────────────

/**
 * The full set of entities that belong to a single zone.
 * Generated once per zone key and never changes (deterministic from coords).
 */
export interface ZoneContent {
  obstacles: ObstacleEntity[];
  wagons: WagonEntity[];
  powerup: PowerUpEntity | null;
}

/**
 * The IDs of entities currently live in the Zustand store on behalf of
 * a specific zone.  Used to remove them when the zone deactivates.
 */
export interface ZoneEntityIds {
  wagons: string[];
  obstacles: string[];
  powerups: string[]; // 0 or 1 entries
}

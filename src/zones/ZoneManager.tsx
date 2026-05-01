/**
 * ZoneManager.tsx
 *
 * R3F component (renders null) that manages the lifecycle of all world zones.
 *
 * Responsibilities:
 *   1. Track which zone grid cell the player occupies each frame.
 *   2. When the player crosses a zone boundary, compute the new set of
 *      active zones (a ZONE_RADIUS-wide grid centred on the player).
 *   3. Activate newly-in-range zones: generate content deterministically,
 *      push entities into the Zustand store, record the entity IDs.
 *   4. Deactivate out-of-range zones: remove their entity IDs from the
 *      store, release the ID records.
 *
 * Guarantees:
 *   - generateZoneContent() is called exactly once per zone key per
 *     activation — never inside useFrame's hot path.
 *   - Obstacles therefore spawn exactly once per zone activation, not
 *     every frame.
 *   - The store is the single source of truth for collision detection
 *     (Train.tsx is unchanged).
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../store/gameStore";
import { trainPosRef } from "../trainState";
import { ZONE_SIZE, ZONE_RADIUS } from "../utils/constants";
import { generateZoneContent } from "./zoneGenerator";
import { zoneKey, parseZoneKey } from "./zoneTypes";
import type { ZoneEntityIds } from "./zoneTypes";

export default function ZoneManager(): null {
  /**
   * Set of zone keys currently active (entities live in store).
   * Module-level refs — never trigger React re-renders.
   */
  const activeZonesRef = useRef(new Set<string>());

  /**
   * For each active zone key, the IDs of the entities we pushed into
   * the store.  Used to surgically remove only those entities on
   * deactivation — without touching entities from other zones.
   */
  const zoneEntityIds = useRef(new Map<string, ZoneEntityIds>());

  /** Last grid position so we skip re-computation on frames with no movement. */
  const prevGridRef = useRef({ zx: NaN, zz: NaN });

  useFrame(() => {
    const { phase } = useGameStore.getState();
    if (phase !== "playing") return;

    // ── 1. Compute current zone grid cell ────────────────────────────────
    const pos = trainPosRef.current;
    const zx = Math.floor(pos.x / ZONE_SIZE);
    const zz = Math.floor(pos.z / ZONE_SIZE);

    // Skip everything if the player hasn't crossed a zone boundary
    if (zx === prevGridRef.current.zx && zz === prevGridRef.current.zz) return;
    prevGridRef.current = { zx, zz };

    // ── 2. Build the desired active set ──────────────────────────────────
    const desired = new Set<string>();
    for (let dx = -ZONE_RADIUS; dx <= ZONE_RADIUS; dx++) {
      for (let dz = -ZONE_RADIUS; dz <= ZONE_RADIUS; dz++) {
        desired.add(zoneKey(zx + dx, zz + dz));
      }
    }

    const store = useGameStore.getState();

    // ── 3. Deactivate zones that left the active set ──────────────────────
    for (const key of activeZonesRef.current) {
      if (desired.has(key)) continue;

      const ids = zoneEntityIds.current.get(key);
      if (ids) {
        // Remove in reverse-dependency order: powerups → wagons → obstacles
        ids.powerups.forEach((id) => store.removePowerup(id));
        ids.wagons.forEach((id) => store.removeWagon(id));
        ids.obstacles.forEach((id) => store.removeObstacle(id));
        zoneEntityIds.current.delete(key);
      }
      activeZonesRef.current.delete(key);
    }

    // ── 4. Activate zones that entered the active set ─────────────────────
    for (const key of desired) {
      if (activeZonesRef.current.has(key)) continue;

      // Re-read store after potential mutations above
      const freshStore = useGameStore.getState();

      const { zx: kzx, zz: kzz } = parseZoneKey(key);
      const content = generateZoneContent(kzx, kzz);
      const ids: ZoneEntityIds = { wagons: [], obstacles: [], powerups: [] };

      // Spawn obstacles first (they're the most important for collision)
      for (const o of content.obstacles) {
        freshStore.spawnObstacle(o);
        ids.obstacles.push(o.id);
      }

      // Spawn wagons
      for (const w of content.wagons) {
        freshStore.spawnWagon(w);
        ids.wagons.push(w.id);
      }

      // Spawn power-up (optional)
      if (content.powerup) {
        freshStore.spawnPowerup(content.powerup);
        ids.powerups.push(content.powerup.id);
      }

      zoneEntityIds.current.set(key, ids);
      activeZonesRef.current.add(key);
    }
  });

  return null;
}

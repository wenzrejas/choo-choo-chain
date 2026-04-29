/**
 * useSpawner.ts — DEPRECATED
 *
 * Replaced by ZoneManager (src/zones/ZoneManager.tsx).
 * Spawning is no longer interval/frame-based; each zone owns its content
 * and generates it once deterministically when the zone activates.
 *
 * This file is kept to avoid breaking any imports that haven't been
 * updated yet. It is a no-op.
 */
export function useSpawner(): void { /* no-op */ }

import { clamp, lerp } from "./math";
import { GAME_DURATION_SECONDS } from "./constants";
import type { WagonType } from "../types";

// ─── Difficulty config shape ──────────────────────────────────────────────────

export interface DifficultyConfig {
  /** Normalised difficulty: 0 = easiest (game start), 1 = hardest. */
  factor: number;

  /** Seconds between wagon spawn attempts. */
  wagonInterval: number;

  /** Seconds between obstacle spawn attempts. */
  obstacleInterval: number;

  /** Seconds between power-up spawn attempts. */
  powerupInterval: number;

  /** Maximum simultaneous obstacles allowed on the field. */
  maxObstacles: number;

  /** Maximum simultaneous wagons allowed on the field. */
  maxWagons: number;

  /** Wagon-type spawn weights at this difficulty. */
  wagonWeights: Record<WagonType, number>;
}

// ─── Difficulty curve ─────────────────────────────────────────────────────────

/**
 * Pure function — no side effects, testable in isolation.
 *
 * Difficulty is driven by two independent signals:
 *   - timeFactor:  how much of the game has elapsed (grows from 0 → 1 over 75 s)
 *   - scoreFactor: how well the player is doing    (saturates at score = 500)
 *
 * Combined 75 / 25 so time is the dominant driver but a high score
 * can push difficulty noticeably higher than time alone would suggest.
 *
 * @param timeRemaining  seconds left on the clock
 * @param score          current accumulated score
 */
export function getDifficulty(
  timeRemaining: number,
  score: number,
): DifficultyConfig {
  const timeElapsed = GAME_DURATION_SECONDS - timeRemaining;
  const timeFactor = clamp(timeElapsed / 75, 0, 1); // ramps over 75 s
  const scoreFactor = clamp(score / 500, 0, 1); // saturates at 500 pts
  const factor = clamp(timeFactor * 0.75 + scoreFactor * 0.25, 0, 1);

  return {
    factor,

    // Spawn intervals shrink as difficulty rises (faster spawning = more chaos)
    wagonInterval: lerp(2.2, 0.9, factor), // seconds
    obstacleInterval: lerp(3.8, 1.0, factor),
    powerupInterval: lerp(9.0, 4.0, factor),

    // More obstacles at high difficulty; wagons stay plentiful (tempting targets)
    maxObstacles: Math.round(lerp(5, 22, factor)),
    maxWagons: Math.round(lerp(6, 14, factor)),

    // Wagon rarity shifts: gold becomes slightly more common as reward for
    // surviving the increasingly dangerous field.
    wagonWeights: {
      copper: lerp(0.62, 0.48, factor),
      silver: lerp(0.29, 0.36, factor),
      gold: lerp(0.09, 0.16, factor),
    },
  };
}

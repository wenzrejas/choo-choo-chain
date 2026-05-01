import { create } from "zustand";
import type {
  GamePhase,
  WagonType,
  PowerUpType,
  WagonCounts,
  WagonEntity,
  ObstacleEntity,
  PowerUpEntity,
} from "../types";
import {
  ENERGY_MAX,
  GAME_DURATION_SECONDS,
  CLOCK_BONUS_SECONDS,
  SHIELD_DURATION,
  ENERGY_PICKUP_AMOUNT,
  WAGON_POINTS,
} from "../utils/constants";

// ─── Store shape ──────────────────────────────────────────────────────────────

interface GameState {
  // Phase
  phase: GamePhase;

  // Score
  score: number;
  wagonsCollected: WagonCounts;

  // Timer
  timeRemaining: number;

  // Energy
  energy: number;
  isBoosting: boolean;

  // Shield
  shieldActive: boolean;
  shieldTimeRemaining: number;

  // World entities
  wagons: WagonEntity[];
  obstacles: ObstacleEntity[];
  powerups: PowerUpEntity[];

  /**
   * Ordered list of wagon types for each tail segment.
   * tailTypes[0] = the segment directly behind the loco (first collected),
   * tailTypes[n-1] = the last (oldest) segment at the tail end.
   * Length == number of segments == visual tail length.
   */
  tailTypes: WagonType[];
}

interface GameActions {
  // Phase transitions
  startGame: () => void;
  endGame: () => void;
  goToIdle: () => void;

  // Timer
  tickTimer: (delta: number) => void;

  // Energy
  startBoost: () => void;
  stopBoost: () => void;
  drainEnergy: (amount: number) => void;
  addEnergy: (amount?: number) => void;

  // Shield
  activateShield: () => void;

  // Clock
  addTime: (seconds?: number) => void;

  // Wagon collection — also grows the tail
  collectWagon: (wagonId: string, wagonType: WagonType) => void;

  // World entity management
  spawnWagon: (wagon: WagonEntity) => void;
  spawnObstacle: (obs: ObstacleEntity) => void;
  spawnPowerup: (powerup: PowerUpEntity) => void;

  removeWagon: (id: string) => void;
  removeObstacle: (id: string) => void;
  removePowerup: (id: string) => void;
  destroyObstacle: (id: string) => void;

  collectPowerup: (id: string, type: PowerUpType) => void;

  // Collision
  triggerGameOver: () => void;
}

type GameStore = GameState & GameActions;

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE: GameState = {
  phase: "idle",

  score: 0,
  wagonsCollected: { copper: 0, silver: 0, gold: 0 },

  timeRemaining: GAME_DURATION_SECONDS,

  energy: ENERGY_MAX,
  isBoosting: false,

  shieldActive: false,
  shieldTimeRemaining: 0,

  wagons: [],
  obstacles: [],
  powerups: [],

  tailTypes: [],
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL_STATE,

  // ── Phase transitions ──────────────────────────────────────────────────
  startGame: () => set({ ...INITIAL_STATE, phase: "playing" }),
  endGame: () => set({ phase: "end" }),
  goToIdle: () => set({ phase: "idle" }),

  // ── Timer ──────────────────────────────────────────────────────────────
  tickTimer: (delta) => {
    const { timeRemaining, shieldTimeRemaining } = get();
    const newTime = Math.max(0, timeRemaining - delta);
    const newShieldTime = Math.max(0, shieldTimeRemaining - delta);

    set({
      timeRemaining: newTime,
      shieldTimeRemaining: newShieldTime,
      shieldActive: newShieldTime > 0,
    });

    if (newTime <= 0) get().endGame();
  },

  // ── Energy ────────────────────────────────────────────────────────────
  startBoost: () => {
    if (get().energy > 0) set({ isBoosting: true });
  },
  stopBoost: () => set({ isBoosting: false }),

  drainEnergy: (amount) => {
    const next = Math.max(0, get().energy - amount);
    set({ energy: next, isBoosting: next > 0 ? get().isBoosting : false });
  },

  addEnergy: (amount = ENERGY_PICKUP_AMOUNT) =>
    set({ energy: Math.min(ENERGY_MAX, get().energy + amount) }),

  // ── Shield ────────────────────────────────────────────────────────────
  activateShield: () =>
    set({ shieldActive: true, shieldTimeRemaining: SHIELD_DURATION }),

  // ── Clock ─────────────────────────────────────────────────────────────
  addTime: (seconds = CLOCK_BONUS_SECONDS) =>
    set({ timeRemaining: get().timeRemaining + seconds }),

  // ── Wagon collection ───────────────────────────────────────────────────
  collectWagon: (wagonId, wagonType) => {
    const { score, wagonsCollected, wagons, tailTypes } = get();
    const points = WAGON_POINTS[wagonType] ?? 1;
    set({
      score: score + points,
      wagonsCollected: {
        ...wagonsCollected,
        [wagonType]: wagonsCollected[wagonType] + 1,
      },
      wagons: wagons.filter((w) => w.id !== wagonId),
      // Append new wagon type to the tail — new segment grows at the back
      tailTypes: [...tailTypes, wagonType],
    });
  },

  // ── World entity management ───────────────────────────────────────────
  spawnWagon: (wagon) => set((s) => ({ wagons: [...s.wagons, wagon] })),
  spawnObstacle: (obs) => set((s) => ({ obstacles: [...s.obstacles, obs] })),
  spawnPowerup: (powerup) =>
    set((s) => ({ powerups: [...s.powerups, powerup] })),

  removeWagon: (id) =>
    set((s) => ({ wagons: s.wagons.filter((x) => x.id !== id) })),
  removeObstacle: (id) =>
    set((s) => ({ obstacles: s.obstacles.filter((x) => x.id !== id) })),
  removePowerup: (id) =>
    set((s) => ({ powerups: s.powerups.filter((x) => x.id !== id) })),

  destroyObstacle: (id) =>
    set((s) => ({
      obstacles: s.obstacles.map((o) =>
        o.id === id ? { ...o, destroyed: true } : o,
      ),
    })),

  collectPowerup: (id, type) => {
    const store = get();
    if (type === "energy") store.addEnergy();
    else if (type === "clock") store.addTime();
    else if (type === "shield") store.activateShield();
    store.removePowerup(id);
  },

  // ── Collision ─────────────────────────────────────────────────────────
  triggerGameOver: () => get().endGame(),
}));

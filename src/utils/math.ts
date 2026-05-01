import * as THREE from "three";

/** Linear interpolation */
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/** Clamp value between min and max */
export const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

/**
 * Shortest angular delta between two angles (handles wrapping).
 * Returns a value in [-PI, PI].
 */
export const angleDelta = (current: number, target: number): number => {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
};

/**
 * 2D distance between two THREE.Vector3 positions on the XZ plane.
 */
export const distXZ = (a: THREE.Vector3, b: THREE.Vector3): number => {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
};

/**
 * Distance between a Vector3 and a plain {x, z} object (for entity positions).
 */
export const distXZRaw = (
  a: THREE.Vector3,
  b: { x: number; z: number },
): number => {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
};

/**
 * Pick a random key from a weighted record.
 * @example weightedRandom({ copper: 0.6, silver: 0.3, gold: 0.1 }) // → 'copper' ~60% of the time
 */
export const weightedRandom = <T extends string>(
  weights: Record<T, number>,
): T => {
  const keys = Object.keys(weights) as T[];
  const total = keys.reduce((sum, k) => sum + weights[k], 0);
  let r = Math.random() * total;
  for (const key of keys) {
    r -= weights[key];
    if (r <= 0) return key;
  }
  return keys[keys.length - 1];
};

/**
 * Random position on the XZ plane within given radius, at y = 0.
 */
export const randomPositionInRadius = (radius: number): THREE.Vector3 =>
  new THREE.Vector3(
    (Math.random() * 2 - 1) * radius,
    0,
    (Math.random() * 2 - 1) * radius,
  );

/**
 * Cryptographically-weak but fast unique ID string.
 */
export const uid = (): string => Math.random().toString(36).slice(2, 9);

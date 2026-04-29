// 2D value noise utilities for terrain height and biome distribution.
// All functions are pure and allocation-free after module load.

function gridHash(ix: number, iz: number): number {
  let h = ((ix * 73856093) ^ (iz * 19349663)) >>> 0
  h = (((h >>> 16) ^ h) * 0x45d9f3b) >>> 0
  return (((h >>> 16) ^ h) >>> 0) / 0x100000000
}

// Ken Perlin's quintic fade — eliminates second-derivative discontinuities
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function nlrp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Smooth 2D value noise in [0, 1]. Continuous and differentiable. */
export function valueNoise2D(x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z)
  const fx = fade(x - ix),  fz = fade(z - iz)
  return nlrp(
    nlrp(gridHash(ix,     iz    ), gridHash(ix + 1, iz    ), fx),
    nlrp(gridHash(ix,     iz + 1), gridHash(ix + 1, iz + 1), fx),
    fz,
  )
}

/** Terrain height at world position — 2-octave fBm, range ≈ ±0.22 units. */
export function terrainHeight(wx: number, wz: number): number {
  const f = 1 / 128
  const n = valueNoise2D(wx * f, wz * f) * 0.70
          + valueNoise2D(wx * f * 2.1, wz * f * 2.1) * 0.30
  return (n - 0.5) * 0.45
}

/**
 * Biome value at world position — very low frequency noise in [0, 1].
 * 0 = desert side, 0.5 = grassland, 1 = snow side.
 */
export function biomeValue(wx: number, wz: number): number {
  const f = 1 / 380
  return valueNoise2D(wx * f, wz * f) * 0.6
       + valueNoise2D(wx * f * 2.7, wz * f * 2.7) * 0.4
}

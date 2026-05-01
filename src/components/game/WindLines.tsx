import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { trainPosRef } from "../../trainState";

// ─── Tuning ───────────────────────────────────────────────────────────────────
const WIND_ANGLE = Math.PI * 0.15; // fixed world-space direction — always the same
const POOL_SIZE = 8; // concurrent streak budget
const DURATION = 3.5; // seconds per streak lifecycle
const INTERVAL_MIN = 0.4; // min seconds between spawns
const INTERVAL_MAX = 1.8; // max seconds between spawns
const SCATTER = 16; // XZ scatter radius around train
const LINE_LENGTH = 10; // streak length in world units
const THICKNESS = 0.2; // ribbon half-width at peak
const DRIFT = 1.8; // world units moved in wind direction per lifetime
const HEIGHT = 2.0; // fixed Y position for all streaks

const WIND_SIN = Math.sin(WIND_ANGLE);
const WIND_COS = Math.cos(WIND_ANGLE);

// ─── Ribbon geometry ──────────────────────────────────────────────────────────
// Long quad strip with a per-vertex ratio (0→1 along length) and side (-0.5/+0.5).
// Positions lie on the Z axis; the shader expands them in view-space X.
function createRibbonGeometry(
  length: number,
  segments = 40,
): THREE.BufferGeometry {
  const vertCount = (segments + 1) * 2;
  const positions = new Float32Array(vertCount * 3);
  const ratios = new Float32Array(vertCount);
  const sides = new Float32Array(vertCount);
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = (t - 0.5) * length;
    const b = i * 2;

    positions[b * 3 + 2] = z;
    ratios[b] = t;
    sides[b] = 0.5;
    positions[(b + 1) * 3 + 2] = z;
    ratios[b + 1] = t;
    sides[b + 1] = -0.5;

    if (i < segments) {
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aRatio", new THREE.BufferAttribute(ratios, 1));
  geo.setAttribute("aSide", new THREE.BufferAttribute(sides, 1));
  geo.setIndex(indices);
  return geo;
}

// ─── Shaders — window-sweep formula ─────────────────
const vertexShader = /* glsl */ `
  attribute float aRatio;
  attribute float aSide;
  uniform float uProgress;
  uniform float uThickness;
  varying float vAlpha;

  void main() {
    // Smooth taper: full at center of streak, zero at both tips
    float envelope = smoothstep(0.0, 1.0, 1.0 - abs(aRatio - 0.5) * 2.0);

    // Bright window sweeping from back (-1) to front (+2) as progress goes 0→1
    float windowPos = uProgress * 3.0 - 1.0;
    float window    = smoothstep(0.0, 1.0, 1.0 - abs(aRatio - windowPos));

    float width = uThickness * envelope * window;
    vAlpha      = envelope * window;

    // Expand in view-space X so the ribbon always faces the camera
    vec4 mvPos  = modelViewMatrix * vec4(position, 1.0);
    mvPos.x    += aSide * width;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    if (vAlpha < 0.005) discard;
    gl_FragColor = vec4(0.88, 0.94, 1.0, vAlpha * 0.85);
  }
`;

// ─── Pool entry ───────────────────────────────────────────────────────────────
interface PoolEntry {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  progress: number;
  startX: number;
  startZ: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WindLines(): null {
  const { scene } = useThree();
  const poolRef = useRef<PoolEntry[]>([]);
  const timerRef = useRef(0);
  const intervalRef = useRef(
    INTERVAL_MIN + Math.random() * (INTERVAL_MAX - INTERVAL_MIN),
  );

  useEffect(() => {
    const geo = createRibbonGeometry(LINE_LENGTH);
    const pool: PoolEntry[] = [];

    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uProgress: { value: 0 },
          uThickness: { value: THICKNESS },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 1;
      mesh.visible = false;
      mesh.rotation.y = WIND_ANGLE; // fixed world direction — never changes
      mesh.position.y = HEIGHT;
      mesh.frustumCulled = false;
      scene.add(mesh);

      pool.push({
        mesh,
        mat,
        active: false,
        progress: 0,
        startX: 0,
        startZ: 0,
      });
    }

    poolRef.current = pool;

    return () => {
      geo.dispose();
      for (const e of pool) {
        e.mat.dispose();
        scene.remove(e.mesh);
      }
      poolRef.current = [];
    };
  }, [scene]);

  useFrame((_, dt) => {
    const pool = poolRef.current;
    if (!pool.length) return;

    const dtSafe = Math.min(dt, 0.05);
    timerRef.current += dtSafe;

    // Spawn one line when the interval elapses
    if (timerRef.current >= intervalRef.current) {
      timerRef.current = 0;
      intervalRef.current =
        INTERVAL_MIN + Math.random() * (INTERVAL_MAX - INTERVAL_MIN);

      const free = pool.find((e) => !e.active);
      if (free) {
        const pos = trainPosRef.current;
        free.startX = pos.x + (Math.random() - 0.5) * SCATTER;
        free.startZ = pos.z + (Math.random() - 0.5) * SCATTER;
        free.progress = 0;
        free.active = true;
        free.mesh.position.set(free.startX, HEIGHT, free.startZ);
        free.mesh.visible = true;
      }
    }

    // Advance each active streak
    for (const entry of pool) {
      if (!entry.active) continue;

      entry.progress += dtSafe / DURATION;

      if (entry.progress >= 1) {
        entry.active = false;
        entry.mesh.visible = false;
        continue;
      }

      entry.mat.uniforms.uProgress.value = entry.progress;

      // Slow drift in wind direction (barely moves — the shader window does the work)
      const drift = entry.progress * DRIFT;
      entry.mesh.position.x = entry.startX + WIND_SIN * drift;
      entry.mesh.position.z = entry.startZ + WIND_COS * drift;
    }
  });

  return null;
}

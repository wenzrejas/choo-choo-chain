import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ZONE_SIZE, ZONE_RADIUS } from "../../utils/constants";
import { trainPosRef } from "../../trainState";

const GRID_SIDE = ZONE_RADIUS * 2 + 1;
const MAX_TILES = GRID_SIDE * GRID_SIDE; // 289 with ZONE_RADIUS=8

// Two-shade green palette
const PALETTE: THREE.Color[] = ["#7ed373", "#8fdb7f"].map(
  (c) => new THREE.Color(c),
);

// Rotation baked into geometry so every instance only needs a translation matrix
const tileGeo = new THREE.PlaneGeometry(ZONE_SIZE, ZONE_SIZE);
tileGeo.rotateX(-Math.PI / 2);

// White base — per-instance colour applied via setColorAt
const tileMat = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  roughness: 1,
  metalness: 0,
});

// Scratch matrix — pure translation, no rotation/scale variation
const _tileMatrix = new THREE.Matrix4();

export default function Ground(): null {
  const { scene } = useThree();
  const floorRef = useRef<THREE.InstancedMesh | null>(null);
  // Infinity forces a rebuild on the first frame
  const centerRef = useRef({ tx: Infinity, tz: Infinity });

  useEffect(() => {
    const floor = new THREE.InstancedMesh(tileGeo, tileMat, MAX_TILES);

    floor.count = 0;
    floor.receiveShadow = true;
    floor.castShadow = false;
    floor.frustumCulled = false;

    scene.add(floor);
    floorRef.current = floor;

    return () => {
      scene.remove(floor);
      floorRef.current = null;
    };
  }, [scene]);

  useFrame(() => {
    const floor = floorRef.current;
    if (!floor) return;

    const pos = trainPosRef.current;
    const tx = Math.floor(pos.x / ZONE_SIZE);
    const tz = Math.floor(pos.z / ZONE_SIZE);
    // Only rebuild when the player crosses into a new tile column/row
    if (tx === centerRef.current.tx && tz === centerRef.current.tz) return;
    centerRef.current = { tx, tz };

    let fi = 0;

    for (let dx = -ZONE_RADIUS; dx <= ZONE_RADIUS; dx++) {
      for (let dz = -ZONE_RADIUS; dz <= ZONE_RADIUS; dz++) {
        const ttx = tx + dx;
        const ttz = tz + dz;
        const wx = ttx * ZONE_SIZE + ZONE_SIZE / 2;
        const wz = ttz * ZONE_SIZE + ZONE_SIZE / 2;
        _tileMatrix.makeTranslation(wx, 0, wz);
        floor.setMatrixAt(fi, _tileMatrix);
        floor.setColorAt(fi, PALETTE[(ttx + ttz) & 1]);
        fi++;
      }
    }

    floor.count = fi;
    floor.instanceMatrix.needsUpdate = true;
    if (floor.instanceColor) floor.instanceColor.needsUpdate = true;
  });

  return null;
}

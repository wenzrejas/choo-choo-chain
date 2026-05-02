import { useRef, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../../store/gameStore";
import type { ObstacleType } from "../../types";

// ─── Model paths ──────────────────────────────────────────────────────────────
export const TREE_MODEL_PATH = `${import.meta.env.BASE_URL}models/obstacles/tree.glb`;
export const BOULDER_MODEL_PATH = `${import.meta.env.BASE_URL}models/obstacles/rock-a.glb`;
export const TREELOG_MODEL_PATH = `${import.meta.env.BASE_URL}models/obstacles/tree-log-small.glb`;

// ─── Shared scratch objects (never reallocated) ───────────────────────────────
const _dummy = new THREE.Object3D();
const _instanceMatrix = new THREE.Matrix4();
const _partMatrix = new THREE.Matrix4();
const _combined = new THREE.Matrix4();

// ─── Types ────────────────────────────────────────────────────────────────────
type MeshPart = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  localMatrix: THREE.Matrix4;
};

function collectMeshParts(root: THREE.Group): MeshPart[] {
  root.updateWorldMatrix(true, true);
  const parts: MeshPart[] = [];
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    parts.push({
      geometry: mesh.geometry,
      material: Array.isArray(mesh.material) ? mesh.material[0] : mesh.material,
      localMatrix: mesh.matrixWorld.clone(),
    });
  });
  return parts;
}

// ─── Shared instancing hook ───────────────────────────────────────────────────
function useGLTFObstacleInstances(
  modelPath: string,
  obstacleType: ObstacleType,
  scale: number,
  maxInstances: number,
): void {
  const { scene: threeScene } = useThree();
  const { scene: modelScene } = useGLTF(modelPath);

  const parts = useMemo(() => collectMeshParts(modelScene), [modelScene]);
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const prevObstaclesRef = useRef<unknown[] | null>(null);

  useEffect(() => {
    const meshes = parts.map(({ geometry, material }) => {
      const m = new THREE.InstancedMesh(geometry, material, maxInstances);
      m.count = 0;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      return m;
    });

    threeScene.add(...meshes);
    meshRefs.current = meshes;

    return () => {
      threeScene.remove(...meshes);
      meshRefs.current = [];
    };
  }, [threeScene, parts]);

  useFrame(() => {
    const meshes = meshRefs.current;
    if (meshes.length === 0) return;

    const obstacles = useGameStore.getState().obstacles;
    if (obstacles === prevObstaclesRef.current) return;
    prevObstaclesRef.current = obstacles;

    let count = 0;
    for (const obs of obstacles) {
      if (obs.destroyed || obs.type !== obstacleType) continue;

      _dummy.position.set(obs.position.x, 0, obs.position.z);
      _dummy.rotation.set(0, obs.rotation, 0);
      _dummy.scale.setScalar(scale);
      _dummy.updateMatrix();
      _instanceMatrix.copy(_dummy.matrix);

      for (let j = 0; j < meshes.length; j++) {
        if (!meshes[j]) continue;
        _partMatrix.copy(parts[j].localMatrix);
        _combined.multiplyMatrices(_instanceMatrix, _partMatrix);
        meshes[j]!.setMatrixAt(count, _combined);
      }
      count++;
    }

    for (const mesh of meshes) {
      if (!mesh) continue;
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  });
}

// ─── Exported components ──────────────────────────────────────────────────────

export function TreeInstances(): null {
  useGLTFObstacleInstances(TREE_MODEL_PATH, "tree", 2.5, 500);
  return null;
}

export function BoulderInstances(): null {
  useGLTFObstacleInstances(BOULDER_MODEL_PATH, "boulder", 2.8, 500);
  return null;
}

export function TreeLogInstances(): null {
  useGLTFObstacleInstances(TREELOG_MODEL_PATH, "bush", 2.5, 500);
  return null;
}

useGLTF.preload(TREE_MODEL_PATH);
useGLTF.preload(BOULDER_MODEL_PATH);
useGLTF.preload(TREELOG_MODEL_PATH);

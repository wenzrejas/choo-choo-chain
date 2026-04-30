import { useRef, useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../store/gameStore'

export const BOULDER_MODEL_PATH = `${import.meta.env.BASE_URL}models/obstacles/rock-a.glb`

const MAX_BOULDERS  = 500
const BOULDER_SCALE = 2.8

// Scratch objects — never reallocated per frame
const _dummy          = new THREE.Object3D()
const _instanceMatrix = new THREE.Matrix4()
const _partMatrix     = new THREE.Matrix4()
const _combined       = new THREE.Matrix4()

type MeshPart = {
  geometry:    THREE.BufferGeometry
  material:    THREE.Material
  localMatrix: THREE.Matrix4
}

function collectMeshParts(root: THREE.Group): MeshPart[] {
  root.updateWorldMatrix(true, true)
  const parts: MeshPart[] = []
  root.traverse(child => {
    if (!(child as THREE.Mesh).isMesh) return
    const mesh = child as THREE.Mesh
    parts.push({
      geometry:    mesh.geometry,
      material:    Array.isArray(mesh.material) ? mesh.material[0] : mesh.material,
      localMatrix: mesh.matrixWorld.clone(),
    })
  })
  return parts
}

// ─── BoulderInstances ─────────────────────────────────────────────────────────
// Renders all non-destroyed boulder obstacles as instanced draw calls — one per
// mesh part found in rock-a.glb. Matrices are rebuilt only when the obstacles
// array reference changes (Zustand emits a new reference on every mutation).
export function BoulderInstances(): null {
  const { scene: threeScene }  = useThree()
  const { scene: modelScene }  = useGLTF(BOULDER_MODEL_PATH)

  const parts = useMemo(() => collectMeshParts(modelScene), [modelScene])

  const meshRefs         = useRef<(THREE.InstancedMesh | null)[]>([])
  const prevObstaclesRef = useRef<unknown[] | null>(null)

  useEffect(() => {
    const meshes = parts.map(({ geometry, material }) => {
      const m = new THREE.InstancedMesh(geometry, material, MAX_BOULDERS)
      m.count         = 0
      m.castShadow    = true
      m.receiveShadow = true
      m.frustumCulled = false
      return m
    })

    threeScene.add(...meshes)
    meshRefs.current = meshes

    return () => {
      threeScene.remove(...meshes)
      meshRefs.current = []
    }
  }, [threeScene, parts])

  useFrame(() => {
    const meshes = meshRefs.current
    if (meshes.length === 0) return

    const obstacles = useGameStore.getState().obstacles
    if (obstacles === prevObstaclesRef.current) return
    prevObstaclesRef.current = obstacles

    let count = 0
    for (const obs of obstacles) {
      if (obs.destroyed || obs.type !== 'boulder') continue
      const { x, z } = obs.position

      _dummy.position.set(x, 0, z)
      _dummy.rotation.set(0, obs.rotation, 0)
      _dummy.scale.setScalar(BOULDER_SCALE)
      _dummy.updateMatrix()
      _instanceMatrix.copy(_dummy.matrix)

      for (let j = 0; j < meshes.length; j++) {
        if (!meshes[j]) continue
        _partMatrix.copy(parts[j].localMatrix)
        _combined.multiplyMatrices(_instanceMatrix, _partMatrix)
        meshes[j]!.setMatrixAt(count, _combined)
      }
      count++
    }

    for (const mesh of meshes) {
      if (!mesh) continue
      mesh.count                      = count
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  return null
}

useGLTF.preload(BOULDER_MODEL_PATH)

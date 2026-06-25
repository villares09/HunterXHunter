import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getProp } from "../data/world";
import { heightAt } from "./Terrain";
import { useForest, getTrees, FOREST_SPECIES, type Tree } from "../data/forestStore";

/* Culling por celdas + distancia de corte.
   TILE: tamaño de celda (m). VIEW_DIST: a partir de esta distancia (m) de la
   cámara, la celda no se renderiza. Bajá VIEW_DIST si la GPU sufre; subilo si
   ves los árboles "aparecer" muy cerca. */
const TILE = 40;
const VIEW_DIST = 80;          // distancia de visión de árboles
const MAX_PER_TILE = 512;

type Part = { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[] };

function buildParts(scene: THREE.Object3D, height: number): Part[] {
  const root = scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const sy = Number.isFinite(size.y) && size.y > 0 ? size.y : 1;
  let s = height / sy;
  if (!Number.isFinite(s) || s <= 0) s = 1;
  const rawBaseY = -box.min.y * s;
  const baseY = Number.isFinite(rawBaseY) ? rawBaseY : 0;
  const sm = new THREE.Matrix4().makeScale(s, s, s);
  const parts: Part[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    g.applyMatrix4(sm);
    g.translate(0, baseY, 0);
    parts.push({ geometry: g, material: mesh.material });
  });
  return parts;
}

const tileKey = (x: number, z: number) => `${Math.floor(x / TILE)}_${Math.floor(z / TILE)}`;

/* InstancedMesh por (parte) de una celda. Centro de la celda guardado para la
   distancia de corte. frustumCulled descarta lo de atrás/costados; la distancia
   descarta lo lejano de adelante. */
function TileSpecies({ parts, trees, center }: { parts: Part[]; trees: Tree[]; center: THREE.Vector3 }) {
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    parts.forEach((_, pi) => {
      const inst = refs.current[pi];
      if (!inst) return;
      const count = Math.min(trees.length, MAX_PER_TILE);
      let written = 0;
      for (let i = 0; i < count; i++) {
        const t = trees[i];
        const hy = heightAt(t.x, t.z);
        if (!Number.isFinite(t.x) || !Number.isFinite(t.z) || !Number.isFinite(hy) ||
            !Number.isFinite(t.rot) || !Number.isFinite(t.scale) || t.scale <= 0) continue;
        q.setFromAxisAngle(up, t.rot);
        scl.setScalar(t.scale);
        pos.set(t.x, hy, t.z);
        m.compose(pos, q, scl);
        inst.setMatrixAt(written++, m);
      }
      inst.count = written;
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
    });
  }, [parts, trees]);

  // ocultar la celda si está más lejos que VIEW_DIST de la cámara (distancia XZ)
  const _c = useRef(new THREE.Vector3());
  useFrame((state) => {
    const cam = state.camera.position;
    const dx = cam.x - center.x, dz = cam.z - center.z;
    const visible = dx * dx + dz * dz < (VIEW_DIST + TILE) * (VIEW_DIST + TILE);
    for (const inst of refs.current) if (inst) inst.visible = visible;
  });
  void _c;

  return (
    <>
      {parts.map((p, pi) => (
        <instancedMesh
          key={pi}
          ref={(el) => { refs.current[pi] = el; }}
          args={[p.geometry, p.material as THREE.Material, MAX_PER_TILE]}
          castShadow
          receiveShadow
          frustumCulled={true}
        />
      ))}
    </>
  );
}

function SpeciesForest({ propId, trees }: { propId: string; trees: Tree[] }) {
  const def = getProp(propId);
  const { scene } = useGLTF(def.url);
  const parts = useMemo(() => buildParts(scene, def.height), [scene, def.height]);

  const tiles = useMemo(() => {
    const map: Record<string, { trees: Tree[]; center: THREE.Vector3 }> = {};
    for (const t of trees) {
      const k = tileKey(t.x, t.z);
      if (!map[k]) {
        const cx = (Math.floor(t.x / TILE) + 0.5) * TILE;
        const cz = (Math.floor(t.z / TILE) + 0.5) * TILE;
        map[k] = { trees: [], center: new THREE.Vector3(cx, 0, cz) };
      }
      map[k].trees.push(t);
    }
    return map;
  }, [trees]);

  return (
    <>
      {Object.entries(tiles).map(([key, { trees: group, center }]) => (
        <TileSpecies key={key} parts={parts} trees={group} center={center} />
      ))}
    </>
  );
}

export function PaintedForest() {
  const rev = useForest((s) => s.rev);
  const trees = useMemo(() => getTrees().slice(), [rev]);
  const bySpecies = useMemo(() => {
    const map: Record<string, Tree[]> = {};
    for (const sp of FOREST_SPECIES) map[sp] = [];
    for (const t of trees) (map[t.species] ?? (map[t.species] = [])).push(t);
    return map;
  }, [trees]);

  return (
    <>
      {FOREST_SPECIES.map((sp) => (
        <SpeciesForest key={sp} propId={sp} trees={bySpecies[sp] ?? []} />
      ))}
    </>
  );
}

FOREST_SPECIES.forEach((sp) => useGLTF.preload(getProp(sp).url));

import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getProp } from "../data/world";
import { heightAt } from "./Terrain";
import { useForest, getTrees, FOREST_SPECIES, type Tree } from "../data/forestStore";

const TILE = 40;
const VIEW_DIST = 80;
const MAX_PER_TILE = 512;

/* árboles: crecen derechos, así que alineado MUY leve a la pendiente y sink chico. */
const SINK_FRAC = 0.04;
const ALIGN = 0.15;
const NORMAL_EPS = 1.5;

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

function terrainNormal(x: number, z: number, out: THREE.Vector3) {
  const hL = heightAt(x - NORMAL_EPS, z), hR = heightAt(x + NORMAL_EPS, z);
  const hD = heightAt(x, z - NORMAL_EPS), hU = heightAt(x, z + NORMAL_EPS);
  out.set(hL - hR, 2 * NORMAL_EPS, hD - hU).normalize();
}

function TileSpecies({ parts, trees, center, height }: {
  parts: Part[]; trees: Tree[]; center: THREE.Vector3; height: number;
}) {
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const qSpin = new THREE.Quaternion(), qAlign = new THREE.Quaternion(), qFinal = new THREE.Quaternion();
    const pos = new THREE.Vector3(), scl = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0), normal = new THREE.Vector3(), alignedUp = new THREE.Vector3();

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

        // giro en Y propio del árbol
        qSpin.setFromAxisAngle(up, t.rot);
        // alineado muy leve a la pendiente
        terrainNormal(t.x, t.z, normal);
        alignedUp.copy(up).lerp(normal, ALIGN).normalize();
        qAlign.setFromUnitVectors(up, alignedUp);
        qFinal.copy(qAlign).multiply(qSpin);

        scl.setScalar(t.scale);
        const sink = t.scale * height * SINK_FRAC;
        pos.set(t.x, hy - sink, t.z);
        m.compose(pos, qFinal, scl);
        inst.setMatrixAt(written++, m);
      }
      inst.count = written;
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
    });
  }, [parts, trees, height]);

  useFrame((state) => {
    const cam = state.camera.position;
    const dx = cam.x - center.x, dz = cam.z - center.z;
    const visible = dx * dx + dz * dz < (VIEW_DIST + TILE) * (VIEW_DIST + TILE);
    for (const inst of refs.current) if (inst) inst.visible = visible;
  });

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
        <TileSpecies key={key} parts={parts} trees={group} center={center} height={def.height} />
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

import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { getProp } from "../data/world";
import { heightAt } from "./Terrain";
import { useRocks, getRocks, ROCK_SPECIES, type Rock } from "../data/rockStore";

const MAX_PER_SPECIES = 8000;

type Part = { geometry: THREE.BufferGeometry; material: THREE.Material };

function buildParts(scene: THREE.Object3D, height: number): Part[] {
  const root = scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const s = height / (size.y || 1);
  const baseY = -box.min.y * s;
  const sm = new THREE.Matrix4().makeScale(s, s, s);
  const parts: Part[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    g.applyMatrix4(sm);
    g.translate(0, baseY, 0);
    parts.push({ geometry: g, material: mesh.material as THREE.Material });
  });
  return parts;
}

function SpeciesInstances({ propId, rocks }: { propId: string; rocks: Rock[] }) {
  const def = getProp(propId);
  const { scene } = useGLTF(def.url);
  const parts = useMemo(() => buildParts(scene, def.height), [scene, def.height]);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const e = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    parts.forEach((_, pi) => {
      const inst = refs.current[pi];
      if (!inst) return;
      const count = Math.min(rocks.length, MAX_PER_SPECIES);
      for (let i = 0; i < count; i++) {
        const r = rocks[i];
        e.set(r.rx, r.ry, r.rz, "YXZ");
        q.setFromEuler(e);
        scl.set(r.sx, r.sy, r.sz);
        pos.set(r.x, heightAt(r.x, r.z), r.z);
        m.compose(pos, q, scl);
        inst.setMatrixAt(i, m);
      }
      inst.count = count;
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
    });
  }, [parts, rocks]);

  return (
    <>
      {parts.map((p, pi) => (
        <instancedMesh
          key={pi}
          ref={(el) => { refs.current[pi] = el; }}
          args={[p.geometry, p.material, MAX_PER_SPECIES]}
          castShadow
          receiveShadow
          frustumCulled={false}
        />
      ))}
    </>
  );
}

export function PaintedRocks() {
  const rev = useRocks((s) => s.rev);
  const rocks = useMemo(() => getRocks().slice(), [rev]);
  const bySpecies = useMemo(() => {
    const map: Record<string, Rock[]> = {};
    for (const sp of ROCK_SPECIES) map[sp] = [];
    for (const r of rocks) (map[r.species] ?? (map[r.species] = [])).push(r);
    return map;
  }, [rocks]);

  return (
    <>
      {ROCK_SPECIES.map((sp) => (
        <SpeciesInstances key={sp} propId={sp} rocks={bySpecies[sp] ?? []} />
      ))}
    </>
  );
}

ROCK_SPECIES.forEach((sp) => useGLTF.preload(getProp(sp).url));

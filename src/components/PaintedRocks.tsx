import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getProp } from "../data/world";
import { heightAt } from "./Terrain";
import { useRocks, getRocks, ROCK_SPECIES, type Rock } from "../data/rockStore";

/* Culling por celdas + distancia de corte (mismo sistema que el bosque).
   Las rocas son bajas: VIEW_DIST más alto que los árboles, si no se ve el piso
   "pelarse" de rocas cerca de la cámara. */
const TILE = 40;
const VIEW_DIST = 60;
const MAX_PER_TILE = 512;

/* hundido: fracción del alto que se entierra (tapa huecos en pendiente). */
const SINK_FRAC = 0.35;
/* alineado a la pendiente: 0 = derecha · 1 = acostada sobre el talud. */
const ALIGN = 0.6;
/* separación (m) para muestrear la pendiente alrededor de la roca. */
const NORMAL_EPS = 1.2;

/* sólo las rocas medianas (grandes) proyectan sombra; las piedritas no, para
   ahorrar GPU (cada castShadow = un render extra en el shadow map). */
const castsShadow = (species: string) => species.startsWith("rockMedium");

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

/* normal del terreno en (x,z): muestrea 4 vecinos y arma el plano local. */
function terrainNormal(x: number, z: number, out: THREE.Vector3) {
  const hL = heightAt(x - NORMAL_EPS, z), hR = heightAt(x + NORMAL_EPS, z);
  const hD = heightAt(x, z - NORMAL_EPS), hU = heightAt(x, z + NORMAL_EPS);
  out.set(hL - hR, 2 * NORMAL_EPS, hD - hU).normalize();
}

function TileSpecies({ parts, rocks, center, height, shadow }: {
  parts: Part[]; rocks: Rock[]; center: THREE.Vector3; height: number; shadow: boolean;
}) {
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const qTilt = new THREE.Quaternion(), qAlign = new THREE.Quaternion(), qFinal = new THREE.Quaternion();
    const eTilt = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0), normal = new THREE.Vector3(), alignedUp = new THREE.Vector3();

    parts.forEach((_, pi) => {
      const inst = refs.current[pi];
      if (!inst) return;
      const count = Math.min(rocks.length, MAX_PER_TILE);
      let written = 0;
      for (let i = 0; i < count; i++) {
        const r = rocks[i];
        const hy = heightAt(r.x, r.z);
        if (!Number.isFinite(r.x) || !Number.isFinite(r.z) || !Number.isFinite(hy) ||
            !Number.isFinite(r.sx) || !Number.isFinite(r.sy) || !Number.isFinite(r.sz) ||
            r.sx <= 0 || r.sy <= 0 || r.sz <= 0) continue;

        // tilt propio
        eTilt.set(r.rx, r.ry, r.rz, "YXZ");
        qTilt.setFromEuler(eTilt);
        // alineado parcial a la normal
        terrainNormal(r.x, r.z, normal);
        alignedUp.copy(up).lerp(normal, ALIGN).normalize();
        qAlign.setFromUnitVectors(up, alignedUp);
        qFinal.copy(qAlign).multiply(qTilt);

        scl.set(r.sx, r.sy, r.sz);
        const sink = r.sy * height * SINK_FRAC;
        pos.set(r.x, hy - sink, r.z);
        m.compose(pos, qFinal, scl);
        inst.setMatrixAt(written++, m);
      }
      inst.count = written;
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
    });
  }, [parts, rocks, height]);

  // ocultar la celda si está más lejos que VIEW_DIST (distancia XZ)
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
          castShadow={shadow}
          receiveShadow
          frustumCulled={true}
        />
      ))}
    </>
  );
}

function SpeciesRocks({ propId, rocks }: { propId: string; rocks: Rock[] }) {
  const def = getProp(propId);
  const { scene } = useGLTF(def.url);
  const parts = useMemo(() => buildParts(scene, def.height), [scene, def.height]);
  const shadow = castsShadow(propId);

  const tiles = useMemo(() => {
    const map: Record<string, { rocks: Rock[]; center: THREE.Vector3 }> = {};
    for (const r of rocks) {
      const k = tileKey(r.x, r.z);
      if (!map[k]) {
        const cx = (Math.floor(r.x / TILE) + 0.5) * TILE;
        const cz = (Math.floor(r.z / TILE) + 0.5) * TILE;
        map[k] = { rocks: [], center: new THREE.Vector3(cx, 0, cz) };
      }
      map[k].rocks.push(r);
    }
    return map;
  }, [rocks]);

  return (
    <>
      {Object.entries(tiles).map(([key, { rocks: group, center }]) => (
        <TileSpecies key={key} parts={parts} rocks={group} center={center} height={def.height} shadow={shadow} />
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
        <SpeciesRocks key={sp} propId={sp} rocks={bySpecies[sp] ?? []} />
      ))}
    </>
  );
}

ROCK_SPECIES.forEach((sp) => useGLTF.preload(getProp(sp).url));

import { Sky, useTexture } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { Prop } from "./Prop";
import { Foliage } from "./Foliage";
import { Ocean } from "./Ocean";
import { Terrain } from "./Terrain";
import {
  isLand, coastAt, coastPolygonInset, OCEAN_Y,
 } from "../data/island";
import { PlacedProps } from "./PlacedProps";

type Inst = { id: string; pos: [number, number, number]; rot?: number; scale?: number };

/* =========================================================================
   ZONAS (coords de mundo). +X = ESTE (derecha del mapa), +Z = SUR (abajo).
   Moveлas a gusto, son las perillas de tuning del layout.
   RIDGE debe coincidir con los picos de Mountains.tsx.
   ========================================================================= */
const RIDGE: { x: number; z: number; r: number }[] = [
  { x: -95, z: -8, r: 48 },
  { x: -135, z: 16, r: 40 },
  { x: -118, z: -38, r: 38 },
  { x: -60, z: -28, r: 36 },
  { x: -58, z: 22, r: 34 },
  { x: -34, z: -4, r: 28 },
];

const PLAZA = { x: 18, z: -8, r: 11 };
const PANTANO = { x: 112, z: 40, r: 26 };          // Gran Pantano (SE)
const CASCADA_POOL = { x: -6, z: 2, r: 6 };        // pileta al pie de la cascada
const MITO: Inst = { id: "casaPersonaje", pos: [10, 0, -40], rot: Math.PI, scale: 1.9 }; // Casa de Gon/Mito

const VILLAGE: Inst[] = [
  { id: "casaNpc", pos: [40, 0, -30], rot: -0.6, scale: 1.6 },
  { id: "casaNpc", pos: [56, 0, -10], rot: 1.2, scale: 1.5 },
  { id: "casaNpc", pos: [30, 0, 6], rot: 2.4, scale: 1.6 },
  { id: "casaNpc", pos: [48, 0, -44], rot: 0.4, scale: 1.5 },
  { id: "casaNpc", pos: [-2, 0, -24], rot: -1.1, scale: 1.5 },
  { id: "casaNpc", pos: [64, 0, 16], rot: 0.8, scale: 1.6 },
];
const PORT_HOUSES: Inst[] = [
  { id: "casaNpc", pos: [112, 0, -16], rot: 1.0, scale: 1.5 },
  { id: "casaNpc", pos: [140, 0, -12], rot: -0.8, scale: 1.5 },
  { id: "casaNpc", pos: [126, 0, -8], rot: 2.0, scale: 1.6 },
  { id: "casaNpc", pos: [148, 0, -20], rot: 0.3, scale: 1.5 },
];

// Sendero del Encuentro con Kite: de la cascada al puerto
const PATH: [number, number][] = [
  [-6, 2], [16, -2], [50, -6], [88, -14], [118, -22], [130, -28],
];
const PATH_W = 5;

function distToSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz || 1;
  let t = ((px - ax) * dx + (pz - az) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
function nearPath(x: number, z: number, pad = 1) {
  for (let i = 0; i < PATH.length - 1; i++) {
    if (distToSeg(x, z, PATH[i][0], PATH[i][1], PATH[i + 1][0], PATH[i + 1][1]) < PATH_W + pad) return true;
  }
  return false;
}

export function World() {
  const grass = useTexture("/assets/pasto.png");
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
  grass.anisotropy = 16;

  const walls = useMemo(() => {
    const pts = coastPolygonInset(0.97);
    return pts.map((a, i) => {
      const b = pts[(i + 1) % pts.length];
      const dx = b.x - a.x, dz = b.y - a.y;
      return { x: (a.x + b.x) / 2, z: (a.y + b.y) / 2, hx: Math.hypot(dx, dz) / 2 + 1, rot: -Math.atan2(dz, dx) };
    });
  }, []);

  // segmentos del sendero (cajas finas marrones, sólo visual)
  const pathSegs = useMemo(() => {
    const arr: { mx: number; mz: number; len: number; rot: number }[] = [];
    for (let i = 0; i < PATH.length - 1; i++) {
      const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1];
      const dx = bx - ax, dz = bz - az;
      arr.push({ mx: (ax + bx) / 2, mz: (az + bz) / 2, len: Math.hypot(dx, dz) + PATH_W, rot: -Math.atan2(dz, dx) });
    }
    return arr;
  }, []);

  // rocas de costa (Acantilados Rocosos Oeste + anillo), a nivel del agua
  const cliffs = useMemo<Inst[]>(() => {
    const arr: Inst[] = [];
    const N = 22;
    for (let i = 0; i < N; i++) {
      const p = coastAt(i / N + 0.01, 0.99);
      arr.push({ id: "roca", pos: [p.x, OCEAN_Y + 0.2, p.y], rot: Math.random() * 6.28, scale: 2.2 + Math.random() * 2.0 });
    }
    // cluster denso en el oeste (Acantilados Rocosos Oeste)
    for (let i = 0; i < 6; i++) {
      const p = coastAt(0.9 + i * 0.018, 1.0);
      arr.push({ id: "roca", pos: [p.x - 4, OCEAN_Y + 0.2, p.y], rot: Math.random() * 6.28, scale: 3 + Math.random() * 2.5 });
    }
    return arr;
  }, []);

  const blocked = useMemo(() => {
    const circ: { x: number; z: number; r: number }[] = [
      PLAZA, PANTANO, { x: CASCADA_POOL.x, z: CASCADA_POOL.z, r: CASCADA_POOL.r + 2 },
      { x: MITO.pos[0], z: MITO.pos[2], r: 9 },
      ...RIDGE,
    ];
    for (const h of [...VILLAGE, ...PORT_HOUSES]) circ.push({ x: h.pos[0], z: h.pos[2], r: 7 * (h.scale ?? 1) });
    return circ;
  }, []);

  const free = useMemo(
    () => (x: number, z: number, inset = 0.88) =>
      isLand(x, z, inset) && !nearPath(x, z) && !blocked.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < c.r ** 2),
    [blocked]
  );

  const forest = useMemo<Inst[]>(() => {
    const kinds = ["arbolGigante", "arbolNormal", "arbolNormal", "arbolFrutal"];
    const arr: Inst[] = [];
    let g = 0;
    while (arr.length < 48 && g < 2000) {
      g++;
      const x = -200 + Math.random() * 400, z = -78 + Math.random() * 156;
      if (!free(x, z, 0.86)) continue;
      if (arr.some((t) => (t.pos[0] - x) ** 2 + (t.pos[2] - z) ** 2 < 14 ** 2)) continue;
      arr.push({ id: kinds[arr.length % kinds.length], pos: [x, 0, z], rot: Math.random() * 6.28, scale: 1.7 + Math.random() * 1.3 });
    }
    return arr;
  }, [free]);

  // juncos alrededor del Gran Pantano
  const reeds = useMemo<Inst[]>(() => {
    const arr: Inst[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * 6.28 + 0.4;
      arr.push({
        id: "arbolLaguna",
        pos: [PANTANO.x + Math.cos(a) * (PANTANO.r - 2), 0, PANTANO.z + Math.sin(a) * (PANTANO.r - 2)],
        rot: Math.random() * 6.28, scale: 1.3 + Math.random() * 0.5,
      });
    }
    return arr;
  }, []);

  // puerto en la bahía NE
  const port = useMemo(() => ({
    dock: [128, OCEAN_Y + 0.9, -36] as [number, number, number],
    dockRot: 0,
    boats: [
      [118, OCEAN_Y + 0.3, -42] as [number, number, number],
      [138, OCEAN_Y + 0.3, -45] as [number, number, number],
    ],
  }), []);

  const accept = useMemo(() => (x: number, z: number) => free(x, z, 0.9), [free]);

  return (
    <>
      <Sky sunPosition={[80, 22, 40]} turbidity={8} rayleigh={2.2} mieCoefficient={0.01} />
      <hemisphereLight args={["#ffe9c2", "#46603a", 0.8]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[120, 90, 40]} intensity={1.7} color="#ffe2b0" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-near={1} shadow-camera-far={700}
        shadow-camera-left={-220} shadow-camera-right={220} shadow-camera-top={160} shadow-camera-bottom={-160}
        shadow-bias={-0.0004}
      />

      <Ocean />
      {/* <Mountains /> */}

      {/* piso plano invisible (ecctrl camina sobre esto) */}
      <Terrain />

      {/* muros invisibles en la costa */}
      <RigidBody type="fixed" colliders={false}>
        {walls.map((w, i) => (
          <CuboidCollider key={i} args={[w.hx, 4, 0.8]} position={[w.x, 4, w.z]} rotation={[0, w.rot, 0]} />
        ))}
      </RigidBody>

      {/* Sendero del Encuentro con Kite */}
      {pathSegs.map((s, i) => (
        <mesh key={`pth${i}`} position={[s.mx, 0.08, s.mz]} rotation={[0, s.rot, 0]} receiveShadow>
          <boxGeometry args={[s.len, 0.08, PATH_W * 2]} />
          <meshStandardMaterial color="#9b8362" />
        </mesh>
      ))}

      <Foliage count={9000} area={480} flowerRatio={0.06} accept={accept} />

      {/* plaza + fuente */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[PLAZA.x, 0.06, PLAZA.z]}>
        <circleGeometry args={[PLAZA.r, 44]} />
        <meshStandardMaterial color="#b09a6f" />
      </mesh>
      <group position={[PLAZA.x, 0, PLAZA.z]}>
        <mesh castShadow position={[0, 0.3, 0]}>
          <cylinderGeometry args={[1.6, 1.8, 0.6, 20]} />
          <meshStandardMaterial color="#b9b0a2" flatShading />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[1.3, 1.3, 0.15, 20]} />
          <meshStandardMaterial color="#4aa6c4" transparent opacity={0.85} roughness={0.2} />
        </mesh>
      </group>

      {/* Gran Pantano (SE) — agua de ciénaga somera (todavía NO nadable) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[PANTANO.x, 0.06, PANTANO.z]}>
        <circleGeometry args={[PANTANO.r, 56]} />
        <meshStandardMaterial color="#3f7d5a" roughness={0.5} metalness={0.05} transparent opacity={0.92} side={THREE.DoubleSide} />
      </mesh>

      {/* Cascada Grande (placeholder: 2 planos translúcidos + pileta) */}
      <group position={[-6, 0, 2]}>
        <mesh position={[0, 31, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[6, 20]} />
          <meshStandardMaterial color="#dff1f7" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 11, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[6, 22]} />
          <meshStandardMaterial color="#9fd4e6" transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CASCADA_POOL.x, 0.1, CASCADA_POOL.z]}>
        <circleGeometry args={[CASCADA_POOL.r, 36]} />
        <meshStandardMaterial color="#bfe6f0" transparent opacity={0.8} roughness={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* faro (luz del puerto) en la cabecera de la bahía */}
      {/* <Prop propId="faro" position={[146, 0, -40]} rotation={0} scale={1.5} /> */}

      {/* puerto */}
      <Prop propId="muelle" position={port.dock} rotation={port.dockRot} scale={1.4} />
      {port.boats.map((b, i) => (
        <Prop key={`b${i}`} propId="bote" position={b} rotation={port.dockRot + 0.3} scale={1.3} />
      ))}

      {/* Casa de Gon/Mito + pueblo + asentamiento del puerto */}
      {/* <Prop propId={MITO.id} position={MITO.pos} rotation={MITO.rot} scale={MITO.scale} />
      {[...VILLAGE, ...PORT_HOUSES].map((h, i) => (
        <Prop key={`h${i}`} propId={h.id} position={h.pos} rotation={h.rot} scale={h.scale} />
      ))} */}
      <PlacedProps />

      {/* bosque + juncos + rocas */}
      {forest.map((f, i) => (
        <Prop key={`t${i}`} propId={f.id} position={f.pos} rotation={f.rot} scale={f.scale} />
      ))}
      {reeds.map((f, i) => (
        <Prop key={`r${i}`} propId={f.id} position={f.pos} rotation={f.rot} scale={f.scale} />
      ))}
      {cliffs.map((c, i) => (
        <Prop key={`c${i}`} propId={c.id} position={c.pos} rotation={c.rot} scale={c.scale} />
      ))}
    </>
  );
}

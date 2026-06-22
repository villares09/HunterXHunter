import { Sky, useTexture } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { Prop } from "./Prop";
import { Foliage } from "./Foliage";
import { Ocean } from "./Ocean";
import { Mountains } from "./Mountains";
import {
  isLand, coastAt, coastPolygonInset, islandCenter,
  buildLandGeometry, buildCliffGeometry, OCEAN_Y,
} from "../data/island";

type Inst = { id: string; pos: [number, number, number]; rot?: number; scale?: number };

// ===== zonas del pueblo (cerca del spawn, lado cabeza) =====
const PLAZA = { x: 8, z: 12, r: 11 };
const LAGOON = { x: 120, z: 18, r: 18 }; // depresión del altiplano

const VILLAGE: Inst[] = [
  { id: "casaNpc", pos: [-18, 0, -6], rot: 0.5, scale: 1.6 },
  { id: "casaNpc", pos: [26, 0, -14], rot: -1.2, scale: 1.5 },
  { id: "casaNpc", pos: [42, 0, 8], rot: 2.2, scale: 1.6 },
  { id: "casaNpc", pos: [-10, 0, 30], rot: -0.4, scale: 1.5 },
  { id: "casaNpc", pos: [22, 0, 32], rot: 1.0, scale: 1.6 },
  { id: "casaNpc", pos: [-32, 0, 16], rot: 0.8, scale: 1.5 },
];
const MITO: Inst = { id: "casaPersonaje", pos: [6, 0, -2], rot: 0.2, scale: 1.9 };

export function World() {
  const grass = useTexture("/assets/pasto.png");
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
  grass.anisotropy = 16;

  const grassGeo = useMemo(() => buildLandGeometry(0.93, 0.05), []);
  const beachGeo = useMemo(() => buildLandGeometry(1.0, 0.0), []);
  const cliffGeo = useMemo(() => buildCliffGeometry(), []);

  // muros invisibles siguiendo la costa
  const walls = useMemo(() => {
    const pts = coastPolygonInset(0.97);
    return pts.map((a, i) => {
      const b = pts[(i + 1) % pts.length];
      const dx = b.x - a.x, dz = b.y - a.y;
      return { x: (a.x + b.x) / 2, z: (a.y + b.y) / 2, hx: Math.hypot(dx, dz) / 2 + 1, rot: -Math.atan2(dz, dx) };
    });
  }, []);

  // rocas hundidas a lo largo de la costa
  const cliffs = useMemo<Inst[]>(() => {
    const arr: Inst[] = [];
    const N = 26;
    for (let i = 0; i < N; i++) {
      const p = coastAt(i / N + 0.01, 0.99);
      arr.push({ id: "roca", pos: [p.x, -0.8, p.y], rot: Math.random() * 6.28, scale: 2.4 + Math.random() * 2.2 });
    }
    return arr;
  }, []);

  // bosque del altiplano (+X), esquivando laguna
  const forest = useMemo<Inst[]>(() => {
    const kinds = ["arbolGigante", "arbolNormal", "arbolNormal", "arbolFrutal"];
    const arr: Inst[] = [];
    let g = 0;
    while (arr.length < 42 && g < 900) {
      g++;
      const x = 35 + Math.random() * 130, z = (Math.random() * 2 - 1) * 75;
      if (!isLand(x, z, 0.86)) continue;
      if ((x - LAGOON.x) ** 2 + (z - LAGOON.z) ** 2 < (LAGOON.r + 5) ** 2) continue;
      arr.push({ id: kinds[arr.length % kinds.length], pos: [x, 0, z], rot: Math.random() * 6.28, scale: 1.5 + Math.random() * 1.1 });
    }
    return arr;
  }, []);

  // casas metidas en el bosque
  const forestHouses = useMemo<Inst[]>(() => {
    const arr: Inst[] = [];
    let g = 0;
    while (arr.length < 4 && g < 400) {
      g++;
      const x = 70 + Math.random() * 80, z = (Math.random() * 2 - 1) * 55;
      if (!isLand(x, z, 0.85)) continue;
      if ((x - LAGOON.x) ** 2 + (z - LAGOON.z) ** 2 < (LAGOON.r + 8) ** 2) continue;
      if (arr.some((h) => (h.pos[0] - x) ** 2 + (h.pos[2] - z) ** 2 < 35 ** 2)) continue;
      arr.push({ id: "casaNpc", pos: [x, 0, z], rot: Math.random() * 6.28, scale: 1.5 });
    }
    return arr;
  }, []);

  const lagoonTrees = useMemo<Inst[]>(() => {
    const arr: Inst[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.28 + 0.5;
      arr.push({
        id: "arbolLaguna",
        pos: [LAGOON.x + Math.cos(a) * (LAGOON.r + 4), 0, LAGOON.z + Math.sin(a) * (LAGOON.r + 4)],
        rot: Math.random() * 6.28, scale: 1.5,
      });
    }
    return arr;
  }, []);

  // puerto: anclado a un punto de la costa (panza), proyectado hacia el mar
  const port = useMemo(() => {
    const p = coastAt(0.84, 0.98);
    const c = islandCenter();
    const out = Math.atan2(p.y - c.y, p.x - c.x);
    const ox = Math.cos(out), oz = Math.sin(out);
    return {
      dock: [p.x + ox * 6, OCEAN_Y + 0.9, p.y + oz * 6] as [number, number, number],
      dockRot: out,
      boats: [
        [p.x + ox * 16, OCEAN_Y + 0.3, p.y + oz * 16] as [number, number, number],
        [p.x + ox * 20 - oz * 7, OCEAN_Y + 0.3, p.y + oz * 20 + ox * 7] as [number, number, number],
      ],
    };
  }, []);

  const faro = useMemo(() => coastAt(0.43, 0.95), []); // punta de la aleta superior

  // exclusiones para el foliage (plaza, laguna, casas)
  const exclude = useMemo(() => {
    const circ = [
      { x: PLAZA.x, z: PLAZA.z, r: PLAZA.r },
      { x: LAGOON.x, z: LAGOON.z, r: LAGOON.r + 2 },
      { x: MITO.pos[0], z: MITO.pos[2], r: 8 },
    ];
    for (const h of [...VILLAGE, ...forestHouses]) circ.push({ x: h.pos[0], z: h.pos[2], r: 6 * (h.scale ?? 1) });
    return circ;
  }, [forestHouses]);

  const accept = useMemo(
    () => (x: number, z: number) =>
      isLand(x, z, 0.92) && !exclude.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < c.r ** 2),
    [exclude]
  );

  return (
    <>
      <Sky sunPosition={[60, 18, -40]} turbidity={8} rayleigh={2.2} mieCoefficient={0.01} />
      <hemisphereLight args={["#ffe9c2", "#46603a", 0.8]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[60, 60, -10]} intensity={1.7} color="#ffe2b0" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-near={1} shadow-camera-far={300}
        shadow-camera-left={-130} shadow-camera-right={130} shadow-camera-top={130} shadow-camera-bottom={-130}
        shadow-bias={-0.0004}
      />

      <Ocean />
      <Mountains />

      {/* piso plano invisible (ecctrl camina sobre esto) */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[260, 0.5, 130]} position={[0, -0.5, 0]} />
      </RigidBody>

      {/* muros invisibles en la costa */}
      <RigidBody type="fixed" colliders={false}>
        {walls.map((w, i) => (
          <CuboidCollider key={i} args={[w.hx, 4, 0.8]} position={[w.x, 4, w.z]} rotation={[0, w.rot, 0]} />
        ))}
      </RigidBody>

      {/* acantilado + playa + césped */}
      <mesh geometry={cliffGeo}>
        <meshStandardMaterial color="#6b5b4a" flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={beachGeo} receiveShadow>
        <meshStandardMaterial color="#cbb083" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={grassGeo} receiveShadow>
        <meshStandardMaterial map={grass} side={THREE.DoubleSide} />
      </mesh>

      <Foliage count={9000} area={420} flowerRatio={0.06} accept={accept} />

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

      {/* laguna del altiplano */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[LAGOON.x, 0.08, LAGOON.z]}>
        <circleGeometry args={[LAGOON.r, 56]} />
        <meshStandardMaterial color="#25b0c9" roughness={0.1} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* faro en la punta de la aleta + rocas */}
      <Prop propId="faro" position={[faro.x, 0, faro.y]} rotation={0} scale={1.5} />
      <Prop propId="roca" position={[faro.x + 5, -0.6, faro.y + 4]} scale={3} />
      <Prop propId="roca" position={[faro.x - 3, -0.6, faro.y - 5]} scale={2.6} />

      {/* puerto */}
      <Prop propId="muelle" position={port.dock} rotation={port.dockRot} scale={1.4} />
      {port.boats.map((b, i) => (
        <Prop key={`b${i}`} propId="bote" position={b} rotation={port.dockRot + 0.3} scale={1.3} />
      ))}

      {/* pueblo */}
      <Prop propId={MITO.id} position={MITO.pos} rotation={MITO.rot} scale={MITO.scale} />
      {VILLAGE.map((h, i) => (
        <Prop key={`v${i}`} propId={h.id} position={h.pos} rotation={h.rot} scale={h.scale} />
      ))}
      {forestHouses.map((h, i) => (
        <Prop key={`fh${i}`} propId={h.id} position={h.pos} rotation={h.rot} scale={h.scale} />
      ))}

      {/* bosque + laguna + costa */}
      {forest.map((f, i) => (
        <Prop key={`t${i}`} propId={f.id} position={f.pos} rotation={f.rot} scale={f.scale} />
      ))}
      {lagoonTrees.map((f, i) => (
        <Prop key={`lt${i}`} propId={f.id} position={f.pos} rotation={f.rot} scale={f.scale} />
      ))}
      {cliffs.map((c, i) => (
        <Prop key={`c${i}`} propId={c.id} position={c.pos} rotation={c.rot} scale={c.scale} />
      ))}
    </>
  );
}

import { Sky } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";

const WALL_COLORS = ["#d9b48a", "#c8a06a", "#b98b63", "#cdbfa0", "#c2a07a"];
const ROOF_COLORS = ["#9a4a3a", "#7a3b2e", "#6b4a2a", "#3f5d6b", "#834236"];

function Building({ pos, w, h, d, rot = 0, seed = 0 }: {
  pos: [number, number, number]; w: number; h: number; d: number; rot?: number; seed?: number;
}) {
  const wall = WALL_COLORS[seed % WALL_COLORS.length];
  const roof = ROOF_COLORS[(seed + 2) % ROOF_COLORS.length];
  const roofH = Math.min(1.6, w * 0.4);
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={wall} flatShading />
        </mesh>
        <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
      </RigidBody>
      {/* techo a 4 aguas */}
      <mesh castShadow position={[0, h + roofH / 2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[Math.max(w, d) * 0.72, roofH, 4]} />
        <meshStandardMaterial color={roof} flatShading />
      </mesh>
      {/* puerta */}
      <mesh position={[0, 0.6, d / 2 + 0.01]}>
        <boxGeometry args={[0.7, 1.2, 0.08]} />
        <meshStandardMaterial color="#3a2a1c" flatShading />
      </mesh>
      {/* ventanas (emisivas) */}
      {[-1, 1].map((sx) =>
        Array.from({ length: Math.max(1, Math.floor(h / 1.6)) }).map((_, r) => (
          <mesh key={`${sx}-${r}`} position={[sx * w * 0.28, 1.1 + r * 1.3, d / 2 + 0.01]}>
            <boxGeometry args={[0.42, 0.5, 0.06]} />
            <meshStandardMaterial color="#ffe6a8" emissive="#ffc24b" emissiveIntensity={0.7} flatShading />
          </mesh>
        ))
      )}
    </group>
  );
}

function Lamp({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 2.2, 6]} />
        <meshStandardMaterial color="#2a2a2e" flatShading />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial color="#fff0c0" emissive="#ffcf6b" emissiveIntensity={1.6} />
      </mesh>
    </group>
  );
}

function Tree({ p, s = 1 }: { p: [number, number, number]; s?: number }) {
  const cols = ["#3f8f44", "#357a39", "#47a04d"];
  return (
    <group position={p}>
      <mesh castShadow position={[0, 1.1 * s, 0]}>
        <cylinderGeometry args={[0.28 * s, 0.4 * s, 2.2 * s, 7]} />
        <meshStandardMaterial color="#7a4f2c" flatShading />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} castShadow position={[0, (2.4 + k * 0.9) * s, 0]} rotation={[0, k, 0]}>
          <coneGeometry args={[(1.5 - k * 0.35) * s, (1.6 - k * 0.2) * s, 7]} />
          <meshStandardMaterial color={cols[k]} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function World() {
  // edificios a ambos lados de una avenida central (eje Z), dejando el centro libre
  const buildings = useMemo(() => {
    const arr: { pos: [number, number, number]; w: number; h: number; d: number; seed: number }[] = [];
    let seed = 0;
    for (let side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const z = -18 + i * 7;
        const x = side * (7 + (i % 2) * 1.5);
        const h = 3 + ((seed * 7) % 4);
        arr.push({ pos: [x, 0, z], w: 4 + (seed % 2), h, d: 4, seed });
        seed++;
      }
    }
    // un par de manzanas extra al fondo
    for (let i = 0; i < 4; i++) {
      arr.push({ pos: [(-9 + i * 6), 0, -30], w: 4.5, h: 4 + (i % 3), d: 4.5, seed: seed++ });
    }
    return arr;
  }, []);

  const forest = useMemo(() => {
    const arr: { p: [number, number, number]; s: number; rock: boolean }[] = [];
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * 38;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      arr.push({ p: [x, 0, z], s: 0.7 + Math.random() * 0.9, rock: Math.random() < 0.2 });
    }
    return arr;
  }, []);

  const lamps: [number, number, number][] = useMemo(
    () => [-18, -11, -4, 3, 10].flatMap((z) => [[-3.4, 0, z], [3.4, 0, z]] as [number, number, number][]),
    []
  );

  return (
    <>
      <Sky sunPosition={[60, 18, -40]} turbidity={8} rayleigh={2.2} mieCoefficient={0.01} />
      <hemisphereLight args={["#ffe9c2", "#46603a", 0.7]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[40, 38, -10]} intensity={1.7} color="#ffe2b0" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-near={1} shadow-camera-far={160}
        shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={70} shadow-camera-bottom={-70}
        shadow-bias={-0.0004}
      />

      {/* césped + collider */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh receiveShadow position={[0, -0.5, 0]}>
          <boxGeometry args={[170, 1, 170]} />
          <meshStandardMaterial color="#5fa83c" />
        </mesh>
      </RigidBody>

      {/* avenida empedrada */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -8]}>
        <planeGeometry args={[7, 50]} />
        <meshStandardMaterial color="#8d8377" />
      </mesh>
      {/* plaza central */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 4]}>
        <circleGeometry args={[7, 40]} />
        <meshStandardMaterial color="#9a9082" />
      </mesh>
      {/* fuente */}
      <group position={[0, 0, 4]}>
        <mesh castShadow position={[0, 0.3, 0]}>
          <cylinderGeometry args={[1.6, 1.8, 0.6, 20]} />
          <meshStandardMaterial color="#b9b0a2" flatShading />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[1.3, 1.3, 0.15, 20]} />
          <meshStandardMaterial color="#4aa6c4" transparent opacity={0.85} roughness={0.2} />
        </mesh>
        <mesh castShadow position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.15, 0.2, 1, 8]} />
          <meshStandardMaterial color="#b9b0a2" flatShading />
        </mesh>
      </group>

      {buildings.map((b, i) => (
        <Building key={i} pos={b.pos} w={b.w} h={b.h} d={b.d} seed={b.seed} />
      ))}
      {lamps.map((p, i) => <Lamp key={i} pos={p} />)}

      {forest.map((f, i) =>
        f.rock ? (
          <mesh key={i} castShadow receiveShadow position={[f.p[0], 0.3 * f.s, f.p[2]]} rotation={[Math.random(), Math.random(), Math.random()]}>
            <dodecahedronGeometry args={[0.6 * f.s, 0]} />
            <meshStandardMaterial color="#8a8f96" flatShading />
          </mesh>
        ) : (
          <Tree key={i} p={f.p} s={f.s} />
        )
      )}
    </>
  );
}

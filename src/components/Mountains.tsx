import { useMemo } from "react";
import { RigidBody, ConeCollider } from "@react-three/rapier";
import * as THREE from "three";
import { OCEAN_Y } from "../data/island";

type Peak = { pos: [number, number, number]; h: number; r: number; collide?: boolean };

function makeMountainGeo(h: number, r: number): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(r, h, 9, 4, false);
  geo.translate(0, h / 2, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  const rockA = new THREE.Color("#6b6053");
  const rockB = new THREE.Color("#7d7164");
  const grass = new THREE.Color("#4f7a3a");
  const snow = new THREE.Color("#eef3f6");
  const vv = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    vv.fromBufferAttribute(pos, i);
    const hN = vv.y / h;
    // ruido sólo en la ladera (no base ni punta) para romper el cono perfecto
    if (hN > 0.04 && hN < 0.95) {
      vv.x += Math.sin(i * 12.9) * r * 0.11;
      vv.z += Math.cos(i * 7.7) * r * 0.11;
      pos.setXYZ(i, vv.x, vv.y, vv.z);
    }
    // límite de nieve irregular
    const snowN = Math.sin(i * 5.5) * 0.05;
    const grassN = Math.cos(i * 3.3) * 0.03;
    let c: THREE.Color;
    if (hN + snowN > 0.62) c = snow;
    else if (hN + grassN < 0.14) c = grass;
    else c = i % 2 ? rockA : rockB;
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function Mountains() {
  const all = useMemo<Peak[]>(() => {
    // Sistema Montañoso Central (oeste-centro) — con colisión real (cono)
    const ridge: Peak[] = [
      { pos: [-95, 0, -8], h: 98, r: 48, collide: true },   // Pico Principal
      { pos: [-135, 0, 16], h: 72, r: 40, collide: true },
      { pos: [-118, 0, -38], h: 74, r: 38, collide: true },
      { pos: [-60, 0, -28], h: 70, r: 36, collide: true },
      { pos: [-58, 0, 22], h: 64, r: 34, collide: true },
      { pos: [-34, 0, -4], h: 58, r: 28, collide: true },    // fuente de la Cascada Grande
    ];
    // telón de fondo lejano (sale del mar, sin colisión)
    const backdrop: Peak[] = [];
    const N = 10;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.3;
      const R = 300 + Math.random() * 80;
      backdrop.push({
        pos: [Math.cos(a) * R, OCEAN_Y - 6, Math.sin(a) * R * 0.7],
        h: 140 + Math.random() * 90,
        r: 75 + Math.random() * 40,
      });
    }
    return [...ridge, ...backdrop];
  }, []);

  const geos = useMemo(() => all.map((p) => makeMountainGeo(p.h, p.r)), [all]);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }),
    []
  );

  return (
    <>
      {all.map((p, i) =>
        p.collide ? (
          <RigidBody key={i} type="fixed" colliders={false} position={p.pos}>
            <mesh geometry={geos[i]} material={mat} castShadow receiveShadow />
            {/* el cono colisiona en toda la ladera, no sólo un cilindro central */}
            <ConeCollider args={[p.h / 2, p.r]} position={[0, p.h / 2, 0]} />
          </RigidBody>
        ) : (
          <mesh key={i} geometry={geos[i]} material={mat} position={p.pos} />
        )
      )}
    </>
  );
}

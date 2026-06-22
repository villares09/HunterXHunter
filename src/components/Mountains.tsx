import { useMemo } from "react";
import { RigidBody, CylinderCollider } from "@react-three/rapier";
import * as THREE from "three";
import { OCEAN_Y } from "../data/Island";

type Peak = { pos: [number, number, number]; h: number; r: number; collide?: boolean };

function makeMountainGeo(h: number, r: number): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(r, h, 9, 4, false);
  geo.translate(0, h / 2, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  
  // Colores del bioma Isla Ballena / Skyrim
  const rockA = new THREE.Color("#675d52");
  const rockB = new THREE.Color("#7b6f62");
  const grass = new THREE.Color("#4f7a3a");
  const snow = new THREE.Color("#eef3f6");
  const pathColor = new THREE.Color("#8b7355"); // Tierra marrón para el sendero
  
  const vv = new THREE.Vector3();
  
  for (let i = 0; i < pos.count; i++) {
    vv.fromBufferAttribute(pos, i);
    const hN = vv.y / h; // Altura normalizada (0 en la base, 1 en la punta)
    
    // ===== 🥾 DETECCIÓN DEL CAMINO EN ESPIRAL =====
    // Calculamos el ángulo en radianes alrededor del centro de la montaña
    const angle = Math.atan2(vv.z, vv.x);
    // Pasamos el ángulo a un rango de 0 a 1
    const angleNorm = (angle + Math.PI) / (2 * Math.PI);
    
    // Definimos cuántas vueltas da el camino alrededor del pico (ej: 2 vueltas)
    const loops = 2;
    const pathCenter = (hN * loops) % 1;
    
    // Comprobamos si el vértice actual está dentro del ancho del camino
    const pathWidth = 0.06;
    const isPath = Math.abs(angleNorm - pathCenter) < pathWidth && hN > 0.1 && hN < 0.65;
    // ===============================================

    // Deformación física de la montaña (ruido en los vértices)
    if (hN > 0.02 && hN < 0.97) {
      // Si es camino, reducimos el ruido para que la superficie quede más plana y caminable
      const noiseIntensity = isPath ? 0.05 : 0.22;
      
      vv.x += Math.sin(i * 12.9) * 0.5 * r * noiseIntensity;
      vv.z += Math.cos(i * 7.7) * 0.5 * r * noiseIntensity;
      
      // Aplanamos un cachito la ladera donde pasa el camino para simular un sendero picado en la roca
      if (isPath) {
        vv.x *= 1.02;
        vv.z *= 1.02;
      }
      
      pos.setXYZ(i, vv.x, vv.y, vv.z);
    }
    
    // ===== ❄️ SISTEMA DE COLOR DINÁMICO =====
    // Agregamos una pequeña variación matemática al límite de la nieve para que no quede una línea recta
    const snowNoise = Math.sin(i * 5.5) * 0.04;
    const grassNoise = Math.cos(i * 3.3) * 0.02;
    
    let vertexColor;
    if (hN + snowNoise > 0.66) {
      vertexColor = snow; // Nieve irregular en las cumbres
    } else if (isPath) {
      vertexColor = pathColor; // El sendero que sube la montaña
    } else if (hN + grassNoise < 0.12) {
      vertexColor = grass; // Pasto en las faldas inferiores que conecta con la isla
    } else {
      vertexColor = i % 2 ? rockA : rockB; // Roca expuesta en los acantilados de la montaña
    }
    
    colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
  }
  
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function Mountains() {
  const all = useMemo<Peak[]>(() => {
    // cordillera del altiplano (lado bosque, +X) — alcanzable, con colisión
    const ridge: Peak[] = [
      { pos: [95, 0, 42], h: 55, r: 30, collide: true },
      { pos: [132, 0, 22], h: 74, r: 38, collide: true },
      { pos: [120, 0, -26], h: 60, r: 32, collide: true },
      { pos: [158, 0, 4], h: 50, r: 26, collide: true },
    ];
    // telón de fondo lejano (sale del mar, sin colisión)
    const backdrop: Peak[] = [];
    const N = 9;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.3;
      const R = 290 + Math.random() * 70;
      backdrop.push({
        pos: [Math.cos(a) * R, OCEAN_Y - 6, Math.sin(a) * R * 0.72],
        h: 130 + Math.random() * 90,
        r: 70 + Math.random() * 40,
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
            <CylinderCollider args={[p.h / 2, p.r * 0.55]} position={[0, p.h / 2, 0]} />
          </RigidBody>
        ) : (
          <mesh key={i} geometry={geos[i]} material={mat} position={p.pos} />
        )
      )}
    </>
  );
}

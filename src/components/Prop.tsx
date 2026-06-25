import { useGLTF } from "@react-three/drei";
import { RigidBody, CuboidCollider, CylinderCollider } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { getProp } from "../data/world";
import { heightAt } from "./Terrain";

export function Prop({
  propId,
  position,
  rotation = 0,
  scale = 1,
}: {
  propId: string;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  const def = getProp(propId);
  const { scene } = useGLTF(def.url);

  // clona el GLB y lo escala por bbox -> dims y offset de apoyo salen solos
  const { model, dims, baseY } = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; }
    });
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    // si el modelo está roto (bbox NaN/Infinito), usamos un tamaño seguro por defecto
    const sy = Number.isFinite(size.y) && size.y > 0 ? size.y : 1;
    let s = (def.height / sy) * scale;
    if (!Number.isFinite(s) || s <= 0) s = 1;
    m.scale.setScalar(s);
    // dims clampeadas: nunca NaN/Infinito/cero -> el collider de Rapier nunca explota
    const safe = (v: number) => (Number.isFinite(v) && v > 0.01 ? v : 0.5);
    const dims = new THREE.Vector3(safe(size.x * s), safe(size.y * s), safe(size.z * s));
    const rawBaseY = -box.min.y * s;
    const baseY = Number.isFinite(rawBaseY) ? rawBaseY : 0;
    return { model: m, dims, baseY };
  }, [scene, def, scale]);

  const yaw = rotation + (def.faceFlip ? Math.PI : 0);
  const trunkH = Math.min(dims.y, 2.6); // el tronco frena, el follaje no

  // apoyar al terreno tomando la esquina MÁS BAJA bajo la base del prop, así en
  // pendiente ninguna esquina queda en el aire (Opción B). Si la Y guardada no es 0,
  // se respeta (props colocados a mano, botes sobre agua, etc).
  let safeY: number;
  if (position[1] === 0) {
    const hx = (dims.x / 2) * 0.9, hz = (dims.z / 2) * 0.9; // medio ancho de la base
    const cx = position[0], cz = position[2];
    const samples = [
      heightAt(cx - hx, cz - hz), heightAt(cx + hx, cz - hz),
      heightAt(cx - hx, cz + hz), heightAt(cx + hx, cz + hz),
      heightAt(cx, cz),
    ].filter(Number.isFinite) as number[];
    safeY = samples.length ? Math.min(...samples) : 0;
  } else {
    safeY = Number.isFinite(position[1]) ? position[1] : 0;
  }
  const groundPos: [number, number, number] = [position[0], safeY, position[2]];

  return (
    <RigidBody type="fixed" colliders={false} position={groundPos} rotation={[0, yaw, 0]}>
      <group position={[0, baseY, 0]}>
        <primitive object={model} />
      </group>

      {def.collider === "box" && (
        <CuboidCollider
          args={[(dims.x / 2) * (def.colliderScale ?? 1), dims.y / 2, (dims.z / 2) * (def.colliderScale ?? 1)]}
          position={[0, dims.y / 2, 0]}
        />
      )}
      {def.collider === "trunk" && (
        <CylinderCollider
          args={[trunkH / 2, def.trunkRadius ?? 0.45]}
          position={[0, trunkH / 2, 0]}
        />
      )}
    </RigidBody>
  );
}

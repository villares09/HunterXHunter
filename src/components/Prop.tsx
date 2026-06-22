import { useGLTF } from "@react-three/drei";
import { RigidBody, CuboidCollider, CylinderCollider } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { getProp } from "../data/world";

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
    const s = (def.height / (size.y || 1)) * scale;
    m.scale.setScalar(s);
    // escala uniforme -> el bbox escalado es el crudo * s (sin re-medir)
    const dims = size.clone().multiplyScalar(s);
    const baseY = -box.min.y * s; // apoya la base en y=0
    return { model: m, dims, baseY };
  }, [scene, def, scale]);

  const yaw = rotation + (def.faceFlip ? Math.PI : 0);
  const trunkH = Math.min(dims.y, 2.6); // el tronco frena, el follaje no

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, yaw, 0]}>
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

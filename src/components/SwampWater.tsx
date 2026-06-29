import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { OCEAN_Y } from "../data/island";

/* ===== AJUSTÁ ESTO MIRANDO EN PANTALLA ===== */
const SWAMP_CENTER: [number, number] = [107, 39]; // (x, z) del pozo del pantano
const SWAMP_RADIUS = 53;                            // agrandá/achicá hasta tapar el pozo
/* nivel del agua: bien por encima de la cresta del océano (que llega a ~OCEAN_Y+0.85)
   para que NUNCA le pase por arriba una ola del mar. */
const SWAMP_WATER_Y = OCEAN_Y + 1
/* =========================================== */

const SEAL_Y = OCEAN_Y + 0.6; // tapa opaca debajo: sella el azul del océano

export function SwampWater() {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.CircleGeometry(SWAMP_RADIUS, 64), []);
  const sealGeo = useMemo(() => new THREE.CircleGeometry(SWAMP_RADIUS + 4, 48), []);
  const base = useMemo(
    () => ((geo.attributes.position as THREE.BufferAttribute).array as Float32Array).slice(),
    [geo]
  );

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const ix = i * 3;
      const x = base[ix], y = base[ix + 1];
      pos.setZ(i, Math.sin(x * 0.05 + t * 0.6) * 0.12 + Math.sin(y * 0.07 + t * 0.4) * 0.1);
    }
    pos.needsUpdate = true;
  });

  return (
    <group>
      {/* tapa opaca: bloquea el azul del océano que está debajo del pozo */}
      <mesh
        geometry={sealGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[SWAMP_CENTER[0], SEAL_Y, SWAMP_CENTER[1]]}
      >
        <meshStandardMaterial color="#3f5f3a" roughness={1} metalness={0} />
      </mesh>

      {/* superficie de agua del pantano */}
      <mesh
        ref={ref}
        geometry={geo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[SWAMP_CENTER[0], SWAMP_WATER_Y, SWAMP_CENTER[1]]}
        receiveShadow
        renderOrder={2}
      >
        <meshStandardMaterial
          color="#3f5f3a"
          roughness={0.65}
          metalness={0.05}
          transparent
          opacity={0.92}
        />
      </mesh>
    </group>
  );
}

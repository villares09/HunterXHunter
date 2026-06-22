import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { OCEAN_Y } from "../data/Island";

export function Ocean() {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(2400, 2400, 48, 48), []);
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
      pos.setZ(i, Math.sin(x * 0.012 + t) * 0.5 + Math.sin(y * 0.018 + t * 0.8) * 0.35);
    }
    pos.needsUpdate = true;
  });

  return (
    <mesh ref={ref} geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, OCEAN_Y, 0]} receiveShadow>
      <meshStandardMaterial color="#2f7fb5" roughness={0.25} metalness={0.15} />
    </mesh>
  );
}
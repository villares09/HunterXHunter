import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { OCEAN_Y } from "../data/island";

/* ===== zona calma (bahía del muelle) ===== */
const CALM_CENTER: [number, number] = [170, -59]; // (x, z) del muelle
const CALM_RADIUS = 90;   // adentro de esto: agua casi quieta
const CALM_FALLOFF = 120; // transición de calmo -> mar abierto
/* ========================================= */

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smoothstep = (t: number) => { t = clamp01(t); return t * t * (3 - 2 * t); };

export function Ocean() {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(2400, 2400, 48, 48), []);
  const base = useMemo(
    () => ((geo.attributes.position as THREE.BufferAttribute).array as Float32Array).slice(),
    [geo]
  );

  // factor de oleaje por vértice: 0 en el muelle, 1 en mar abierto (se calcula una vez)
  const damp = useMemo(() => {
    const n = base.length / 3;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      const wx = base[ix];        // local x -> world x
      const wz = -base[ix + 1];   // local y -> world z (plano rotado -90° en X)
      const d = Math.hypot(wx - CALM_CENTER[0], wz - CALM_CENTER[1]);
      out[i] = smoothstep((d - CALM_RADIUS) / CALM_FALLOFF);
    }
    return out;
  }, [base]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const ix = i * 3;
      const x = base[ix], y = base[ix + 1];
      const wave = Math.sin(x * 0.012 + t) * 0.5 + Math.sin(y * 0.018 + t * 0.8) * 0.35;
      pos.setZ(i, wave * damp[i]); // cerca del muelle damp≈0 -> agua quieta
    }
    pos.needsUpdate = true;
  });

  return (
    <mesh ref={ref} geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, OCEAN_Y, 0]} receiveShadow>
      <meshStandardMaterial color="#2f7fb5" roughness={0.25} metalness={0.15} />
    </mesh>
  );
}

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRPG } from "../store";

/** Avanza el reloj del store cada frame (hitstop, combo, floaters). */
export function SceneTick() {
  useFrame((_, dt) => useRPG.getState().tick(Math.min(dt, 0.05)));
  return null;
}

const COLORS: Record<string, string> = {
  hit: "#ffffff",
  crit: "#ffc24b",
  hurt: "#ff6b6b",
  info: "#9ad9ff",
  aura: "#7df0ff",
};

/** Números de daño / EXP flotantes (DOM proyectado al espacio 3D). */
export function Floaters() {
  const floaters = useRPG((s) => s.floaters);
  return (
    <>
      {floaters.map((f) => (
        <Html key={f.id} position={f.pos} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontWeight: 700,
              fontSize: f.kind === "crit" ? 26 : f.kind === "info" ? 15 : 19,
              color: COLORS[f.kind],
              textShadow: "0 1px 3px rgba(0,0,0,.7)",
              opacity: Math.min(1, f.life * 1.4),
              whiteSpace: "nowrap",
            }}
          >
            {f.text}
          </div>
        </Html>
      ))}
    </>
  );
}

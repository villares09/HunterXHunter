import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRPG } from "@/store";

/**
 * AuraBurst — primer ladrillo del AuraController (sistema de aura del Nen, futuro).
 *
 * Versión INTERMEDIA (cierre Fase 2): un anillo dorado + partículas que nacen
 * en el suelo (a los pies) y SUBEN juntos por el cuerpo, desvaneciéndose arriba.
 * Todo va en un solo sentido: del piso hacia arriba. SIN shader de silueta ni
 * bloom (eso queda para la sesión dedicada de VFX/Ren).
 *
 * Parametrizado {color, alpha, radius, duration, count, riseSpeed} para reusarse
 * como base de Ren/Ten (cambiar color a blanquecino, bajar alpha/velocidad, etc.).
 *
 * Disparo: lee `levelUpAt` del store (cambia en cada subida de nivel). No
 * instancia/destruye: reusa el mismo buffer de partículas + la misma malla.
 */
export function AuraBurst({
  color = "#ffd45a",
  alpha = 0.5,
  radius = 0.55,
  duration = 2.2,
  count = 200,
  riseSpeed = 2.2,
}: {
  color?: string;
  alpha?: number;
  radius?: number;
  duration?: number;
  count?: number;
  riseSpeed?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const points = useRef<THREE.Points>(null);
  const ring = useRef<THREE.Mesh>(null);

  const seenAt = useRef(0);
  const startedAt = useRef(0);

  // altura total que recorre el anillo al subir (de los pies hacia arriba)
  const RISE_HEIGHT = 2.4;

  // datos por partícula: ángulo, radio, velocidad y caos propios
  const seeds = useMemo(() => {
    const arr: { ang: number; rad: number; vy: number; wob: number; phase: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        ang: Math.random() * Math.PI * 2,
        rad: radius * (0.3 + Math.random() * 0.7),
        vy: 0.7 + Math.random() * 0.9,
        wob: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count, radius]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);

  // textura de punto suave (círculo con fade en los bordes)
  const sprite = useMemo(() => {
    const s = 64;
    const cv = document.createElement("canvas");
    cv.width = cv.height = s;
    const ctx = cv.getContext("2d")!;
    const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.7)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame(() => {
    const g = group.current, p = points.current, r = ring.current;
    if (!g || !p || !r) return;

    const luAt = useRPG.getState().levelUpAt;
    if (luAt && luAt !== seenAt.current) {
      seenAt.current = luAt;
      startedAt.current = performance.now();
    }
    if (startedAt.current === 0) return;

    const t = (performance.now() - startedAt.current) / 1000 / duration;
    if (t >= 1) {
      startedAt.current = 0;
      g.visible = false;
      return;
    }
    g.visible = true;

    // ---- PARTÍCULAS: nacen abajo y suben con caos, fade en el tramo final ----
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const climb = t * riseSpeed;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      const h = climb * s.vy;
      const wob = Math.sin(t * 10 + s.phase) * s.wob * (1 - t);
      const x = Math.cos(s.ang) * (s.rad + wob);
      const z = Math.sin(s.ang) * (s.rad + wob);
      pos.setXYZ(i, x, 0.1 + h, z);
    }
    pos.needsUpdate = true;

    const pm = p.material as THREE.PointsMaterial;
    const pAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    pm.opacity = alpha * Math.max(0, pAlpha);
    pm.size = 0.22 * (1 - t * 0.4);

    // ---- ANILLO: nace en el piso y SUBE junto a las partículas ----
    // sube en Y, mantiene su tamaño (no se expande horizontal), y se desvanece
    // a medida que llega arriba.
    r.position.y = 0.05 + t * RISE_HEIGHT;
    const rm = r.material as THREE.MeshBasicMaterial;
    // opacidad: entra rápido y decae hacia el final del recorrido
    const ringA = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
    rm.opacity = 0.6 * Math.max(0, ringA);
    // un leve pulso de tamaño para que respire, sin crecer descontrolado
    const rs = 1 + Math.sin(t * Math.PI) * 0.15;
    r.scale.setScalar(rs);
  });

  return (
    <group ref={group} visible={false} position={[0, -0.8, 0]}>
      {/* partículas / chispas que suben */}
      <points ref={points} geometry={geo}>
        <pointsMaterial
          map={sprite}
          color={color}
          size={0.22}
          transparent
          opacity={alpha}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* anillo que sube desde el piso junto a las partículas */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[radius * 0.9, radius * 1.15, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

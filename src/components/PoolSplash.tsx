import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* =========================================================================
   POOL SPLASH — reemplaza el anillo/target feo del pozo por partículas.
   Dos sistemas:
     - SALPICADURA: partículas que saltan del impacto y caen (loop).
     - SPRAY/NIEBLA: partículas tenues que flotan y suben suave alrededor.
   Todo con <points> nativo de R3F. Los números de arriba son para tunear.
   ========================================================================= */

/* ---- salpicadura (impacto) ---- */
const SPLASH_COUNT = 300;      // cantidad de gotas
const SPLASH_SPREAD = 20;    // radio horizontal desde el centro
const SPLASH_UP = 4.5;        // velocidad vertical inicial
const SPLASH_OUT = 10;       // velocidad horizontal (afuera)
const SPLASH_GRAV = 9.0;      // gravedad
const SPLASH_SIZE = 0.05;      // tamaño de la gota
const SPLASH_LIFE = 1.1;      // segundos de vida

/* ---- spray / niebla ---- */
const SPRAY_COUNT = 300;
const SPRAY_SPREAD = 6.0;     // radio de la niebla
const SPRAY_RISE = 1.5;       // qué tan rápido sube
const SPRAY_SIZE = 0.1;       // tamaño (grande y difuso)
const SPRAY_HEIGHT = 2.0;     // hasta qué altura sube antes de reciclar

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/* textura circular suave (punto difuso) generada en canvas, para que las
   partículas no sean cuadraditos. se crea una vez y se comparte. */
function makeDotTexture(): THREE.Texture {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export function PoolSplash({ x, y, z }: { x: number; y: number; z: number }) {
  const dot = useMemo(() => makeDotTexture(), []);

  // ---- salpicadura ----
  const splash = useMemo(() => {
    const pos = new Float32Array(SPLASH_COUNT * 3);
    const vel = new Float32Array(SPLASH_COUNT * 3);
    const life = new Float32Array(SPLASH_COUNT);
    for (let i = 0; i < SPLASH_COUNT; i++) resetSplash(pos, vel, life, i, true);
    return { pos, vel, life };
  }, []);
  const splashRef = useRef<THREE.BufferAttribute>(null);

  // ---- spray ----
  const spray = useMemo(() => {
    const pos = new Float32Array(SPRAY_COUNT * 3);
    for (let i = 0; i < SPRAY_COUNT; i++) resetSpray(pos, i, true);
    return { pos };
  }, []);
  const sprayRef = useRef<THREE.BufferAttribute>(null);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05); // clamp: evita saltos si baja el fps

    // salpicadura: mover, aplicar gravedad, reciclar al morir
    const { pos, vel, life } = splash;
    for (let i = 0; i < SPLASH_COUNT; i++) {
      const ix = i * 3;
      life[i] -= dt;
      if (life[i] <= 0 || pos[ix + 1] < 0) { resetSplash(pos, vel, life, i, false); continue; }
      vel[ix + 1] -= SPLASH_GRAV * dt;
      pos[ix] += vel[ix] * dt;
      pos[ix + 1] += vel[ix + 1] * dt;
      pos[ix + 2] += vel[ix + 2] * dt;
    }
    if (splashRef.current) splashRef.current.needsUpdate = true;

    // spray: subir lento y reciclar arriba
    const sp = spray.pos;
    for (let i = 0; i < SPRAY_COUNT; i++) {
      const ix = i * 3;
      sp[ix + 1] += SPRAY_RISE * dt;
      if (sp[ix + 1] > SPRAY_HEIGHT) resetSpray(sp, i, false);
    }
    if (sprayRef.current) sprayRef.current.needsUpdate = true;
  });

  return (
    <group position={[x, y, z]}>
      {/* salpicadura: gotas blancas que saltan */}
      <points>
        <bufferGeometry>
          <bufferAttribute ref={splashRef} attach="attributes-position" args={[splash.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={dot} size={SPLASH_SIZE} color="#ffffff" transparent opacity={0.9}
          depthWrite={false} sizeAttenuation blending={THREE.AdditiveBlending}
        />
      </points>

      {/* spray: niebla difusa */}
      <points>
        <bufferGeometry>
          <bufferAttribute ref={sprayRef} attach="attributes-position" args={[spray.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={dot} size={SPRAY_SIZE} color="#dff2f8" transparent opacity={0.22}
          depthWrite={false} sizeAttenuation blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/* nace en el centro con impulso hacia arriba y afuera. `spread` = arranque
   desperdigado en el tiempo (para que no salgan todas juntas al inicio). */
function resetSplash(pos: Float32Array, vel: Float32Array, life: Float32Array, i: number, initial: boolean) {
  const ix = i * 3;
  const ang = Math.random() * Math.PI * 2;
  const r = Math.random() * 0.4; // nacen cerca del centro
  pos[ix] = Math.cos(ang) * r;
  pos[ix + 1] = initial ? Math.random() * 1.5 : 0.05; // arranque escalonado
  pos[ix + 2] = Math.sin(ang) * r;
  const out = rand(0.3, 1) * SPLASH_OUT;
  vel[ix] = Math.cos(ang) * out;
  vel[ix + 1] = rand(0.6, 1) * SPLASH_UP;
  vel[ix + 2] = Math.sin(ang) * out;
  life[i] = rand(0.5, 1) * SPLASH_LIFE;
  // limitar el spread horizontal máximo
  if (Math.abs(pos[ix]) > SPLASH_SPREAD) pos[ix] = Math.sign(pos[ix]) * SPLASH_SPREAD;
  if (Math.abs(pos[ix + 2]) > SPLASH_SPREAD) pos[ix + 2] = Math.sign(pos[ix + 2]) * SPLASH_SPREAD;
}

function resetSpray(pos: Float32Array, i: number, initial: boolean) {
  const ix = i * 3;
  const ang = Math.random() * Math.PI * 2;
  const r = Math.random() * SPRAY_SPREAD;
  pos[ix] = Math.cos(ang) * r;
  pos[ix + 1] = initial ? Math.random() * SPRAY_HEIGHT : 0;
  pos[ix + 2] = Math.sin(ang) * r;
}

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* =========================================================================
   POOL SPLASH — partículas del pie de la cascada.
   El impacto es una LÍNEA a lo ancho de la cinta (como una cascada real),
   no un punto. El grupo se rota (rotY) para que su eje X local coincida
   con el ancho de la lámina.
     - SALPICADURA: gotas que nacen a lo largo de la línea y saltan
       hacia afuera (adelante/atrás del impacto).
     - SPRAY/NIEBLA: elipse difusa estirada a lo largo del ancho.
   `width` = ancho de la cinta. `radius` = qué tan lejos salpica.
   ========================================================================= */

/* ---- salpicadura (impacto) ---- */
const SPLASH_COUNT = 300;
const SPLASH_UP = 4.5;
const SPLASH_OUT = 7.0;       // velocidad de salida (a radio base)
const SPLASH_GRAV = 9.0;
const SPLASH_SIZE = 0.08;
const SPLASH_LIFE = 1.1;

/* ---- spray / niebla ---- */
const SPRAY_COUNT = 300;
const SPRAY_SPREAD = 2.0;     // profundidad de la niebla (a radio base)
const SPRAY_RISE = 1.5;
const SPRAY_SIZE = 0.1;
const SPRAY_HEIGHT = 2.0;

const BASE_RADIUS = 6;        // radio de referencia del slider

const rand = (a: number, b: number) => a + Math.random() * (b - a);

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
  return new THREE.CanvasTexture(c);
}

type Props = {
  x: number; y: number; z: number;
  radius?: number;   // alcance de la salpicadura (slider)
  width?: number;    // ancho de la cinta (línea de impacto)
  rotY?: number;     // orientación: X local = ancho de la lámina
};

export function PoolSplash({ x, y, z, radius = 6, width = 5, rotY = 0 }: Props) {
  const dot = useMemo(() => makeDotTexture(), []);
  // params vivos (los sliders no re-alocan arrays)
  const pRef = useRef({ scale: radius / BASE_RADIUS, halfW: width / 2 });
  pRef.current.scale = radius / BASE_RADIUS;
  pRef.current.halfW = width / 2;

  // ---- salpicadura ----
  const splash = useMemo(() => {
    const pos = new Float32Array(SPLASH_COUNT * 3);
    const vel = new Float32Array(SPLASH_COUNT * 3);
    const life = new Float32Array(SPLASH_COUNT);
    for (let i = 0; i < SPLASH_COUNT; i++) resetSplash(pos, vel, life, i, true, pRef.current);
    return { pos, vel, life };
  }, []);
  const splashRef = useRef<THREE.BufferAttribute>(null);

  // ---- spray ----
  const spray = useMemo(() => {
    const pos = new Float32Array(SPRAY_COUNT * 3);
    for (let i = 0; i < SPRAY_COUNT; i++) resetSpray(pos, i, true, pRef.current);
    return { pos };
  }, []);
  const sprayRef = useRef<THREE.BufferAttribute>(null);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const p = pRef.current;

    const { pos, vel, life } = splash;
    for (let i = 0; i < SPLASH_COUNT; i++) {
      const ix = i * 3;
      life[i] -= dt;
      if (life[i] <= 0 || pos[ix + 1] < 0) { resetSplash(pos, vel, life, i, false, p); continue; }
      vel[ix + 1] -= SPLASH_GRAV * dt;
      pos[ix] += vel[ix] * dt;
      pos[ix + 1] += vel[ix + 1] * dt;
      pos[ix + 2] += vel[ix + 2] * dt;
    }
    if (splashRef.current) splashRef.current.needsUpdate = true;

    const sp = spray.pos;
    for (let i = 0; i < SPRAY_COUNT; i++) {
      const ix = i * 3;
      sp[ix + 1] += SPRAY_RISE * dt;
      if (sp[ix + 1] > SPRAY_HEIGHT) resetSpray(sp, i, false, p);
    }
    if (sprayRef.current) sprayRef.current.needsUpdate = true;
  });

  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      <points>
        <bufferGeometry>
          <bufferAttribute ref={splashRef} attach="attributes-position" args={[splash.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={dot} size={SPLASH_SIZE} color="#ffffff" transparent opacity={0.9}
          depthWrite={false} sizeAttenuation blending={THREE.AdditiveBlending}
        />
      </points>

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

/* nace en un punto al azar de la LÍNEA de impacto (eje X local, ancho de la
   cinta) y salta hacia arriba y afuera (eje Z, adelante/atrás). */
function resetSplash(
  pos: Float32Array, vel: Float32Array, life: Float32Array,
  i: number, initial: boolean, p: { scale: number; halfW: number }
) {
  const ix = i * 3;
  pos[ix] = rand(-1, 1) * p.halfW;          // a lo largo del ancho
  pos[ix + 1] = initial ? Math.random() * 1.5 : 0.05;
  pos[ix + 2] = rand(-0.2, 0.2);            // pegado a la línea

  const out = rand(0.3, 1) * SPLASH_OUT * p.scale;
  const side = Math.random() < 0.5 ? -1 : 1; // salpica a ambos lados
  vel[ix] = rand(-0.4, 0.4) * SPLASH_OUT * p.scale;  // deriva lateral leve
  vel[ix + 1] = rand(0.6, 1) * SPLASH_UP;
  vel[ix + 2] = side * out;
  life[i] = rand(0.5, 1) * SPLASH_LIFE;
}

/* niebla en elipse: larga a lo ancho de la cinta, corta en profundidad */
function resetSpray(pos: Float32Array, i: number, initial: boolean, p: { scale: number; halfW: number }) {
  const ix = i * 3;
  pos[ix] = rand(-1, 1) * (p.halfW + SPRAY_SPREAD * p.scale * 0.5);
  pos[ix + 1] = initial ? Math.random() * SPRAY_HEIGHT : 0;
  pos[ix + 2] = rand(-1, 1) * SPRAY_SPREAD * p.scale;
}

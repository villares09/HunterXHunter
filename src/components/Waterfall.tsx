import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heightAt } from "./Terrain";
import { getWaterfalls, useWaterfalls, type Waterfall as WF } from "@/data/waterfallStore";
import { PoolSplash } from "./PoolSplash";

/* =========================================================================
   Cascada estilo toon, port del approach de Waterfall-ThreeJs-Sh4nu:
   - materiales OPACOS de dos colores planos (clave para que se vea igual
     desde cualquier ángulo: sin transparencia no hay artefactos de blending)
   - patrones por textura PERLIN + step() duro (orgánico, sin moiré)
   La geometría sigue siendo nuestra: cinta procedural que sigue el terreno
   y se corta al tocar el agua del pozo.
   ========================================================================= */

const SEGMENTS = 24;
const smoothstep01 = (x: number) => { const t = x < 0 ? 0 : x > 1 ? 1 : x; return t * t * (3 - 2 * t); };

/* ---------- textura perlin compartida (generada una vez, sin asset) ---------- */
let PERLIN: THREE.CanvasTexture | null = null;
function getPerlin(): THREE.CanvasTexture {
  if (PERLIN) return PERLIN;
  const size = 256;
  const P = 16; // celdas del lattice (wrappea → textura seamless)
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);

  const vals = new Float32Array(P * P);
  for (let i = 0; i < vals.length; i++) vals[i] = Math.random();
  const fade = (t: number) => t * t * (3 - 2 * t);
  const at = (x: number, y: number) => vals[(((y % P) + P) % P) * P + (((x % P) + P) % P)];
  const noise = (fx: number, fy: number) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fade(fx - x0), ty = fade(fy - y0);
    const a = at(x0, y0), b = at(x0 + 1, y0), d = at(x0, y0 + 1), e = at(x0 + 1, y0 + 1);
    return a + (b - a) * tx + (d - a) * ty + (a - b - d + e) * tx * ty;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0, amp = 0.5, freq = 1;
      for (let o = 0; o < 4; o++) {
        v += noise((x / size) * P * freq, (y / size) * P * freq) * amp;
        amp *= 0.5; freq *= 2;
      }
      const g = Math.max(0, Math.min(255, Math.round((v / 0.9375) * 255)));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  PERLIN = new THREE.CanvasTexture(c);
  PERLIN.wrapS = PERLIN.wrapT = THREE.RepeatWrapping;
  return PERLIN;
}

/* ---------- shaders (port adaptado del repo de referencia) ---------- */
const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vUv = uv;
}
`;

/* lámina que cae: vetas perlin estiradas que bajan + espuma dentada
   en los bordes (en METROS de mundo vía uLen, estable ante el largo) */
const FALL_FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uPerlin;
uniform float uTime;
uniform float uLen;    // largo 3D real de la cascada
uniform float uWidth;  // ancho de la cinta
uniform vec3 uColDark;
uniform vec3 uColLight;

void main() {
  // agua cayendo: manchas de perlin estiradas, scrolleando hacia el pozo
  vec2 fallingUv = vUv;
  fallingUv.y = vUv.y * uLen / 18.0 + uTime * 0.8;
  fallingUv.x = vUv.x * uWidth / 2.0;
  float falling = texture2D(uPerlin, fallingUv).r;
  falling = 1.0 - step(0.4, falling);

  vec3 color = mix(uColDark, uColLight, falling);

  // espuma en cresta y pie: banda en metros, borde tembloroso por perlin
  float wob = texture2D(uPerlin, vec2(vUv.x * 2.0 + uTime * 0.25, 0.3)).r;
  float bandTop = (0.3 + wob * 0.9) / uLen;
  float bandBot = (0.4 + wob * 1.3) / uLen;
  float foam = step(1.0 - bandTop, vUv.y) + (1.0 - step(bandBot, vUv.y));
  color = mix(color, uColLight, clamp(foam, 0.0, 1.0));

  gl_FragColor = vec4(color, 1.0);
}
`;

/* pozo: flujo perlin + mancha de impacto con borde vivo + ondas
   concéntricas rotas por perlin que se alejan del impacto */
const POOL_FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uPerlin;
uniform float uTime;
uniform vec3 uColDark;
uniform vec3 uColLight;

void main() {
  // flujo: vetas alargadas avanzando
  vec2 flowUv = vUv;
  flowUv.y -= uTime * 0.2;
  flowUv *= 10.0;
  flowUv.x /= 7.0;
  float flow = texture2D(uPerlin, flowUv).r;
  flow = 0.75 - step(0.35, flow);

  // impacto: mancha central cuyo borde tiembla con perlin (la "neblina")
  vec2 fallingTexUv = vUv;
  fallingTexUv.y -= uTime * 0.3;
  fallingTexUv.x *= 4.0;
  float fallingPerlin = texture2D(uPerlin, fallingTexUv).r;
  vec2 fallingUv = vUv - 0.5;
  float fallingArea = 1.0 - distance(vec2(0.0, fallingPerlin * 0.1), fallingUv) * 3.0;
  fallingArea = step(0.4, fallingArea);

  // ondas concéntricas que salen del impacto, rotas por perlin
  vec2 rippleUv = (vUv - 0.5) * 1.2;
  float ripple = distance(vec2(0.0), rippleUv);
  float ripplePerlin = texture2D(uPerlin, vUv - 0.5).r;
  float rippleFade = clamp(((1.0 - ripple) - 0.5) * 2.0 + 0.5, 0.0, 1.0);
  ripple -= uTime * 0.12;
  ripple = mod((ripple - ripplePerlin * 0.025) * 30.0, 1.0);
  float strock = 0.7 + ripplePerlin * 0.45;
  strock = 1.0 - pow(strock, 2.145);
  ripple = 1.0 - step(strock, ripple);
  ripple *= rippleFade;
    
  vec3 color = mix(uColDark, uColLight, fallingArea);
  color = mix(color, uColLight, flow);
  color = mix(color, uColLight, ripple);
  // neblina suave del impacto (encima de la mancha dura)
  float rr = length(vUv - 0.5) * 2.0;
  float foamC = smoothstep(0.55, 0.5, rr);
  float foamN = 0.6 + 0.4 * texture2D(uPerlin, vUv * 3.0 + uTime * 0.5).r;
  color = mix(color, vec3(1.0), foamC * foamN * 0.5);
  gl_FragColor = vec4(color, 1.0);
}
`;

/* colores de la referencia: azul agua y celeste espuma */
const COL_DARK = "#5bafd9";
const COL_LIGHT = "#9ccde3";

function makeFallMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FALL_FRAG,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uLen: { value: 30 },
      uWidth: { value: 5 },
      uPerlin: { value: getPerlin() },
      uColDark: { value: new THREE.Color(COL_DARK) },
      uColLight: { value: new THREE.Color(COL_LIGHT) },
    },
  });
}

function makePoolMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: POOL_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPerlin: { value: getPerlin() },
      uColDark: { value: new THREE.Color(COL_DARK) },
      uColLight: { value: new THREE.Color(COL_LIGHT) },
    },
  });
}

/* construye una cinta del top al pool que sigue el terreno y se CORTA
   donde toca la superficie del agua del pozo. */
function buildRibbon(
  top: [number, number], pool: [number, number], width: number, widthScale: number,
  lift: number, cushion: number, topYManual: number | null, poolYManual: number | null
): THREE.BufferGeometry {
  const [tx, tz] = top;
  const [px, pz] = pool;

  const dx = px - tx, dz = pz - tz;
  const len = Math.hypot(dx, dz) || 1;
  const perpx = -dz / len, perpz = dx / len;
  const halfW = (width * widthScale) / 2;

  const waterY = (poolYManual ?? heightAt(px, pz)) + 0.15;

  const rows: { cx: number; cz: number; y: number }[] = [];
  for (let s = 0; s <= SEGMENTS; s++) {
    const t = s / SEGMENTS;
    const cx = tx + dx * t;
    const cz = tz + dz * t;
    const terr = heightAt(cx, cz);
    const topOff = topYManual !== null ? topYManual - heightAt(tx, tz) : 0;
    const poolOff = poolYManual !== null ? poolYManual - heightAt(px, pz) : 0;
    const off = topOff * (1 - t) + poolOff * t;
    const enter = smoothstep01(t * 3);
    const settle = smoothstep01((1 - t) * 3.33);
    const cushionRamp = cushion * enter * settle;
    const y = terr + off + cushionRamp + lift;

    rows.push({ cx, cz, y });

    if (t > 0.5 && y <= waterY + 0.2) {
      rows[rows.length - 1].y = waterY - 0.4;
      break;
    }
  }

  const last = Math.max(rows.length - 1, 1);
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let s = 0; s < rows.length; s++) {
    const t = s / last;
    const { cx, cz, y } = rows[s];
    const lx = cx + perpx * halfW, lz = cz + perpz * halfW;
    const rx = cx - perpx * halfW, rz = cz - perpz * halfW;
    positions.push(lx, y, lz, rx, y, rz);
    uvs.push(0, 1 - t, 1, 1 - t);
  }

  const indices: number[] = [];
  for (let s = 0; s < rows.length - 1; s++) {
    const a = s * 2, b = s * 2 + 1, c = s * 2 + 2, d = s * 2 + 3;
    indices.push(a, b, c, b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/* una sola cascada, definida por su instancia del store */
function OneWaterfall({ fall }: { fall: WF }) {
  const [px, pz] = fall.pool;
  const poolY = fall.poolY ?? heightAt(px, pz);
  const [tx, tz] = fall.top;
  const dxr = px - tx, dzr = pz - tz;
  const rotY = Math.atan2(-dxr, -dzr);
  // largo 3D real (horizontal + caída) para escalar patrones en metros
  const lenr = Math.hypot(dxr, dzr) || 1;
  const topYw = fall.topY ?? heightAt(tx, tz);
  const len3d = Math.hypot(lenr, topYw - poolY);

  const geoA = useMemo(() => buildRibbon(fall.top, fall.pool, fall.width, 1.0, 0.0, fall.cushion, fall.topY, fall.poolY), [fall.top, fall.pool, fall.width, fall.cushion, fall.topY, fall.poolY]);

  const fallMat = useMemo(() => makeFallMaterial(), []);
  const poolMat = useMemo(() => makePoolMaterial(), []);
  const poolRef = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    fallMat.uniforms.uTime.value += dt;
    poolMat.uniforms.uTime.value += dt;
    fallMat.uniforms.uLen.value = len3d;
    fallMat.uniforms.uWidth.value = fall.width;
    if (poolRef.current) {
      const s = 1 + Math.sin(performance.now() * 0.002) * 0.02;
      poolRef.current.scale.set(s, 1, 2 - s);
    }
  });

  return (
    <group>
      {/* lámina de agua (opaca, sigue el relieve, corta al tocar el agua) */}
      <mesh geometry={geoA} material={fallMat} />

      {/* pileta: orientada según la cascada (ondas y flujo hacia adelante) */}
      <group position={[px, poolY + 0.15, pz]} rotation={[0, rotY, 0]}>
        <mesh ref={poolRef} rotation={[-Math.PI / 2, 0, 0]} material={poolMat}>
          <circleGeometry args={[fall.poolRadius, 40]} />
        </mesh>
      </group>

      {/* salpicadura + spray donde golpea (partículas) */}
      <PoolSplash x={px} y={poolY + 0.2} z={pz} radius={fall.splashRadius} width={fall.width} rotY={rotY} />
    </group>
  );
}

export function Waterfall() {
  const rev = useWaterfalls((s) => s.rev);
  const falls = useMemo(() => getWaterfalls(), [rev]);

  return (
    <>
      {falls.map((f) => (
        <OneWaterfall key={f.id} fall={f} />
      ))}
    </>
  );
}

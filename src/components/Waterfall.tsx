import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heightAt } from "./Terrain";
import { getWaterfalls, useWaterfalls, type Waterfall as WF } from "@/data/waterfallStore";
import { PoolSplash } from "./PoolSplash";

/* =========================================================================
   Cascada estilo toon. La lámina ya NO es un plano recto en diagonal:
   es una CINTA que va del nacimiento al pozo siguiendo el relieve, apoyada
   sobre el terreno con un pequeño colchón (para que abrace la roca sin
   clippear). El agua scrollea a lo largo del recorrido (baja siguiendo la
   curva). El shader de agua es el mismo de siempre.
   ========================================================================= */

const SEGMENTS = 24;      // subdivisiones a lo largo (más = sigue mejor la curva, más pesado)
const POOL_LIFT = 0.3;    // cuánto sube el tramo final para entrar al pozo
const smoothstep01 = (x: number) => { const t = x < 0 ? 0 : x > 1 ? 1 : x; return t * t * (3 - 2 * t); };

// material de agua que scrollea a lo largo de la cinta (uv.y = recorrido)
function makeFallMaterial(color: string, speed: number) {
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false,
  });
  mat.userData.t = { value: 0 };
  mat.userData.speed = speed;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uT = mat.userData.t;
    shader.uniforms.uSpeed = { value: speed };
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      "#include <common>\nvarying vec2 vUvW;"
    ).replace(
      "#include <uv_vertex>",
      "#include <uv_vertex>\nvUvW = uv;"
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      "#include <common>\nuniform float uT; uniform float uSpeed; varying vec2 vUvW;"
    ).replace(
      "#include <color_fragment>",
      `#include <color_fragment>
       // bandas que bajan a lo largo del recorrido (agua cayendo)
       float v = vUvW.y * 6.0 + uT * uSpeed;
       float bands = 0.5 + 0.5 * sin(v * 6.2831);
       float streaks = 0.6 + 0.4 * sin(vUvW.x * 40.0);
       diffuseColor.rgb *= (0.75 + 0.35 * bands * streaks);
       // espuma arriba (nacimiento) y abajo (pozo)
       float foam = smoothstep(0.92, 1.0, vUvW.y) + smoothstep(0.08, 0.0, vUvW.y);
       diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), foam * 0.7);`
    );
  };
  return mat;
}

/* construye una cinta del top al pool que sigue el terreno.
   widthScale permite una segunda lámina más angosta (volumen). */
function buildRibbon(
  top: [number, number], pool: [number, number], width: number, widthScale: number,
  lift: number, cushion: number, topYManual: number | null, poolYManual: number | null
): THREE.BufferGeometry {
  const [tx, tz] = top;
  const [px, pz] = pool;

  // dirección del recorrido (horizontal) y perpendicular (para el ancho)
  const dx = px - tx, dz = pz - tz;
  const len = Math.hypot(dx, dz) || 1;
  const perpx = -dz / len, perpz = dx / len; // perpendicular horizontal
  const halfW = (width * widthScale) / 2;

  const positions: number[] = [];
  const uvs: number[] = [];

  // fila por fila a lo largo del recorrido
  for (let s = 0; s <= SEGMENTS; s++) {
    const t = s / SEGMENTS;
    const cx = tx + dx * t;
    const cz = tz + dz * t;
    // altura: sigue el terreno + colchón; el tramo final sube un poco al pozo
    // altura base: manual (interpolada entre extremos) o del terreno
    // la cinta SIEMPRE sigue el terreno; la Y manual es un offset por extremo
    const terr = heightAt(cx, cz);
    // offset del nacimiento: cuánto se corrió respecto a su terreno
    const topOff = topYManual !== null ? topYManual - heightAt(tx, tz) : 0;
    const poolOff = poolYManual !== null ? poolYManual - heightAt(px, pz) : 0;
    // interpolamos el offset a lo largo del recorrido (0 arriba .. 1 abajo)
    const off = topOff * (1 - t) + poolOff * t;
    // el nacimiento nace pegado a la roca; el cushion crece hacia el pozo
    const cushionRamp = cushion * smoothstep01(t * 2); // 0 arriba -> pleno en el primer tramo
    const y = terr + off + cushionRamp + lift + POOL_LIFT * t;

    // dos vértices (izq y der del ancho)
    const lx = cx + perpx * halfW, lz = cz + perpz * halfW;
    const rx = cx - perpx * halfW, rz = cz - perpz * halfW;
    positions.push(lx, y, lz, rx, y, rz);
    // uv: x = ancho (0..1), y = recorrido (1 arriba .. 0 abajo)
    uvs.push(0, 1 - t, 1, 1 - t);
  }

  // índices (dos triángulos por segmento)
  const indices: number[] = [];
  for (let s = 0; s < SEGMENTS; s++) {
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

  // dos cintas superpuestas (más volumen), ambas siguen el terreno
  const geoA = useMemo(() => buildRibbon(fall.top, fall.pool, fall.width, 1.0, 0.0, fall.cushion, fall.topY, fall.poolY), [fall.top, fall.pool, fall.width, fall.cushion, fall.topY, fall.poolY]);
  const geoB = useMemo(() => buildRibbon(fall.top, fall.pool, fall.width, 0.7, 0.15, fall.cushion, fall.topY, fall.poolY), [fall.top, fall.pool, fall.width, fall.cushion, fall.topY, fall.poolY]);

  const fallMat = useMemo(() => makeFallMaterial("#bfe6f0", 1.0), []);
  const fallMat2 = useMemo(() => makeFallMaterial("#8fd0e6", 1.6), []);
  const poolMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#9fd9ea", transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.1 }),
    []
  );
  const poolRef = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    fallMat.userData.t.value += dt;
    fallMat2.userData.t.value += dt;
    if (poolRef.current) {
      const s = 1 + Math.sin(performance.now() * 0.002) * 0.02;
      poolRef.current.scale.set(s, 1, 2 - s);
    }
  });

  return (
    <group>
      {/* dos cintas de agua que siguen el relieve */}
      <mesh geometry={geoA} material={fallMat} />
      <mesh geometry={geoB} material={fallMat2} />

      {/* pileta: superficie de agua acumulada en el pozo */}
      <mesh ref={poolRef} rotation={[-Math.PI / 2, 0, 0]} position={[px, poolY + 0.15, pz]} material={poolMat}>
        <circleGeometry args={[6, 40]} />
      </mesh>

      {/* salpicadura + spray donde golpea (partículas) */}
      <PoolSplash x={px} y={poolY + 0.2} z={pz} />
    </group>
  );
}

export function Waterfall() {
  const rev = useWaterfalls((s) => s.rev); // re-render cuando cambian las cascadas
  const falls = useMemo(() => getWaterfalls(), [rev]);

  return (
    <>
      {falls.map((f) => (
        <OneWaterfall key={f.id} fall={f} />
      ))}
    </>
  );
}

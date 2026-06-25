import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heightAt } from "./Terrain";

/* Cascada estilo toon (Nivel 1):
   - lámina de agua que cae de la cima al pozo, con la textura desplazándose (scroll)
   - espuma blanca donde golpea
   - superficie del pozo con ondas suaves
   Posición fija (sin editor). Cambiá TOP/POOL si querés moverla. */

const TOP = { x: -54, z: -15 };   // nace (cima)
const POOL = { x: -17, z: -49 };  // cae (pozo)

// material de agua que scrollea hacia abajo (caída) usando onBeforeCompile
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
       // bandas que bajan (efecto de agua cayendo)
       float v = vUvW.y * 6.0 + uT * uSpeed;
       float bands = 0.5 + 0.5 * sin(v * 6.2831);
       float streaks = 0.6 + 0.4 * sin(vUvW.x * 40.0);
       diffuseColor.rgb *= (0.75 + 0.35 * bands * streaks);
       // espuma arriba y abajo
       float foam = smoothstep(0.92, 1.0, vUvW.y) + smoothstep(0.08, 0.0, vUvW.y);
       diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), foam * 0.7);`
    );
  };
  return mat;
}

export function Waterfall() {
  const topY = heightAt(TOP.x, TOP.z);
  const poolY = heightAt(POOL.x, POOL.z);

  // geometría: orientamos un plano vertical desde la cima al pozo
  const data = useMemo(() => {
    const a = new THREE.Vector3(TOP.x, topY, TOP.z);
    const b = new THREE.Vector3(POOL.x, poolY + 0.3, POOL.z);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b);
    const horiz = Math.hypot(b.x - a.x, b.z - a.z);
    const angleY = Math.atan2(b.x - a.x, b.z - a.z); // giro hacia el pozo
    const tilt = Math.atan2(horiz, a.y - b.y);        // inclinación de la caída
    return { mid, len, angleY, tilt };
  }, [topY, poolY]);

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

  const W = 5; // ancho de la cascada

  return (
    <group>
      {/* dos láminas de agua superpuestas (más volumen) */}
      <group position={data.mid.toArray()} rotation={[0, data.angleY, 0]}>
        <mesh rotation={[data.tilt - Math.PI / 2, 0, 0]} material={fallMat}>
          <planeGeometry args={[W, data.len, 1, 8]} />
        </mesh>
        <mesh position={[0, 0, 0.4]} rotation={[data.tilt - Math.PI / 2, 0, 0]} material={fallMat2}>
          <planeGeometry args={[W * 0.7, data.len, 1, 8]} />
        </mesh>
      </group>

      {/* pileta: superficie de agua + espuma */}
      <mesh ref={poolRef} rotation={[-Math.PI / 2, 0, 0]} position={[POOL.x, poolY + 0.15, POOL.z]} material={poolMat}>
        <circleGeometry args={[6, 40]} />
      </mesh>
      {/* anillo de espuma donde golpea */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[POOL.x, poolY + 0.18, POOL.z]}>
        <ringGeometry args={[1.5, 3, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

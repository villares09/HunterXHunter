import { useEffect } from "react";
import { OrbitControls, useTexture, Line } from "@react-three/drei";
import { ThreeEvent, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Terrain, heightAt } from "./Terrain";
import { ANCHO_TOTAL_3D, ALTO_TOTAL_3D, islandCenter } from "../data/island";
import { usePath } from "../data/pathStore";

const NO_BTN = -1 as unknown as THREE.MOUSE;

function TopCamera({ cx, cz }: { cx: number; cz: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(cx, 320, cz + 0.1);
    camera.lookAt(cx, 0, cz);
  }, [camera, cx, cz]);
  return null;
}

export function PathScene() {
  const tex = useTexture("/assets/mapa-isla.png");
  const points = usePath((s) => s.points);
  const width = usePath((s) => s.width);
  const opacity = usePath((s) => s.mapOpacity);
  const add = usePath((s) => s.add);
  const c = islandCenter();

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    add([e.point.x, e.point.z]); // solo importa x,z (el bioma es por columna)
  };

  // los puntos los dibujo a la ALTURA REAL del terreno, así se ven pegados al piso
  const line3d = points.map(([x, z]) => [x, heightAt(x, z) + 1.5, z] as [number, number, number]);

  return (
    <>
      <TopCamera cx={c.x} cz={c.y} />
      <OrbitControls
        makeDefault
        mouseButtons={{ LEFT: NO_BTN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        target={[c.x, 0, c.y]}
      />
      <hemisphereLight args={["#ffe9c2", "#46603a", 0.9]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[120, 160, 60]} intensity={1.3} color="#ffe2b0" />

      {/* terreno actual como referencia (sin física ni pincel) */}
      <Terrain refOnly />

      {/* plano de clics a NIVEL DEL SUELO (y=0). Al ser cenital, x,z caen donde clickeás. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 0, c.y]} onPointerDown={onDown}>
        <planeGeometry args={[ANCHO_TOTAL_3D, ALTO_TOTAL_3D]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* mapa calco arriba (semitransparente). Se oculta con opacity 0. */}
      {opacity > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 80, c.y]}>
          <planeGeometry args={[ANCHO_TOTAL_3D, ALTO_TOTAL_3D]} />
          <meshBasicMaterial map={tex} transparent opacity={opacity} depthTest={false} depthWrite={false} />
        </mesh>
      )}

      {/* línea del camino, pegada al relieve */}
      {line3d.length >= 2 && <Line points={line3d} color="#ff7a1a" lineWidth={Math.max(2, width)} />}
      {points.map(([x, z], i) => (
        <mesh key={i} position={[x, heightAt(x, z) + 1.5, z]}>
          <sphereGeometry args={[1.4, 12, 12]} />
          <meshBasicMaterial color={i === 0 ? "#ff5252" : "#ff7a1a"} depthTest={false} />
        </mesh>
      ))}
    </>
  );
}

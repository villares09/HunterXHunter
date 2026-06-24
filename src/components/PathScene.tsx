import { OrbitControls, useTexture, Line } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Terrain } from "./Terrain";
import { ANCHO_TOTAL_3D, ALTO_TOTAL_3D, islandCenter } from "../data/island";
import { usePath } from "../data/pathStore";

const NO_BTN = -1 as unknown as THREE.MOUSE;

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
    add([e.point.x, e.point.z]);
  };

  const line3d = points.map(([x, z]) => [x, 82, z] as [number, number, number]);

  return (
    <>
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

      {/* mapa calco arriba, clickeable */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 80, c.y]} onPointerDown={onDown}>
        <planeGeometry args={[ANCHO_TOTAL_3D, ALTO_TOTAL_3D]} />
        <meshBasicMaterial map={tex} transparent opacity={opacity} depthTest={false} depthWrite={false} />
      </mesh>

      {/* línea del camino */}
      {line3d.length >= 2 && <Line points={line3d} color="#ff7a1a" lineWidth={Math.max(2, width)} />}
      {points.map(([x, z], i) => (
        <mesh key={i} position={[x, 82, z]}>
          <sphereGeometry args={[1.4, 12, 12]} />
          <meshBasicMaterial color={i === 0 ? "#ff5252" : "#ff7a1a"} depthTest={false} />
        </mesh>
      ))}
    </>
  );
}

import { OrbitControls, useTexture, Line } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { ANCHO_TOTAL_3D, ALTO_TOTAL_3D } from "@/data/island";
import { useDraw } from "@/data/drawStore";

const NO_BTN = -1 as unknown as THREE.MOUSE;

export function DrawScene() {
  const tex = useTexture("/assets/mapa-isla.png");
  const points = useDraw((s) => s.points);
  const opacity = useDraw((s) => s.mapOpacity);
  const add = useDraw((s) => s.add);

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    add([e.point.x, e.point.z]);
  };

  const line3d = points.map(([x, z]) => [x, 0.6, z] as [number, number, number]);

  return (
    <>
      <OrbitControls
        makeDefault
        mouseButtons={{ LEFT: NO_BTN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        target={[0, 0, 0]}
      />

      {/* mapa calco, clickeable */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} onPointerDown={onDown}>
        <planeGeometry args={[ANCHO_TOTAL_3D, ALTO_TOTAL_3D]} />
        <meshBasicMaterial map={tex} transparent opacity={opacity} />
      </mesh>

      {/* polígono en construcción */}
      {line3d.length >= 2 && (
        <Line points={line3d.length >= 3 ? [...line3d, line3d[0]] : line3d} color="#ffd23f" lineWidth={3} />
      )}

      {/* vértices */}
      {points.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.6, z]}>
          <sphereGeometry args={[1.6, 12, 12]} />
          <meshBasicMaterial color={i === 0 ? "#ff5252" : "#ffd23f"} />
        </mesh>
      ))}
    </>
  );
}

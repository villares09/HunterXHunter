import { useEffect, useRef, useState } from "react";
import { OrbitControls, useTexture } from "@react-three/drei";
import { ThreeEvent, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Terrain } from "@/components/Terrain";
import { PaintedRocks } from "@/components/PaintedRocks";
import { PaintedForest } from "@/components/PaintedForest";
import { ANCHO_TOTAL_3D, ALTO_TOTAL_3D, islandCenter } from "@/data/island";
import { useRocks, plant, erase } from "@/data/rockStore";

const NO_BTN = -1 as unknown as THREE.MOUSE;

function TopCamera({ cx, cz }: { cx: number; cz: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(cx, 200, cz + 190);
    camera.lookAt(cx, 0, cz);
  }, [camera, cx, cz]);
  return null;
}

function MapRef({ c }: { c: THREE.Vector2 }) {
  const tex = useTexture("/assets/mapa-isla.png");
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 90, c.y]}>
      <planeGeometry args={[ANCHO_TOTAL_3D, ALTO_TOTAL_3D]} />
      <meshBasicMaterial map={tex} transparent opacity={0.4} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

export function RockScene() {
  const radius = useRocks((s) => s.radius);
  const mode = useRocks((s) => s.mode);
  const showMap = useRocks((s) => s.showMap);
  const c = islandCenter();
  const painting = useRef(false);
  const [cursor, setCursor] = useState<[number, number, number] | null>(null);

  const apply = (x: number, z: number) => (mode === "plant" ? plant(x, z) : erase(x, z));

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    painting.current = true;
    apply(e.point.x, e.point.z);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    setCursor([e.point.x, e.point.y, e.point.z]);
    if (painting.current) apply(e.point.x, e.point.z);
  };
  const stop = () => { painting.current = false; };

  return (
    <>
      <TopCamera cx={c.x} cz={c.y} />
      <OrbitControls
        makeDefault
        mouseButtons={{ LEFT: NO_BTN, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }}
        target={[c.x, 0, c.y]}
      />
      <hemisphereLight args={["#ffe9c2", "#46603a", 0.9]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[120, 160, 60]} intensity={1.4} color="#ffe2b0" castShadow />

      {/* terreno clickeable + el bosque ya pintado como referencia */}
      <group onPointerDown={onDown} onPointerMove={onMove} onPointerUp={stop} onPointerLeave={stop}>
        <Terrain refOnly />
      </group>
      <PaintedForest />
      <PaintedRocks />
      {showMap && <MapRef c={c} />}

      {cursor && (
        <mesh position={cursor} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius - 1, radius, 48]} />
          <meshBasicMaterial color={mode === "plant" ? "#9ca3af" : "#ff5252"} transparent opacity={0.85} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
      )}
    </>
  );
}

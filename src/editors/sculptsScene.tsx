import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Terrain } from "@/components/Terrain";
import { Ocean } from "@/components/Ocean";
import { useTerrain } from "@/data/terrainStore";
import { ANCHO_TOTAL_3D, ALTO_TOTAL_3D, islandCenter } from "@/data/island";

/* mapa de referencia: se dibuja por encima (depthTest off) y semitransparente
   para alinear. Toggle desde el HUD. */
function MapRef() {
  const tex = useTexture("/assets/mapa-isla.png");
  const c = islandCenter();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 70, c.y]}>
      <planeGeometry args={[ANCHO_TOTAL_3D, ALTO_TOTAL_3D]} />
      <meshBasicMaterial map={tex} transparent opacity={0.45} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

// -1 = sin acción: deja el clic izquierdo libre para el pincel
const NO_BTN = -1 as unknown as THREE.MOUSE;

export function SculptScene() {
  const showMap = useTerrain((s) => s.showMap);
  const c = islandCenter();
  return (
    <>
      {/* clic izq = pintar (lo maneja Terrain); clic der = orbitar; rueda = zoom */}
      <OrbitControls
        makeDefault
        mouseButtons={{ LEFT: NO_BTN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        target={[c.x, 0, c.y]}
      />
      <hemisphereLight args={["#ffe9c2", "#46603a", 0.9]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[120, 160, 60]} intensity={1.5} color="#ffe2b0" castShadow />

      <Terrain sculptMode />
      <Ocean />
      {showMap && <MapRef />}
    </>
  );
}
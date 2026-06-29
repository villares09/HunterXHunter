import { Sky } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Ocean } from "./Ocean";
import { Terrain } from "./Terrain";
import { PlacedProps } from "./PlacedProps";
import { PaintedForest } from "./PaintedForest";
import { PaintedRocks } from "./PaintedRocks";
import { Waterfall } from "./Waterfall";
import { SwampWater } from "./SwampWater";

/* Mundo de juego = piezas del diseño nuevo, todo hecho con los editores. */
export function World() {
  return (
    <>
      <Sky sunPosition={[80, 22, 40]} turbidity={8} rayleigh={2.2} mieCoefficient={0.01} />
      <hemisphereLight args={["#ffe9c2", "#46603a", 0.8]} />
      <ambientLight intensity={0.25} />
      {/* Sombras: área concentrada cerca del jugador (antes 440×320 -> ahora 180×180).
          Mismo mapa de 2048² sobre menos terreno = más nítido y más barato.
          Si la GPU sigue alta, bajá shadow-mapSize a [1024,1024]. */}
      <directionalLight
        position={[120, 90, 40]} intensity={1.7} color="#ffe2b0" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-near={1} shadow-camera-far={350}
        shadow-camera-left={-90} shadow-camera-right={90} shadow-camera-top={90} shadow-camera-bottom={-90}
        shadow-bias={-0.0004}
      />

      {/* colchón de seguridad: piso invisible MUY abajo. Red de último recurso
          para que NUNCA se caiga al vacío infinito si algo del terreno falla. */}
      {/* <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2000, 1, 2000]} position={[0, -40, 0]} />
      </RigidBody> */}

      <Ocean />
      <SwampWater />
      <Terrain />
      <PaintedForest />
      <PaintedRocks />
      <PlacedProps />
      <Waterfall />
    </>
  );
}

import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Suspense, useMemo } from "react";
import { World } from "./World";
import { Player } from "./Player";
import { Enemies } from "./Enemies";
import { SceneTick, Floaters } from "./Systems";

export function Game() {
  // mapa de teclado que lee ecctrl
  const map = useMemo(
    () => [
      { name: "forward", keys: ["ArrowUp", "KeyW"] },
      { name: "backward", keys: ["ArrowDown", "KeyS"] },
      { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
      { name: "rightward", keys: ["ArrowRight", "KeyD"] },
      { name: "jump", keys: ["Space"] },
      { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
    ],
    []
  );

  return (
    <Canvas shadows camera={{ position: [0, 6, 14], fov: 50 }}>
      <color attach="background" args={["#bcdcec"]} />
      <fogExp2 attach="fog" args={["#bcdcec", 0.0025]} />
      <Suspense fallback={null}>
        <KeyboardControls map={map}>
          <Physics timeStep="vary">
            <World />
            <Player />
            <Enemies count={6} />
          </Physics>
        </KeyboardControls>
        <SceneTick />
        <Floaters />
      </Suspense>
    </Canvas>
  );
}

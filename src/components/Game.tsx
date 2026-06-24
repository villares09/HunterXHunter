import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Suspense, useMemo } from "react";
import { World } from "./World";
import { Player } from "./Player";
import { Enemies } from "./Enemies";
import { SceneTick, Floaters } from "./Systems";
import { DevPlacer } from "../debug/DevPlacer";
import { MapaGuiaFondo } from "../debug/MapaGuia";
import { WorldEditor } from "../editor/worldEditor";
import { EditorHUD } from "../editor/editorHUD";
import { SculptScene } from "./sculptsScene";
import { SculptHUD } from "../editor/sculptHUD";
import { DrawScene } from "./DrawScrene";
import { DrawHUD } from "../editor/drawHUD";
import { PathScene } from "./PathScene";
import { PathHUD } from "../editor/pathHUD";

export function Game() {
  const params = new URLSearchParams(typeof window !== "undefined" ? location.search : "");
  const edit = params.has("edit");
  const sculptMode = params.has("sculpt");
  const drawMode = params.has("draw");
  const pathMode = params.has("path");
  const topView = sculptMode || edit || drawMode || pathMode;

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
    <>
      <Canvas shadows camera={{ position: drawMode || pathMode ? [0, 320, 0.1] : topView ? [0, 180, 230] : [0, 6, 14], fov: 50 }}>
        <color attach="background" args={["#bcdcec"]} />
        <fogExp2 attach="fog" args={["#bcdcec", 0.0025]} />
        <Suspense fallback={null}>
          {drawMode ? (
            <DrawScene />
          ) : pathMode ? (
            <PathScene />
          ) : sculptMode ? (
            <SculptScene />
          ) : edit ? (
            <WorldEditor />
          ) : (
            <KeyboardControls map={map}>
              <Physics timeStep="vary">
                <World />
                <DevPlacer />
                <MapaGuiaFondo />
                <Player />
                {/* <Enemies count={6} /> */}
              </Physics>
            </KeyboardControls>
          )}
          {!drawMode && !pathMode && (
            <>
              <SceneTick />
              <Floaters />
            </>
          )}
        </Suspense>
      </Canvas>
      {edit && <EditorHUD />}
      {sculptMode && <SculptHUD />}
      {drawMode && <DrawHUD />}
      {pathMode && <PathHUD />}
    </>
  );
}
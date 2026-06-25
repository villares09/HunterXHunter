import { Canvas } from "@react-three/fiber";
import { KeyboardControls, useProgress } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { World } from "./World";
import { Player } from "./Player";
// import { Enemies } from "./Enemies";
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
import { ForestScene } from "./ForestScene";
import { ForestHUD } from "../editor/forestHUD";
import { RockScene } from "./RockScene";
import { RockHUD } from "../editor/rockHUD";

/* Espera a que (a) termine de cargar todo (useProgress) y (b) pasen unos frames
   para que Rapier arme el HeightfieldCollider. Recién entonces renderiza a sus hijos
   (el Player), así no aparece antes de que exista el piso y se caiga. */
function ReadyGate({ children }: { children: React.ReactNode }) {
  const { active, progress } = useProgress();
  const [ready, setReady] = useState(false);
  const tries = useRef(0);

  useEffect(() => {
    if (active || progress < 100) return;
    // todo cargó: esperar ~30 frames para que el collider del terreno exista
    let raf = 0;
    const wait = () => {
      tries.current++;
      if (tries.current > 30) { setReady(true); return; }
      raf = requestAnimationFrame(wait);
    };
    raf = requestAnimationFrame(wait);
    return () => cancelAnimationFrame(raf);
  }, [active, progress]);

  return <>{ready ? children : null}</>;
}

export function Game() {
  const params = new URLSearchParams(typeof window !== "undefined" ? location.search : "");
  const edit = params.has("edit");
  const sculptMode = params.has("sculpt");
  const drawMode = params.has("draw");
  const pathMode = params.has("path");
  const forestMode = params.has("forest");
  const rocksMode = params.has("rocks");
  const topView = sculptMode || edit || drawMode || pathMode || forestMode || rocksMode;
  const playMode = !topView;

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
        {/* fog SOLO en modo juego: en los editores tapaba lo que estás editando */}
        {playMode && <fogExp2 attach="fog" args={["#bcdcec", 0.008]} />}
        <Suspense fallback={null}>
          {drawMode ? (
            <DrawScene />
          ) : pathMode ? (
            <PathScene />
          ) : forestMode ? (
            <ForestScene />
          ) : rocksMode ? (
            <RockScene />
          ) : sculptMode ? (
            <SculptScene />
          ) : edit ? (
            <WorldEditor />
          ) : (
            <KeyboardControls map={map}>
              <Physics timeStep={1 / 60}>
                <World />
                <DevPlacer />
                <MapaGuiaFondo />
                {/* el Player aparece SOLO cuando el mundo y el piso están listos */}
                <ReadyGate>
                  <Player />
                </ReadyGate>
                {/* <Enemies count={6} /> */}
              </Physics>
            </KeyboardControls>
          )}
          {playMode && (
            <>
              <SceneTick />
              <Floaters />
            </>
          )}
        </Suspense>
      </Canvas>

      {/* overlay de carga (DOM, fuera del Canvas) */}
      {playMode && <LoadingOverlay />}

      {edit && <EditorHUD />}
      {sculptMode && <SculptHUD />}
      {drawMode && <DrawHUD />}
      {pathMode && <PathHUD />}
      {forestMode && <ForestHUD />}
      {rocksMode && <RockHUD />}
    </>
  );
}

/* pantalla de carga simple que se desvanece al terminar */
function LoadingOverlay() {
  const { active, progress } = useProgress();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => setHidden(true), 600);
      return () => clearTimeout(t);
    }
  }, [active, progress]);
  if (hidden) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99998,
      background: "#0e1b24", color: "#e8f3f8",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif", gap: 18,
      opacity: !active && progress >= 100 ? 0 : 1, transition: "opacity 0.5s ease",
      pointerEvents: !active && progress >= 100 ? "none" : "auto",
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1 }}>🐋 Isla Ballena</div>
      <div style={{ fontSize: 13, opacity: 0.7 }}>Cargando el mundo…</div>
      <div style={{ width: 260, height: 8, background: "#1e3340", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: "#4ec5e0", transition: "width 0.2s ease" }} />
      </div>
      <div style={{ fontSize: 12, opacity: 0.5 }}>{Math.round(progress)}%</div>
    </div>
  );
}

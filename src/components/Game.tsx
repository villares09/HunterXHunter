import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { World } from "./World";
import { Player } from "./Player";
import { Enemies } from "./Enemies";
import { SceneTick, Floaters } from "./Systems";
import { DevPlacer } from "../debug/DevPlacer";
import { MapaGuiaFondo } from "../debug/MapaGuia";
import { WorldEditor } from "@/editors/worldEditor";
import { EditorHUD } from "@/editors/editorHUD";
import { SculptScene } from "@/editors/sculptsScene";
import { SculptHUD } from "@/editors/sculptHUD";
import { DrawScene } from "@/editors/DrawScene";
import { DrawHUD } from "@/editors/drawHUD";
import { PathScene } from "@/editors/PathScene";
import { PathHUD } from "@/editors/pathHUD";
import { ForestScene } from "@/editors/ForestScene";
import { ForestHUD } from "@/editors/forestHUD";
import { RockScene } from "@/editors/RockScene";
import { RockHUD } from "@/editors/rockHUD";
import { ExportWorld } from "@/editors/ExportWorld";
import { EDITOR_PARAMS } from "@/data/worlds/worldSource";

function ReadyGate({ children }: { children: React.ReactNode }) {
  const { active, progress } = useProgress();
  const [ready, setReady] = useState(false);
  const tries = useRef(0);

  useEffect(() => {
    if (active || progress < 100) return;
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
  const topView = EDITOR_PARAMS.some((k) => params.has(k));
  const playMode = !topView;
  const exportMode = params.has("export");

  const camPos = useMemo<[number, number, number]>(
    () => (drawMode || pathMode ? [0, 320, 0.1] : topView ? [0, 180, 230] : [0, 6, 14]),
    [drawMode, pathMode, topView]
  );

  if (exportMode) return <ExportWorld />;

  return (
    <>
      <Canvas shadows camera={{ position: camPos, fov: 50 }}>
        <color attach="background" args={["#bcdcec"]} />
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
            <Physics timeStep={1 / 60}>
              <World />
              <DevPlacer />
              <MapaGuiaFondo />
              <ReadyGate>
                <Player />
              </ReadyGate>
              <Enemies count={3} />
            </Physics>
          )}
          {playMode && (
            <>
              <SceneTick />
              <Floaters />
            </>
          )}
        </Suspense>
      </Canvas>

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

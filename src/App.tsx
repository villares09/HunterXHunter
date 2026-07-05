import { Game } from "./components/Game";
import { HUD } from "./ui/HUD";
import { Onboarding } from "./onboarding/Onboarding";
import { CharacterSelect } from "./onboarding/CharacterSelect";
import { useRPG } from "./store";
import { AnimDebug } from "./debug/AnimDebug";
import { inEditor } from "@/data/worlds/worldSource";

export default function App() {
  const phase = useRPG((s) => s.phase);

  if (location.search.includes("debug")) return <AnimDebug url="/models/gon.glb" />;

  const params = new URLSearchParams(location.search);
  const editing = inEditor();

  // En editores no se necesita personaje: saltear select/onboarding.
  if (!editing) {
    if (phase === "select") return <CharacterSelect />;
    if (phase === "onboarding") return <Onboarding />;
  }

  return (
    <>
      <div id="stage"><Game /></div>
      {!editing && <HUD />}
      {params.has("test") && (
        <div style={{
          position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)",
          zIndex: 100000, padding: "4px 12px", borderRadius: 999,
          background: "rgba(78,197,224,.15)", border: "1px solid #4ec5e0",
          color: "#bfeeff", fontSize: 12, fontWeight: 700, fontFamily: "system-ui, sans-serif",
          pointerEvents: "none",
        }}>
          🧪 MODO PRUEBA · borrador local (sin hornear)
        </div>
      )}
    </>
  );
}

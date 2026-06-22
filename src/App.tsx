import { Game } from "./components/Game";
import { HUD } from "./ui/HUD";
import { Onboarding } from "./onboarding/Onboarding";
import { CharacterSelect } from "./onboarding/CharacterSelect";
import { useRPG } from "./store";
import { AnimDebug } from "./debug/AnimDebug";

export default function App() {
  const phase = useRPG((s) => s.phase);
  if (location.search.includes("debug")) return <AnimDebug url="/models/oso.glb" />;
  if (phase === "select") return <CharacterSelect />;
  if (phase === "onboarding") return <Onboarding />;
  return (
    <>
      <div id="stage"><Game /></div>
      <HUD />
    </>
  );
}

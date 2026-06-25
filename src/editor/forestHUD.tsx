import { useRef } from "react";
import { useForest, exportForest, importForest, clearForest, type ForestSet } from "../data/forestStore";

const BTN: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #444", borderRadius: 6,
  background: "#2a2a2a", color: "#eee", cursor: "pointer", fontSize: 12,
};
const ON: React.CSSProperties = { ...BTN, background: "#4ade80", color: "#06280f", fontWeight: 700, borderColor: "#4ade80" };

export function ForestHUD() {
  const fileRef = useRef<HTMLInputElement>(null);
  const set = useForest((s) => s.set);
  const mode = useForest((s) => s.mode);
  const radius = useForest((s) => s.radius);
  const density = useForest((s) => s.density);
  const showMap = useForest((s) => s.showMap);
  const setSet = useForest((s) => s.setSet);
  const setMode = useForest((s) => s.setMode);
  const setRadius = useForest((s) => s.setRadius);
  const setDensity = useForest((s) => s.setDensity);
  const toggleMap = useForest((s) => s.toggleMap);

  const sets: { id: ForestSet; label: string }[] = [
    { id: "bosque", label: "🌳 Bosque" }, { id: "pantano", label: "🌿 Pantano" },
    { id: "pastoAlto", label: "🌾 Pasto alto" }, { id: "flores", label: "🌸 Flores" },
    { id: "arbustos", label: "🪴 Arbustos" }, { id: "mixto", label: "🌼 Mixto" },
  ];

  return (
    <div style={{
      position: "fixed", top: 16, left: 16, zIndex: 99999, width: 250,
      background: "rgba(15,15,15,0.92)", color: "#eee", padding: 14, borderRadius: 10,
      fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 9,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>🌲 Pincel de bosque y flora</div>

      <div style={{ fontSize: 11, opacity: 0.6 }}>Set de árboles:</div>
      <div style={{ display: "flex", gap: 6 }}>
        {sets.map((s) => (
          <button key={s.id} style={set === s.id ? ON : BTN} onClick={() => setSet(s.id)}>{s.label}</button>
        ))}
      </div>

      <div style={{ fontSize: 11, opacity: 0.6 }}>Modo:</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={mode === "plant" ? ON : BTN} onClick={() => setMode("plant")}>🌱 Plantar</button>
        <button style={mode === "erase" ? { ...ON, background: "#ff5252", color: "#fff", borderColor: "#ff5252" } : BTN} onClick={() => setMode("erase")}>🧹 Borrar (claros)</button>
      </div>

      <label style={{ fontSize: 12 }}>Radio del pincel: {radius.toFixed(0)} m</label>
      <input type="range" min={5} max={60} step={1} value={radius} onChange={(e) => setRadius(+e.target.value)} />

      <label style={{ fontSize: 12 }}>Densidad: {density} por pasada</label>
      <input type="range" min={1} max={15} step={1} value={density} onChange={(e) => setDensity(+e.target.value)} />

      <button style={showMap ? ON : BTN} onClick={toggleMap}>{showMap ? "✓ " : ""}Ver mapa de referencia</button>

      <div style={{ borderTop: "1px solid #333", paddingTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={BTN} onClick={exportForest}>⬇ Exportar</button>
        <button style={BTN} onClick={() => fileRef.current?.click()}>⬆ Importar</button>
        <button style={{ ...BTN, color: "#f88" }} onClick={() => { if (confirm("¿Borrar TODO el bosque?")) clearForest(); }}>↺ Vaciar</button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importForest(f); e.target.value = ""; }} />
      </div>

      <div style={{ fontSize: 10, opacity: 0.55, lineHeight: 1.4 }}>
        Clic izq. = pintar · clic der. = orbitar · rueda = zoom.<br />
        Mantené apretado y arrastrá para llenar. Borrar = claros.<br />
        Los gigantes (Mito/pantano/entrenamiento) van a mano en ?edit.
      </div>
    </div>
  );
}

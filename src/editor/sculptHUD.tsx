import { useRef } from "react";
import { useTerrain, exportHeightmap, importHeightmap, resetFlat, type BrushMode } from "../data/terrainStore";

const BTN: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #444", borderRadius: 6,
  background: "#2a2a2a", color: "#eee", cursor: "pointer", fontSize: 12,
};
const ON: React.CSSProperties = { ...BTN, background: "#4ade80", color: "#06280f", fontWeight: 700, borderColor: "#4ade80" };

export function SculptHUD() {
  const fileRef = useRef<HTMLInputElement>(null);
  const radius = useTerrain((s) => s.radius);
  const strength = useTerrain((s) => s.strength);
  const mode = useTerrain((s) => s.mode);
  const showMap = useTerrain((s) => s.showMap);
  const setRadius = useTerrain((s) => s.setRadius);
  const setStrength = useTerrain((s) => s.setStrength);
  const setMode = useTerrain((s) => s.setMode);
  const toggleMap = useTerrain((s) => s.toggleMap);

  const height: { id: BrushMode; label: string }[] = [
    { id: "raise", label: "Subir" }, { id: "lower", label: "Bajar" },
    { id: "flatten", label: "Aplanar" }, { id: "smooth", label: "Suavizar" },
  ];
  const paint: { id: BrushMode; label: string }[] = [
    { id: "paintGrass", label: "Pasto" }, { id: "paintRock", label: "Roca" },
    { id: "paintSnow", label: "Nieve" }, { id: "paintSand", label: "Arena" },
    { id: "paintSwamp", label: "Pantano" }, { id: "paintRoad", label: "Camino" },
    { id: "paintTown", label: "Pueblo" },
  ];

  return (
    <div style={{
      position: "fixed", top: 16, left: 16, zIndex: 99999, width: 250,
      background: "rgba(15,15,15,0.92)", color: "#eee", padding: 14, borderRadius: 10,
      fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>⛰️ Esculpir + pintar</div>

      <div style={{ fontSize: 11, opacity: 0.6 }}>Altura:</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {height.map((m) => (
          <button key={m.id} style={mode === m.id ? ON : BTN} onClick={() => setMode(m.id)}>{m.label}</button>
        ))}
      </div>

      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Pintar bioma:</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {paint.map((m) => (
          <button key={m.id} style={mode === m.id ? ON : BTN} onClick={() => setMode(m.id)}>{m.label}</button>
        ))}
      </div>

      <label style={{ fontSize: 12, marginTop: 4 }}>Radio: {radius.toFixed(0)} m</label>
      <input type="range" min={8} max={120} step={1} value={radius} onChange={(e) => setRadius(+e.target.value)} />

      <label style={{ fontSize: 12 }}>Fuerza: {strength.toFixed(2)}</label>
      <input type="range" min={0.1} max={4} step={0.05} value={strength} onChange={(e) => setStrength(+e.target.value)} />

      <button style={showMap ? ON : BTN} onClick={toggleMap}>{showMap ? "✓ " : ""}Ver mapa de referencia</button>

      <div style={{ borderTop: "1px solid #333", paddingTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={BTN} onClick={exportHeightmap}>⬇ Exportar</button>
        <button style={BTN} onClick={() => fileRef.current?.click()}>⬆ Importar</button>
        <button style={{ ...BTN, color: "#f88" }} onClick={() => { if (confirm("¿Volver a isla plana? Perdés lo esculpido.")) resetFlat(); }}>↺ Reset</button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importHeightmap(f); e.target.value = ""; }} />
      </div>

      <div style={{ fontSize: 10, opacity: 0.55, lineHeight: 1.4 }}>
        Clic izq. = pincel · clic der. = orbitar · rueda = zoom.<br />
        Pintar bioma = set duro dentro del radio (la fuerza no aplica).
      </div>
    </div>
  );
}

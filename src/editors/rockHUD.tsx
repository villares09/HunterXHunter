import { useRef } from "react";
import { useRocks, exportRocks, importRocks, clearRocks, relevelRocks, type RockSet } from "@/data/rockStore";

const BTN: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #444", borderRadius: 6,
  background: "#2a2a2a", color: "#eee", cursor: "pointer", fontSize: 12,
};
const ON: React.CSSProperties = { ...BTN, background: "#9ca3af", color: "#111", fontWeight: 700, borderColor: "#9ca3af" };
const HUB: React.CSSProperties = {
  textDecoration: "none", textAlign: "center",
  padding: "6px 10px", border: "1px solid #4ec5e0", borderRadius: 6,
  background: "rgba(78,197,224,.15)", color: "#bfeeff", fontSize: 12, fontWeight: 600,
};

export function RockHUD() {
  const fileRef = useRef<HTMLInputElement>(null);
  const set = useRocks((s) => s.set);
  const mode = useRocks((s) => s.mode);
  const radius = useRocks((s) => s.radius);
  const density = useRocks((s) => s.density);
  const showMap = useRocks((s) => s.showMap);
  const setSet = useRocks((s) => s.setSet);
  const setMode = useRocks((s) => s.setMode);
  const setRadius = useRocks((s) => s.setRadius);
  const setDensity = useRocks((s) => s.setDensity);
  const toggleMap = useRocks((s) => s.toggleMap);

  const sets: { id: RockSet; label: string }[] = [
    { id: "sueltas", label: "Sueltas" }, { id: "muralla", label: "Muralla" }, { id: "piedritas", label: "Piedritas" },
  ];

  return (
    <div style={{
      position: "fixed", top: 16, left: 16, zIndex: 99999, width: 250,
      background: "rgba(15,15,15,0.92)", color: "#eee", padding: 14, borderRadius: 10,
      fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 9,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>🪨 Pincel de rocas</div>
      <a href="?export" style={HUB}>⌂ Panel de Mundo</a>

      <div style={{ fontSize: 11, opacity: 0.6 }}>Tipo:</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {sets.map((s) => (
          <button key={s.id} style={set === s.id ? ON : BTN} onClick={() => setSet(s.id)}>{s.label}</button>
        ))}
      </div>

      <div style={{ fontSize: 11, opacity: 0.6 }}>Modo:</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={mode === "plant" ? ON : BTN} onClick={() => setMode("plant")}>🪨 Colocar</button>
        <button style={mode === "erase" ? { ...ON, background: "#ff5252", color: "#fff", borderColor: "#ff5252" } : BTN} onClick={() => setMode("erase")}>🧹 Borrar</button>
      </div>

      <label style={{ fontSize: 12 }}>Radio del pincel: {radius.toFixed(0)} m</label>
      <input type="range" min={3} max={50} step={1} value={radius} onChange={(e) => setRadius(+e.target.value)} />

      <label style={{ fontSize: 12 }}>Densidad: {density} por pasada</label>
      <input type="range" min={1} max={12} step={1} value={density} onChange={(e) => setDensity(+e.target.value)} />

      <button style={showMap ? ON : BTN} onClick={toggleMap}>{showMap ? "✓ " : ""}Ver mapa de referencia</button>

      {/* endereza las rocas ya plantadas (re-clampea el tilt según especie) */}
      <button style={BTN} onClick={relevelRocks}>📐 Enderezar rocas existentes</button>

      <div style={{ borderTop: "1px solid #333", paddingTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={BTN} onClick={exportRocks}>⬇ Exportar</button>
        <button style={BTN} onClick={() => fileRef.current?.click()}>⬆ Importar</button>
        <button style={{ ...BTN, color: "#f88" }} onClick={() => { if (confirm("¿Borrar TODAS las rocas?")) clearRocks(); }}>↺ Vaciar</button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importRocks(f); e.target.value = ""; }} />
      </div>

      <div style={{ fontSize: 10, opacity: 0.55, lineHeight: 1.4 }}>
        Clic izq. = colocar · clic der. = orbitar · rueda = zoom.<br />
        <b>Sueltas</b>: decoración. <b>Muralla</b>: acantilados densos (sólidos en juego). <b>Piedritas</b>: bordes de camino.
      </div>
    </div>
  );
}

import { usePath, applyPath } from "../data/pathStore";
import { BIOME_ROAD, BIOME_TOWN, BIOME_SWAMP, BIOME_GRASS } from "../data/terrainStore";

const BTN: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #444", borderRadius: 6,
  background: "#2a2a2a", color: "#eee", cursor: "pointer", fontSize: 12,
};
const ON: React.CSSProperties = { ...BTN, background: "#4ade80", color: "#06280f", fontWeight: 700, borderColor: "#4ade80" };

export function PathHUD() {
  const points = usePath((s) => s.points);
  const width = usePath((s) => s.width);
  const biome = usePath((s) => s.biome);
  const opacity = usePath((s) => s.mapOpacity);
  const undo = usePath((s) => s.undo);
  const clear = usePath((s) => s.clear);
  const setWidth = usePath((s) => s.setWidth);
  const setBiome = usePath((s) => s.setBiome);
  const setOpacity = usePath((s) => s.setOpacity);

  const biomes: { id: number; label: string }[] = [
    { id: BIOME_ROAD, label: "Camino" }, { id: BIOME_TOWN, label: "Pueblo" },
    { id: BIOME_SWAMP, label: "Pantano" }, { id: BIOME_GRASS, label: "Pasto (borrar)" },
  ];

  return (
    <div style={{
      position: "fixed", top: 16, left: 16, zIndex: 99999, width: 250,
      background: "rgba(15,15,15,0.92)", color: "#eee", padding: 14, borderRadius: 10,
      fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 9,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>🛣️ Caminos (trazo)</div>

      <div style={{ fontSize: 11, opacity: 0.6 }}>Bioma a pintar:</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {biomes.map((b) => (
          <button key={b.id} style={biome === b.id ? ON : BTN} onClick={() => setBiome(b.id)}>{b.label}</button>
        ))}
      </div>

      <label style={{ fontSize: 12 }}>Ancho: {width.toFixed(0)} m</label>
      <input type="range" min={2} max={20} step={1} value={width} onChange={(e) => setWidth(+e.target.value)} />

      <label style={{ fontSize: 12 }}>Opacidad del mapa: {opacity.toFixed(2)}</label>
      <input type="range" min={0.2} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} />

      <div style={{ fontSize: 12, opacity: 0.85 }}>Puntos: {points.length}</div>

      <div style={{ display: "flex", gap: 6 }}>
        <button style={{ ...BTN, opacity: points.length ? 1 : 0.4 }} disabled={!points.length} onClick={undo}>↶ Deshacer</button>
        <button style={{ ...BTN, color: "#f88" }} onClick={() => clear()}>Limpiar línea</button>
      </div>

      <button
        style={{ ...ON, opacity: points.length >= 2 ? 1 : 0.4 }}
        disabled={points.length < 2}
        onClick={() => { applyPath(); }}
      >
        ✓ Pintar camino
      </button>

      <div style={{ fontSize: 10, opacity: 0.55, lineHeight: 1.4 }}>
        Clic izq. = marcar punto · clic der. = orbitar · rueda = zoom.<br />
        Marcás la línea siguiendo el mapa, ajustás el ancho y "Pintar camino".<br />
        Podés pintar varios: limpiás la línea y trazás el siguiente.
      </div>
    </div>
  );
}

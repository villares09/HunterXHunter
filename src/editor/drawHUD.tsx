import { useDraw, applyDrawnCoast } from "../data/drawStore";

const BTN: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #444", borderRadius: 6,
  background: "#2a2a2a", color: "#eee", cursor: "pointer", fontSize: 12,
};

export function DrawHUD() {
  const points = useDraw((s) => s.points);
  const opacity = useDraw((s) => s.mapOpacity);
  const undo = useDraw((s) => s.undo);
  const clear = useDraw((s) => s.clear);
  const setOpacity = useDraw((s) => s.setOpacity);

  return (
    <div style={{
      position: "fixed", top: 16, left: 16, zIndex: 99999, width: 250,
      background: "rgba(15,15,15,0.92)", color: "#eee", padding: 14, borderRadius: 10,
      fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>✏️ Dibujar costa</div>

      <div style={{ fontSize: 12, opacity: 0.85 }}>Puntos: {points.length}</div>

      <label style={{ fontSize: 12 }}>Opacidad del mapa: {opacity.toFixed(2)}</label>
      <input type="range" min={0.2} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} />

      <div style={{ display: "flex", gap: 6 }}>
        <button style={{ ...BTN, opacity: points.length ? 1 : 0.4 }} disabled={!points.length} onClick={undo}>↶ Deshacer</button>
        <button style={{ ...BTN, color: "#f88" }} onClick={() => { if (confirm("¿Borrar todos los puntos?")) clear(); }}>Reset</button>
      </div>

      <button
        style={{ ...BTN, background: "#4ade80", color: "#06280f", fontWeight: 700, borderColor: "#4ade80", opacity: points.length >= 3 ? 1 : 0.4 }}
        disabled={points.length < 3}
        onClick={applyDrawnCoast}
      >
        ✓ Aplicar costa
      </button>

      <div style={{ fontSize: 10, opacity: 0.55, lineHeight: 1.4 }}>
        Clic izq. = marcar punto del contorno (sentido horario).<br />
        Clic der. = orbitar · rueda = zoom.<br />
        El punto rojo es el inicio; al aplicar se cierra solo.<br />
        Después: andá a <b>?sculpt</b> y dale altura.
      </div>
    </div>
  );
}
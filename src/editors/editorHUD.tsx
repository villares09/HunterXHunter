import { useRef } from "react";
import { PROPS } from "@/data/world";
import { useEditor, exportWorld, importWorld, type Gizmo } from "@/data/editorStore";
import { getWaterfalls, useWaterfalls, addWaterfall, removeWaterfall, setWaterfallWidth, setWaterfallCushion, setWaterfallTopY, setWaterfallPoolY, setWaterfallPoolRadius, setWaterfallSplashRadius } from "@/data/waterfallStore";

const BTN: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #444", borderRadius: 6,
  background: "#2a2a2a", color: "#eee", cursor: "pointer", fontSize: 12,
};
const BTN_ON: React.CSSProperties = { ...BTN, background: "#4ade80", color: "#06280f", fontWeight: 700, borderColor: "#4ade80" };
const HUB: React.CSSProperties = {
  textDecoration: "none", textAlign: "center",
  padding: "6px 10px", border: "1px solid #4ec5e0", borderRadius: 6,
  background: "rgba(78,197,224,.15)", color: "#bfeeff", fontSize: 12, fontWeight: 600,
};

export function EditorHUD() {
  const fileRef = useRef<HTMLInputElement>(null);
  const instances = useEditor((s) => s.instances);
  const selected = useEditor((s) => s.selected);
  const gizmo = useEditor((s) => s.gizmo);
  const snap = useEditor((s) => s.snap);
  const showMap = useEditor((s) => s.showMap);
  const setGizmo = useEditor((s) => s.setGizmo);
  const toggleSnap = useEditor((s) => s.toggleSnap);
  const toggleMap = useEditor((s) => s.toggleMap);
  const spawn = useEditor((s) => s.spawn);
  const add = useEditor((s) => s.add);
  const remove = useEditor((s) => s.remove);
  const load = useEditor((s) => s.load);

  const wfRev = useWaterfalls((s) => s.rev);
  const wfSelected = useWaterfalls((s) => s.selected);
  const pendingTop = useWaterfalls((s) => s.pendingTop);
  const falls = getWaterfalls();

  const markTop = () => {
    const [sx, , sz] = useEditor.getState().spawn;
    useWaterfalls.getState().setPendingTop([sx, sz]);
  };
  const markPool = () => {
    const top = useWaterfalls.getState().pendingTop;
    if (!top) { alert("Primero marcá el nacimiento (apuntá arriba y dale Marcar nacimiento)."); return; }
    const [sx, , sz] = useEditor.getState().spawn;
    addWaterfall(top, [sx, sz]);
    useWaterfalls.getState().setPendingTop(null);
  };

  const gizmos: Gizmo[] = ["translate", "rotate", "scale"];
  const labels: Record<Gizmo, string> = { translate: "Mover", rotate: "Rotar", scale: "Escalar" };

  return (
    <div style={{
      position: "fixed", top: 16, left: 16, zIndex: 99999, width: 250,
      maxHeight: "calc(100vh - 32px)", overflowY: "auto",
      background: "rgba(15,15,15,0.92)", color: "#eee", padding: 14, borderRadius: 10,
      fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>🛠️ Editor de mundo</div>
      <a href="?export" style={HUB}>⌂ Panel de Mundo</a>

      <div style={{ display: "flex", gap: 6 }}>
        {gizmos.map((g) => (
          <button key={g} style={gizmo === g ? BTN_ON : BTN} onClick={() => setGizmo(g)}>{labels[g]}</button>
        ))}
      </div>

      <button style={snap ? BTN_ON : BTN} onClick={toggleSnap}>
        {snap ? "✓ " : ""}Pegar al suelo
      </button>
      <button style={showMap ? BTN_ON : BTN} onClick={toggleMap}>
        {showMap ? "✓ " : ""}Ver mapa de referencia
      </button>
      <div style={{ fontSize: 11, opacity: 0.7, background: "#1c1c1c", padding: "6px 8px", borderRadius: 5 }}>
        📍 centro cámara: X {spawn[0].toFixed(0)} · Z {spawn[2].toFixed(0)}
      </div>

      <div style={{ fontSize: 11, opacity: 0.7 }}>
        {selected ? `Seleccionado: ${selected}` : "Nada seleccionado · click en un asset"}
      </div>
      <button style={{ ...BTN, opacity: selected ? 1 : 0.4 }} disabled={!selected}
        onClick={() => selected && remove(selected)}>
        🗑 Borrar (Supr)
      </button>

      <div style={{ borderTop: "1px solid #333", paddingTop: 8, fontSize: 11, opacity: 0.7 }}>Agregar:</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {Object.keys(PROPS).map((id) => (
          <button key={id} style={{ ...BTN, fontSize: 11 }} onClick={() => add(id)}>
            + {id}
          </button>
        ))}
      </div>

      <div style={{ borderTop: "1px solid #333", paddingTop: 8, display: "flex", gap: 6 }}>
        <button style={BTN} onClick={() => exportWorld(instances)}>⬇ Exportar</button>
        <button style={BTN} onClick={() => fileRef.current?.click()}>⬆ Importar</button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importWorld(f, load); e.target.value = ""; }} />
      </div>

        {/* ===== CASCADAS ===== */}
      <div style={{ borderTop: "1px solid #333", paddingTop: 8, fontSize: 11, opacity: 0.7 }}>
        Cascadas ({falls.length}):
      </div>

      <div style={{ fontSize: 10, opacity: 0.6, lineHeight: 1.4 }}>
        Apuntá el centro de pantalla al punto y marcá. Nacimiento arriba, pozo abajo.
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={pendingTop ? BTN_ON : BTN} onClick={markTop}>
          {pendingTop ? "✓ nacimiento" : "① Nacimiento"}
        </button>
        <button style={{ ...BTN, opacity: pendingTop ? 1 : 0.4 }} disabled={!pendingTop} onClick={markPool}>
          ② Pozo
        </button>
      </div>
      {pendingTop && (
        <button style={{ ...BTN, color: "#f88" }} onClick={() => useWaterfalls.getState().setPendingTop(null)}>
          ✕ cancelar marcado
        </button>
      )}

      {falls.map((w, idx) => (
        <div key={w.id} style={{ background: "#1c1c1c", padding: "6px 8px", borderRadius: 5, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11 }}>Cascada {idx + 1}</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                style={{ ...(wfSelected === w.id ? BTN_ON : BTN), fontSize: 10, padding: "2px 6px" }}
                onClick={() => useWaterfalls.getState().setSelected(wfSelected === w.id ? null : w.id)}
              >
                ✏️
              </button>
              <button style={{ ...BTN, fontSize: 10, color: "#f88", padding: "2px 6px" }} onClick={() => removeWaterfall(w.id)}>
                🗑
              </button>
            </div>
          </div>
          <label style={{ fontSize: 10, opacity: 0.7 }}>Ancho: {w.width.toFixed(1)}</label>
          <input
            type="range" min={1} max={20} step={0.5} value={w.width}
            onChange={(e) => setWaterfallWidth(w.id, +e.target.value)}
          />
          <label style={{ fontSize: 10, opacity: 0.7 }}>Altura sobre suelo: {w.cushion.toFixed(1)}</label>
          <input
            type="range" min={0} max={5} step={0.1} value={w.cushion}
            onChange={(e) => setWaterfallCushion(w.id, +e.target.value)}
          />

          <label style={{ fontSize: 10, opacity: 0.7 }}>
            Altura nacimiento: {w.topY === null ? "auto" : w.topY.toFixed(1)}
          </label>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="range" min={-5} max={40} step={0.5}
              value={w.topY ?? 0}
              onChange={(e) => setWaterfallTopY(w.id, +e.target.value)}
              style={{ flex: 1 }}
            />
            <button style={{ ...BTN, fontSize: 9, padding: "2px 5px" }} onClick={() => setWaterfallTopY(w.id, null)}>auto</button>
          </div>
          <label style={{ fontSize: 10, opacity: 0.7 }}>
            Altura pozo: {w.poolY === null ? "auto" : w.poolY.toFixed(1)}
          </label>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="range" min={-5} max={40} step={0.5}
              value={w.poolY ?? 0}
              onChange={(e) => setWaterfallPoolY(w.id, +e.target.value)}
              style={{ flex: 1 }}
            />
            <button style={{ ...BTN, fontSize: 9, padding: "2px 5px" }} onClick={() => setWaterfallPoolY(w.id, null)}>auto</button>
          </div>
          <label style={{ fontSize: 10, opacity: 0.7 }}>Radio pozo: {w.poolRadius.toFixed(1)}</label>
          <input type="range" min={2} max={20} step={0.5} value={w.poolRadius}
            onChange={(e) => setWaterfallPoolRadius(w.id, +e.target.value)} />
          <label style={{ fontSize: 10, opacity: 0.7 }}>Radio salpicadura: {w.splashRadius.toFixed(1)}</label>
          <input type="range" min={1} max={20} step={0.5} value={w.splashRadius}
            onChange={(e) => setWaterfallSplashRadius(w.id, +e.target.value)} />
        </div>
      ))}
      <div style={{ fontSize: 10, opacity: 0.5, lineHeight: 1.4 }}>
        Arrastrá la cámara para orbitar · click en un asset y usá el gizmo · {instances.length} objetos
      </div>
    </div>
  );
}

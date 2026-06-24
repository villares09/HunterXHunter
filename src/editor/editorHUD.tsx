import { useRef } from "react";
import { PROPS } from "../data/world";
import { useEditor, exportWorld, importWorld, type Gizmo } from "../data/editorStore";

const BTN: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #444", borderRadius: 6,
  background: "#2a2a2a", color: "#eee", cursor: "pointer", fontSize: 12,
};
const BTN_ON: React.CSSProperties = { ...BTN, background: "#4ade80", color: "#06280f", fontWeight: 700, borderColor: "#4ade80" };

export function EditorHUD() {
  const fileRef = useRef<HTMLInputElement>(null);
  const instances = useEditor((s) => s.instances);
  const selected = useEditor((s) => s.selected);
  const gizmo = useEditor((s) => s.gizmo);
  const snap = useEditor((s) => s.snap);
  const setGizmo = useEditor((s) => s.setGizmo);
  const toggleSnap = useEditor((s) => s.toggleSnap);
  const add = useEditor((s) => s.add);
  const remove = useEditor((s) => s.remove);
  const load = useEditor((s) => s.load);

  const gizmos: Gizmo[] = ["translate", "rotate", "scale"];
  const labels: Record<Gizmo, string> = { translate: "Mover", rotate: "Rotar", scale: "Escalar" };

  return (
    <div style={{
      position: "fixed", top: 16, left: 16, zIndex: 99999, width: 250,
      background: "rgba(15,15,15,0.92)", color: "#eee", padding: 14, borderRadius: 10,
      fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>🛠️ Editor de mundo</div>

      <div style={{ display: "flex", gap: 6 }}>
        {gizmos.map((g) => (
          <button key={g} style={gizmo === g ? BTN_ON : BTN} onClick={() => setGizmo(g)}>{labels[g]}</button>
        ))}
      </div>

      <button style={snap ? BTN_ON : BTN} onClick={toggleSnap}>
        {snap ? "✓ " : ""}Pegar al suelo
      </button>

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
          <button key={id} style={{ ...BTN, fontSize: 11 }} onClick={() => add(id, [0, 0, 0])}>
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

      <div style={{ fontSize: 10, opacity: 0.5, lineHeight: 1.4 }}>
        Arrastrá la cámara para orbitar · click en un asset y usá el gizmo · {instances.length} objetos
      </div>
    </div>
  );
}
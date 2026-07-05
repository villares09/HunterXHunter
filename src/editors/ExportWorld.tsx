import { useRef, useState } from "react";

/* =========================================================================
   PANEL DE MUNDO (?export)
   Hub central del taller. Tres acciones:
     - Cargar JSON  → REEMPLAZO TOTAL: mete las capas del archivo en localStorage.
                      Capa que el archivo NO trae → se BORRA (el mundo = el archivo).
     - Descargar    → baja las 5 capas actuales del localStorage a un world.json.
     - Mundo nuevo  → limpia las 5 capas + backup, respeta el personaje.
   Después de cargar/limpiar, muestra links a cada editor para seguir el flujo
   (abrí en pestaña nueva por el ciclo anti-crash de Rapier).
   mc:characters NUNCA se toca (es del jugador).
   ========================================================================= */

// las 5 claves que forman el MUNDO
const WORLD_KEYS = ["mc-coast", "mc-forest", "mc-heightmap", "mc-rocks", "mc-world", "mc-waterfalls", "mc-swamp"] as const;
// basura de taller: se limpia en "mundo nuevo", pero NO se hornea ni descarga
const EXTRA_CLEAR = ["mc-forest-backup"] as const;

// editores del flujo, en orden de dependencia
const EDITORS: { param: string; label: string }[] = [
  { param: "draw", label: "1 · Costa (draw)" },
  { param: "sculpt", label: "2 · Relieve (sculpt)" },
  { param: "path", label: "3 · Caminos (path)" },
  { param: "edit", label: "4 · Objetos (edit)" },
  { param: "forest", label: "5 · Bosque (forest)" },
  { param: "rocks", label: "6 · Rocas (rocks)" },
];

export function ExportWorld() {
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const check = () => {
    const report = WORLD_KEYS.map((k) => {
      const v = localStorage.getItem(k);
      const kb = v ? (v.length / 1024).toFixed(1) + " KB" : "VACÍA";
      return `${k}: ${kb}`;
    });
    setMsg(report.join("\n"));

  };

  const download = () => {
    const world: Record<string, unknown> = {};
    const missing: string[] = [];
    for (const k of WORLD_KEYS) {
      const raw = localStorage.getItem(k);
      if (!raw) { missing.push(k); continue; }
      try { world[k] = JSON.parse(raw); } catch { world[k] = raw; }
    }
    const blob = new Blob([JSON.stringify(world)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "world.json"; a.click();
    URL.revokeObjectURL(url);
    setMsg(
      "✅ Descargado world.json\n" +
      (missing.length ? "ℹ️ Capas vacías (aún sin desarrollar): " + missing.join(", ") : "Las 5 capas exportadas.")
    );
  };

  const pickFile = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(String(reader.result)) as Record<string, unknown>;
      } catch {
        setMsg("❌ No pude leer el JSON (¿archivo válido?).");
        return;
      }
      // REEMPLAZO TOTAL: el mundo queda EXACTO al archivo
      const written: string[] = [];
      const cleared: string[] = [];
      for (const k of WORLD_KEYS) {
        if (k in data && data[k] != null) {
          localStorage.setItem(k, JSON.stringify(data[k]));
          written.push(k);
        } else {
          localStorage.removeItem(k); // el archivo no la trae → taller sin esa capa
          cleared.push(k);
        }
      }
      setMsg(
        `✅ Mundo cargado desde "${file.name}"\n` +
        `Escritas: ${written.join(", ") || "ninguna"}\n` +
        (cleared.length ? `Vacías (no venían en el archivo): ${cleared.join(", ")}\n` : "") +
        "El personaje quedó intacto. Abrí un editor (pestaña nueva)."
      );
    };
    reader.readAsText(file);
    e.target.value = ""; // permite recargar el mismo archivo de nuevo
  };

  const newWorld = () => {
    const ok = confirm(
      "¿Empezar un MUNDO NUEVO?\n\n" +
      "Se borran las 5 capas del mundo (costa, terreno, objetos, bosque, rocas).\n" +
      "Tu PERSONAJE NO se toca.\n\n" +
      "Descargá un backup antes si querés conservar lo actual."
    );
    if (!ok) return;
    for (const k of WORLD_KEYS) localStorage.removeItem(k);
    for (const k of EXTRA_CLEAR) localStorage.removeItem(k);
    setMsg("🧹 Mundo nuevo: lienzo en blanco.\nEl personaje quedó intacto. Empezá por la Costa (draw).");
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#0e1b24", color: "#e8f3f8",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif", gap: 18, padding: 24, overflow: "auto",
    }}>
      <div style={{ fontSize: 26, fontWeight: 800 }}>🐋 Panel de Mundo</div>
      <div style={{ fontSize: 13, opacity: 0.7, maxWidth: 460, textAlign: "center" }}>
        Cargá un <b>world.json</b> para seguir editándolo, descargá el estado actual como
        backup, o empezá un mundo nuevo. Los personajes NO se incluyen (son del jugador).
      </div>

      <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={pickFile} style={btnStyle(true)}>⬆ Cargar JSON</button>
        <button onClick={download} style={btnStyle(true)}>⬇ Descargar mundo</button>
        <button onClick={newWorld} style={btnStyle(false)}>🧹 Mundo nuevo</button>
        <button onClick={check} style={btnStyle(false)}>Ver capas</button>
      </div>

      {msg && (
        <pre style={{
          fontSize: 12, background: "#0a141c", border: "1px solid #1e3340",
          borderRadius: 8, padding: "12px 16px", whiteSpace: "pre-wrap",
          maxWidth: 460, lineHeight: 1.6,
        }}>{msg}</pre>
      )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Ir a un editor (abrí en pestaña nueva):</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 460 }}>
            {EDITORS.map((ed) => (
              <a key={ed.param} href={`?${ed.param}`} rel="noreferrer" style={linkStyle}>
                {ed.label}
              </a>
            ))}
          </div>
        </div>
    </div>
  );
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 700,
    padding: "12px 22px", borderRadius: 10,
    border: primary ? "1px solid #4ec5e0" : "1px solid rgba(255,255,255,.25)",
    background: primary ? "rgba(78,197,224,.18)" : "rgba(255,255,255,.06)",
    color: primary ? "#bfeeff" : "#cfe0ee",
  };
}

const linkStyle: React.CSSProperties = {
  textDecoration: "none", fontSize: 13, fontWeight: 600,
  padding: "8px 14px", borderRadius: 8,
  border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.05)",
  color: "#cfe0ee",
};

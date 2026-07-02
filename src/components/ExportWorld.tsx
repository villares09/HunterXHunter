import { useState } from "react";

// las 5 claves que forman el MUNDO (mc:characters NO va: es del jugador)
const WORLD_KEYS = ["mc-coast", "mc-forest", "mc-heightmap", "mc-rocks", "mc-world"] as const;

export function ExportWorld() {
  const [msg, setMsg] = useState("");

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
      try {
        world[k] = JSON.parse(raw); // guardamos el objeto parseado
      } catch {
        world[k] = raw; // si no es JSON válido, lo guardamos crudo
      }
    }

    const blob = new Blob([JSON.stringify(world)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "world.json";
    a.click();
    URL.revokeObjectURL(url);

    setMsg(
      "✅ Descargado world.json\n" +
      (missing.length ? "⚠️ Claves vacías (no exportadas): " + missing.join(", ") : "Todas las capas exportadas.")
    );
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#0e1b24", color: "#e8f3f8",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif", gap: 18, padding: 24,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800 }}>🐋 Exportar Mundo</div>
      <div style={{ fontSize: 13, opacity: 0.7, maxWidth: 440, textAlign: "center" }}>
        Junta todas las capas del mundo (terreno, costa, bosque, rocas, props) en un
        solo <b>world.json</b>. Los personajes NO se incluyen (cada jugador crea el suyo).
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={check} style={btnStyle(false)}>Ver capas</button>
        <button onClick={download} style={btnStyle(true)}>⬇ Descargar mundo</button>
      </div>

      {msg && (
        <pre style={{
          fontSize: 12, background: "#0a141c", border: "1px solid #1e3340",
          borderRadius: 8, padding: "12px 16px", whiteSpace: "pre-wrap",
          maxWidth: 440, lineHeight: 1.6,
        }}>{msg}</pre>
      )}

      <div style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>
        Poné el archivo en <code>src/data/world/world.json</code> después.
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

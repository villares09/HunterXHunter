import { useEffect, useRef } from "react";
import { useChat, type ChatKind } from "@/data/chatStore";

/* color por tipo de mensaje, tono L2 (texto sobre fondo oscuro translúcido) */
const KIND_COLOR: Record<ChatKind, string> = {
  dmgOut: "#eaeaea", // daño que hacés: blanco/gris claro
  dmgIn:  "#ff7b7b", // daño que recibís: rojo
  miss:   "#8fa6b8", // miss: gris azulado apagado
  exp:    "#322914", // exp/kill: dorado
  levelup:"#ffe14d", // subida de nivel: dorado brillante, destacado
  info:   "#8fd3ff", // avisos: celeste
  chat:   "#ffffff", // chat de jugador (futuro): blanco
};

export function SystemLog() {
  const messages = useChat((s) => s.messages);
  const boxRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true); // ¿el usuario está mirando el fondo? (autoscroll on)

  // autoscroll al fondo SOLO si el usuario no scrolleó hacia arriba a leer lo viejo
  useEffect(() => {
    const el = boxRef.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // detectar si el usuario está pegado al fondo (para no romperle la lectura)
  const onScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    pinned.current = nearBottom;
  };

  // por ahora solo el canal system; el día del chat, acá van pestañas por canal
  const shown = messages.filter((m) => m.channel === "system");

  return (
    <>
      {/* barra de scroll estilizada, finita, tono L2 — scoped a este panel */}
      <style>{`
        .syslog-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(150,190,220,.45) transparent;
        }
        .syslog-scroll::-webkit-scrollbar { width: 7px; }
        .syslog-scroll::-webkit-scrollbar-track { background: transparent; }
        .syslog-scroll::-webkit-scrollbar-thumb {
          background: rgba(150,190,220,.35);
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,.08);
        }
        .syslog-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(170,205,235,.60);
        }
      `}</style>

      <div
        // El panel CAPTURA el mouse sobre su recuadro: clicks y rueda no atraviesan
        // al juego (no mueve al personaje, no hace zoom). Fuera del panel, todo normal.
        onWheel={(e) => e.stopPropagation()} // la rueda scrollea el log, no hace zoom de cámara
        style={{
          position: "fixed",
          left: 12,
          bottom: 64, // deja lugar abajo para la futura barra de EXP
          width: 340,
          height: 150,            // ALTURA FIJA: el cuadro es estable, vacío o lleno
          borderRadius: 6,
          background: "rgba(6, 12, 18, 0.42)",
          zIndex: 50,
          overflow: "hidden",     // recorta el contenido al borde redondeado
          pointerEvents: "auto",  // <-- captura eventos SOLO sobre el panel (clickeable + scrolleable)
        }}
      >
        {/* ===========================================================
            FUTURO (multiplayer): acá va el <input> de chat.
            Cuando se agregue, en su onFocus prender un flag global
            "chatFocused = true" y en onBlur apagarlo; el manejador de
            teclas del Player consulta ese flag para NO disparar skills
            mientras se está escribiendo. El panel ya es clickeable, así
            que el input va a poder recibir foco sin tocar nada más.
            =========================================================== */}

        <div
          ref={boxRef}
          onScroll={onScroll}
          className="syslog-scroll"
          style={{
            height: "100%",
            overflowY: "scroll",  // scroll real (rueda sobre el panel + barra arrastrable)
            padding: "6px 8px",
            fontFamily: "Rajdhani, system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.35,
            textShadow: "0 1px 2px rgba(0,0,0,.9)",
            boxSizing: "border-box",
          }}
        >
          {/* empuja el contenido hacia abajo cuando hay pocas líneas, sin romper el scroll */}
          <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 1 }}>
            {shown.map((m) => (
              <div key={m.id} style={{ color: KIND_COLOR[m.kind], flexShrink: 0 }}>
                {m.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

import type { ReactNode } from "react";

/**
 * Marco de ventana reutilizable estilo L2 (Fase 2c-2).
 * Molde para todas las ventanas del juego: hoy lo usa CharacterWindow,
 * mañana Inventario / Skills / Quest, etc. — todas comparten título + X + cuerpo.
 *
 * Captura sus propios clicks (pointerEvents:auto + stopPropagation) para no
 * atravesar al canvas del juego, igual que hacen SkillBar y SystemLog.
 * No bloquea el movimiento: clickear FUERA del marco mueve al personaje, estilo L2.
 */
export function GameWindow({
  title,
  onClose,
  children,
  width = 340,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  return (
    <div
      className="gw"
      style={{ width, pointerEvents: "auto" }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="gw-bar">
        <span className="gw-title">{title}</span>
        <button className="gw-x" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      <div className="gw-body">{children}</div>
    </div>
  );
}

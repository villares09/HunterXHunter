import type { ReactNode } from "react";

/**
 * Marco de unidad reutilizable (Fase 2d).
 * Un solo componente para: el panel del jugador (completo), el target (mínimo)
 * y el party a futuro (completo, apilable). Cada uso elige qué mostrar via props.
 *
 * No trae barras propias: le pasás las <StatBar> que quieras como children.
 * Así el mismo marco sirve para "nombre + HP" (target) o "nivel + nombre +
 * HP + estamina + EXP" (jugador/party) sin ramificar el componente.
 */
export function UnitFrame({
  name,
  level,
  badge,
  children,
  className = "",
  compact = false,
}: {
  name: string;
  level?: number;      // si viene, se muestra la etiqueta de nivel antes del nombre
  badge?: ReactNode;   // extra opcional junto al nombre (ej. "FURIA")
  children: ReactNode; // las StatBar de esta unidad
  className?: string;
  compact?: boolean;   // target/party: más chico y sin fondo de panel
}) {
  return (
    <div className={"uframe" + (compact ? " compact" : "") + (className ? " " + className : "")}>
      <div className="uframe-head">
        {level !== undefined && <span className="uframe-lvl">{level}</span>}
        <span className="uframe-name">{name}</span>
        {badge}
      </div>
      <div className="uframe-bars">{children}</div>
    </div>
  );
}

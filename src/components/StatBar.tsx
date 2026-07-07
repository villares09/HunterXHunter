/**
 * Barra de stat reutilizable estilo L2 (Fase 2d).
 * Sirve para HP, Estamina, EXP y — cuando sea recurso real — Nen.
 * El número va SOBRE la barra: "actual/max" (hp, estamina, nen) o "%" (exp).
 *
 * Agregar el Nen mañana = una instancia más: <StatBar variant="nen" ... />.
 */
export function StatBar({
  label,
  value,
  max,
  variant,
  format = "value",
  thin = false,
}: {
  label: string;
  value: number;
  max: number;
  variant: "hp" | "stamina" | "exp" | "nen";
  format?: "value" | "percent";
  thin?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const readout =
    format === "percent"
      ? `${pct.toFixed(1)}%`
      : `${Math.ceil(value)} / ${Math.round(max)}`;

  return (
    <div className={"statbar" + (thin ? " thin" : "")}>
      <div className={"statbar-fill sb-" + variant} style={{ width: `${pct}%` }} />
      <div className="statbar-text">
        <span className="statbar-label">{label}</span>
        <span className="statbar-readout">{readout}</span>
      </div>
    </div>
  );
}

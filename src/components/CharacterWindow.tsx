import { useState } from "react";
import { useRPG } from "@/store";
import { expToNext, derive, RAW_STATS, type RawStat } from "@/character";
import { GameWindow } from "@/components/GameWindow";

const STAT_LABEL: Record<RawStat, string> = {
  fuerza: "Fuerza",
  agilidad: "Agilidad",
  resistencia: "Resistencia",
  inteligencia: "Inteligencia",
  percepcion: "Percepción",
  carisma: "Carisma",
};

const DERIVED_ORDER: string[] = [
  "Vida Total", "Estamina", "Ataque", "Defensa", "Daño", "Absorción",
];

type Draft = Record<string, number>;
const emptyDraft = (): Draft =>
  Object.fromEntries(RAW_STATS.map((k) => [k, 0])) as Draft;

export function CharacterWindow() {
  const character = useRPG((s) => s.character);
  const level = useRPG((s) => s.level);
  const exp = useRPG((s) => s.exp);
  const unspent = useRPG((s) => s.unspent);
  const commitStats = useRPG((s) => s.commitStats);
  const closeWindow = useRPG((s) => s.closeWindow);

  // reparto tentativo (vive acá; se descarta al cerrar la ventana)
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  if (!character) return null;

  const spent = RAW_STATS.reduce((a, k) => a + (draft[k] ?? 0), 0);
  const available = unspent - spent;

  // stats con el preview aplicado
  const previewStats: Record<string, number> = { ...character.stats };
  for (const k of RAW_STATS) previewStats[k] = (character.stats[k] ?? 0) + (draft[k] ?? 0);
  const previewDerived = derive(previewStats);

  const inc = (k: RawStat) => {
    if (available <= 0) return;
    setDraft((d) => ({ ...d, [k]: (d[k] ?? 0) + 1 }));
  };
  const dec = (k: RawStat) => {
    setDraft((d) => ((d[k] ?? 0) > 0 ? { ...d, [k]: d[k] - 1 } : d));
  };
  const reset = () => setDraft(emptyDraft());
  const confirm = () => {
    if (spent <= 0) return;
    commitStats(draft);
    setDraft(emptyDraft());
  };

  const need = expToNext(level);
  const expPct = need > 0 ? Math.min(100, (exp / need) * 100) : 0;

  return (
    <GameWindow title="Personaje" onClose={closeWindow}>
      <div className="cw-head">
        <div className="cw-name">{character.name}</div>
        <div className="cw-sub">Nivel {level}</div>
      </div>

      <div className="cw-exp">
        <div className="cw-exp-bar"><i style={{ width: `${expPct}%` }} /></div>
        <div className="cw-exp-lab">{exp} / {need} EXP</div>
      </div>

      {unspent > 0 && (
        <div className="cw-points">
          {available} punto{available === 1 ? "" : "s"} disponible{available === 1 ? "" : "s"}
          {spent > 0 && <span className="cw-pending"> · {spent} sin confirmar</span>}
        </div>
      )}

      <div className="cw-section">ATRIBUTOS</div>
      <div className="cw-stats">
        {RAW_STATS.map((k) => {
          const cur = character.stats[k] ?? 0;
          const add = draft[k] ?? 0;
          return (
            <div className="cw-row" key={k}>
              <span className="cw-k">{STAT_LABEL[k]}</span>
              <span className={"cw-v" + (add > 0 ? " up" : "")}>
                {cur + add}{add > 0 && <small className="cw-delta"> (+{add})</small>}
              </span>
              <button className="cw-mm" disabled={add <= 0} onClick={() => dec(k)} title="Quitar punto">−</button>
              <button className="cw-mm" disabled={available <= 0} onClick={() => inc(k)} title="Asignar punto">+</button>
            </div>
          );
        })}
      </div>

      {unspent > 0 && (
        <div className="cw-actions">
          <button className="cw-reset" disabled={spent <= 0} onClick={reset}>Deshacer</button>
          <button className="cw-confirm" disabled={spent <= 0} onClick={confirm}>
            Confirmar{spent > 0 ? ` (${spent})` : ""}
          </button>
        </div>
      )}

      <div className="cw-section">DERIVADOS</div>
      <div className="cw-derived">
        {DERIVED_ORDER.filter((k) => character.derived[k] !== undefined).map((k) => {
          const now = character.derived[k];
          const prev = previewDerived[k];
          const changed = prev !== now;
          return (
            <div className="cw-drow" key={k}>
              <span className="cw-dk">{k}</span>
              <span className={"cw-dv" + (changed ? " up" : "")}>
                {prev}{changed && <small className="cw-delta"> (+{prev - now})</small>}
              </span>
            </div>
          );
        })}
      </div>
    </GameWindow>
  );
}

import { useState } from "react";
import { loadRoster, deleteCharacter } from "../roster";
import { computeInit, type SavedCharacter } from "../character";
import { CATEGORIES } from "../data/quiz";
import { MODELS } from "../data/models";
import { useRPG } from "../store";
import "./onboarding.css";

export function CharacterSelect() {
  const setCharacter = useRPG((s) => s.setCharacter);
  const setPhase = useRPG((s) => s.setPhase);
  const [list, setList] = useState<SavedCharacter[]>(() => loadRoster());

  const play = (c: SavedCharacter) => setCharacter(c, computeInit(c.derived, c.category));
  const remove = (id: string) => { deleteCharacter(id); setList(loadRoster()); };

  return (
    <div className="ob">
      <div className="ob-head" style={{ marginTop: 10 }}>
        <div className="ey">MUNDO CAZADOR</div>
        <h1>Tus personajes</h1>
        <p>Elegí con quién entrar, o creá uno nuevo.</p>
      </div>

      <div className="ob-card">
        {list.length === 0 && <p className="hint">Todavía no tenés personajes.</p>}
        <div className="roster">
          {list.map((c) => {
            const cat = CATEGORIES.find((x) => x.id === c.category);
            const model = MODELS.find((m) => m.id === c.modelId);
            return (
              <div className="rchar" key={c.id}>
                <div className="ri">
                  <div className="rn">{c.name}</div>
                  <div className="rd">
                    {cat && <span style={{ color: cat.color }}>{cat.name}</span>} · {model?.name ?? c.modelId} · {c.origin === "bosque" ? "Bosque" : "Ciudad"}
                  </div>
                  <div className="rs">Vida {c.derived["Vida Total"]} · Daño {c.derived["Daño"]} · Nen {c.derived.Nen}</div>
                </div>
                <div className="ra">
                  <button className="btn" onClick={() => play(c)}>Jugar →</button>
                  <button className="btn ghost small" onClick={() => remove(c.id)}>Borrar</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ob-row center" style={{ marginTop: 16 }}>
        <button className="btn" onClick={() => setPhase("onboarding")}>+ Crear nuevo personaje</button>
      </div>
    </div>
  );
}

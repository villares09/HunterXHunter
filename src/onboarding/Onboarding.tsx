import { useMemo, useState } from "react";
import { CATEGORIES, QUIZ_INTRO, type Category } from "../data/quiz";
import { MODELS } from "../data/models";
import { useRPG } from "../store";
import { saveCharacter } from "../roster";
import "./onboarding.css";
import { computeInit } from "../character";

const STAT_DEFS = [
  { id: "fuerza", nm: "Fuerza" },
  { id: "agilidad", nm: "Agilidad" },
  { id: "resistencia", nm: "Resistencia" },
  { id: "inteligencia", nm: "Inteligencia" },
  { id: "percepcion", nm: "Percepción" },
  { id: "carisma", nm: "Carisma" },
] as const;
const TOTAL = 16;
const ORIGIN_BONUS: Record<string, Record<string, number>> = {
  bosque: { agilidad: 1, percepcion: 1 },
  ciudad: { inteligencia: 1, carisma: 1 },
};

function derive(e: Record<string, number>) {
  return {
    Ataque: Math.round(e.fuerza * 2 + e.agilidad),
    Defensa: Math.round(e.resistencia + e.agilidad),
    "Vida Total": Math.round(20 + e.resistencia * 8),
    "Daño": Math.round(5 + e.fuerza * 1.5),
    "Absorción": Math.round(e.resistencia * 0.6),
    Nen: Math.round(e.inteligencia * 2 + e.percepcion),
    "Estamina": Math.round(20 + e.resistencia * 5 + e.agilidad * 3), // aguante físico
  };
}

export function Onboarding() {
  const setCharacter = useRPG((s) => s.setCharacter);
  const [step, setStep] = useState<"create" | "test" | "result">("create");

  const [name, setName] = useState("");
  const [sex, setSex] = useState("m");
  const [origin, setOrigin] = useState("bosque");
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [base, setBase] = useState<Record<string, number>>(
    Object.fromEntries(STAT_DEFS.map((s) => [s.id, 0]))
  );
  const [category, setCategory] = useState<Category | null>(null);

  const effective = useMemo(() => {
    const e = { ...base };
    const b = ORIGIN_BONUS[origin] || {};
    for (const k in b) e[k] = (e[k] || 0) + b[k];
    return e;
  }, [base, origin]);
  const d = derive(effective);
  const used = STAT_DEFS.reduce((a, s) => a + base[s.id], 0);
  const remaining = TOTAL - used;

  const inc = (id: string) => remaining > 0 && base[id] < 8 && setBase({ ...base, [id]: base[id] + 1 });
  const dec = (id: string) => base[id] > 0 && setBase({ ...base, [id]: base[id] - 1 });

  const canContinue = name.trim() !== "" && remaining === 0;

  const finish = () => {
    if (!category) return;
    const char = { name: name.trim(), sex, origin, category: category.id, modelId, stats: effective, derived: d };
    saveCharacter(char);
    setCharacter(char, computeInit(d, category.id, effective));
  };

  return (
    <div className="ob">
      <div className="ob-steps">
        <span className={"s" + (step === "create" ? " on" : "")}>1 · PERSONAJE</span>
        <span className={"s" + (step === "test" ? " on" : "")}>2 · PERSONALIDAD</span>
        <span className={"s" + (step === "result" ? " on" : "")}>3 · RESUMEN</span>
      </div>

      {step === "create" && (
        <>
          <div className="ob-head">
            <div className="ey">MUNDO CAZADOR</div>
            <h1>Creá tu personaje</h1>
            <p>Repartí tus 16 puntos, elegí tu origen y tu modelo.</p>
          </div>
          <div className="ob-grid">
            <div className="ob-card">
              <h2>Identidad</h2>
              <label className="fld">NOMBRE</label>
              <input type="text" maxLength={20} placeholder="Nombre del aspirante"
                value={name} onChange={(e) => setName(e.target.value)} />
              <label className="fld">SEXO</label>
              <div className="seg">
                {[["m", "Masculino"], ["f", "Femenino"]].map(([v, l]) => (
                  <button key={v} className={sex === v ? "on" : ""} onClick={() => setSex(v)}>{l}</button>
                ))}
              </div>
              <label className="fld">TIPO DE PERSONAJE</label>
              <div className="origins">
                <div className={"origin" + (origin === "bosque" ? " on" : "")} onClick={() => setOrigin("bosque")}>
                  <div className="t">Criado en el bosque</div><div className="bo">+1 Agilidad · +1 Percepción</div>
                </div>
                <div className={"origin" + (origin === "ciudad" ? " on" : "")} onClick={() => setOrigin("ciudad")}>
                  <div className="t">Criado en ciudad</div><div className="bo">+1 Inteligencia · +1 Carisma</div>
                </div>
              </div>

              <h2 style={{ marginTop: 18 }}>Características</h2>
              <div className="points"><span className="n">{remaining}</span><span className="l">PUNTOS POR ASIGNAR</span></div>
              {STAT_DEFS.map((s) => (
                <div className="stat" key={s.id}>
                  <span className="nm">{s.nm}</span>
                  <button className="pm" onClick={() => dec(s.id)} disabled={base[s.id] <= 0}>−</button>
                  <span className="vv">{base[s.id]}</span>
                  <button className="pm" onClick={() => inc(s.id)} disabled={remaining <= 0}>+</button>
                  <span className="track"><i style={{ width: `${(base[s.id] / 8) * 100}%` }} /></span>
                </div>
              ))}
            </div>

            <div className="ob-card">
              <h2>Modelo</h2>
              <div className="models">
                {MODELS.map((m) => (
                  <div key={m.id} className={"model" + (modelId === m.id ? " on" : "")} onClick={() => setModelId(m.id)}>
                    <div className="t">{m.name}</div>
                    <div className="bl">{m.blurb}</div>
                  </div>
                ))}
              </div>
              <h2 style={{ marginTop: 16 }}>Atributos</h2>
              <div className="derived">
                {Object.entries(d).filter(([k]) => k !== "Nen").map(([k, v]) => (
                  <div key={k} className="d-stat">
                    <div className="l">{k.toUpperCase()}</div><div className="v">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="ob-row">
            <span className="hint">{!name.trim() ? "Poné un nombre." : remaining > 0 ? `Faltan ${remaining} punto(s).` : "¡Listo!"}</span>
            <button className="btn" disabled={!canContinue} onClick={() => setStep("test")}>Continuar →</button>
          </div>
        </>
      )}

      {step === "test" && (
        <>
          <div className="ob-head"><div className="ey">PRUEBA DE PERSONALIDAD</div><h1>¿Quién sos en realidad?</h1></div>
          <div className="ob-card">
            <p className="quiz-intro">{QUIZ_INTRO}</p>
            <div className="options">
              {CATEGORIES.map((c) => (
                <button key={c.id} className="opt" onClick={() => { setCategory(c); setStep("result"); }}>
                  {c.question}
                </button>
              ))}
            </div>
          </div>
          <div className="ob-row"><button className="btn ghost" onClick={() => setStep("create")}>← Volver</button></div>
        </>
      )}

      {step === "result" && category && (
        <>
          <div className="ob-card result">
            <div className="ey" style={{ color: "var(--gold)" }}>TU PERSONAJE</div>
            <div className="charline" style={{ marginBottom: 14 }}>
              <b>{name}</b> · {origin === "bosque" ? "Criado en el bosque" : "Criado en ciudad"} · {MODELS.find((m) => m.id === modelId)?.name}
            </div>
            <div className="derived">
              {Object.entries(d).filter(([k]) => k !== "Nen").map(([k, v]) => (
                <div key={k} className="d-stat">
                  <div className="l">{k.toUpperCase()}</div><div className="v">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="ob-row center">
            <button className="btn ghost" onClick={() => setStep("test")}>← Volver</button>
            <button className="btn" onClick={finish}>Entrar a Mundo Cazador →</button>
          </div>
        </>
      )}
    </div>
  );
}

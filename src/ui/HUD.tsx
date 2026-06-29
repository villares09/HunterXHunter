import { useEffect, useState } from "react";
import { useRPG } from "../store";
import { Minimap } from "./Minimap";
import { COMBO_SKILLS, comboCost, useComboSkill } from "../skills";
import { DialogueRunner } from "./DialogueRunner";

function ShakeListener() {
  const shakeAt = useRPG((s) => s.shakeAt);
  useEffect(() => {
    if (!shakeAt) return;
    const stage = document.getElementById("stage");
    if (!stage) return;
    stage.classList.remove("shake"); void stage.offsetWidth; stage.classList.add("shake");
    const t = setTimeout(() => stage.classList.remove("shake"), 200);
    return () => clearTimeout(t);
  }, [shakeAt]);
  return null;
}

function SkillBar() {
  const cooldowns = useRPG((s) => s.cooldowns);
  const stamina = useRPG((s) => s.stamina);
  return (
    <div className="skillbar">
      {COMBO_SKILLS.map((sk) => {
        const cd = cooldowns[sk.id] ?? 0;
        const cost = comboCost(sk);
        const off = cd > 0 || stamina < cost;
        return (
          <div
            key={sk.id}
            className={"slot" + (off ? " off" : "")}
            title={sk.desc}
            style={{ pointerEvents: "auto", cursor: "pointer" }}
            onClick={() => useComboSkill(sk)}
          >
            <span className="key">{sk.keyLabel}</span>
            <span className="ico">{sk.icon}</span>
            <span className="nm">{sk.name}</span>
            <span className="cost">{Math.round(cost)}</span>
            {cd > 0 && <span className="cd">{cd.toFixed(1)}</span>}
          </div>
        );
      })}
    </div>
  );
}

function DeathOverlay() {
  const deathModal = useRPG((s) => s.deathModal);
  const revive = useRPG((s) => s.revive);
  const toSelect = useRPG((s) => s.setPhase);
  if (!deathModal) return null;
  return (
    <div className="death">
      <div className="death-box">
        <h3>CAÍSTE</h3>
        <p>Tu cazador quedó fuera de combate.</p>
        <div className="death-acts">
          <button className="dbtn" onClick={revive}>Reaparecer</button>
          <button className="dbtn ghost" onClick={() => toSelect("select")}>Cambiar de personaje</button>
        </div>
      </div>
    </div>
  );
}

export function HUD() {
  const hp = useRPG((s) => s.hp);
  const maxHp = useRPG((s) => s.maxHp);
  const kills = useRPG((s) => s.kills);
  const buffT = useRPG((s) => s.buffT);
  const character = useRPG((s) => s.character);
  const [story, setStory] = useState(false);
  const stamina = useRPG((s) => s.stamina);
  const maxStamina = useRPG((s) => s.maxStamina);
  const combo = useRPG((s) => s.combo);

  return (
    <div id="hud">
      <ShakeListener />
      <DeathOverlay />
      {story && <DialogueRunner onClose={() => setStory(false)} />}

      <div className="panel player-panel">
        <div className="name">{character?.name ?? "Cazador"} {buffT > 0 && <span className="buff">FURIA</span>}</div>
        <div className="bar hp"><i style={{ width: `${(hp / maxHp) * 100}%` }} /></div>
        <div className="lab"><span>VIDA</span><span>{Math.ceil(hp)}/{maxHp}</span></div>
        <div className="bar stamina"><i style={{ width: `${maxStamina > 0 ? (stamina / maxStamina) * 100 : 0}%` }} /></div>
        <div className="lab"><span>ESTAMINA</span><span>{Math.round(stamina)}/{maxStamina}</span></div>
        <div className="lab" style={{ marginTop: 6 }}><span>BESTIAS</span><span>{kills}</span></div>
      </div>

      <div className={"combo" + (combo > 1 ? " show" : "")}>{combo}<small>x COMBO</small></div>

      <div id="minimap-wrap"><Minimap /></div>
      <div className="mm-legend"><span className="dot" /> objetivos</div>

      <button className="story-btn" onClick={() => setStory(true)}>📖 Historia</button>

      <SkillBar />

      <div className="controls">
        <b>click</b> mover/atacar · <b>doble click</b> auto-ataque · <b>TAB</b> objetivo · <b>SHIFT</b> correr · <b>ESPACIO</b> saltar · <b>1·2·3</b> combos · <b>mouse der</b> cámara
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useRPG, expToNext } from "@/store";
import { Minimap } from "./Minimap";
import { SLOTS, slotCost, useSlot } from "@/skills";
import { DialogueRunner } from "./DialogueRunner";
import { SystemLog } from "@/components/SystemLog";
import { CharacterWindow } from "@/components/CharacterWindow";
import { UnitFrame } from "@/components/UnitFrame";
import { StatBar } from "@/components/StatBar";
import { TargetFrame } from "@/components/TargetFrame";

function ShakeListener() {
  const shakeAt = useRPG((s) => s.shakeAt);
  const shakeKind = useRPG((s) => s.shakeKind);
  useEffect(() => {
    if (!shakeAt) return;
    const stage = document.getElementById("stage");
    if (!stage) return;
    const cls = shakeKind === "hard" ? "shake-hard" : "shake";
    stage.classList.remove("shake", "shake-hard");
    void stage.offsetWidth;
    stage.classList.add(cls);
    const t = setTimeout(() => stage.classList.remove(cls), shakeKind === "hard" ? 500 : 200);
    return () => clearTimeout(t);
  }, [shakeAt, shakeKind]);
  return null;
}

function SkillBar() {
  const cooldowns = useRPG((s) => s.cooldowns);
  const stamina = useRPG((s) => s.stamina);
  return (
    <div className="skillbar">
      {SLOTS.map((sk) => {
        const cd = cooldowns[sk.id] ?? 0;
        const cost = slotCost(sk);
        const off = cd > 0 || stamina < cost;
        return (
          <div
            key={sk.id}
            className={"slot" + (off ? " off" : "")}
            title={sk.desc}
            style={{ pointerEvents: "auto", cursor: "pointer" }}
            onClick={() => useSlot(sk)}
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

// Botón del menú que abre la ventana Character. Molde: cuando haya más ventanas,
// esto se vuelve la barra de acciones L2 (character/inventario/skills/...).
function MenuBar() {
  const toggleWindow = useRPG((s) => s.toggleWindow);
  const openWindow = useRPG((s) => s.openWindow);
  const unspent = useRPG((s) => s.unspent);
  return (
    <div className="menubar">
      <button
        className={"menu-btn" + (openWindow === "character" ? " on" : "")}
        style={{ pointerEvents: "auto" }}
        title="Personaje (C)"
        onClick={() => toggleWindow("character")}
      >
        <span className="mb-ico">👤</span>
        <span className="mb-lab">Personaje</span>
        {unspent > 0 && <span className="mb-badge">{unspent}</span>}
      </button>
    </div>
  );
}

// Panel del jugador: usa el UnitFrame completo (nivel + nombre + HP/estamina/EXP).
function PlayerPanel() {
  const hp = useRPG((s) => s.hp);
  const maxHp = useRPG((s) => s.maxHp);
  const stamina = useRPG((s) => s.stamina);
  const maxStamina = useRPG((s) => s.maxStamina);
  const buffT = useRPG((s) => s.buffT);
  const character = useRPG((s) => s.character);
  const level = useRPG((s) => s.level);
  const exp = useRPG((s) => s.exp);

  return (
    <div className="player-panel-wrap">
      <UnitFrame
        name={character?.name ?? "Cazador"}
        level={level}
        badge={buffT > 0 ? <span className="buff">FURIA</span> : undefined}
      >
        <StatBar label="VIDA" value={hp} max={maxHp} variant="hp" />
        <StatBar label="ESTAMINA" value={stamina} max={maxStamina} variant="stamina" />
        <StatBar label="EXP" value={exp} max={expToNext(level)} variant="exp" format="percent" thin />
      </UnitFrame>
    </div>
  );
}

export function HUD() {
  const combo = useRPG((s) => s.combo);
  const openWindow = useRPG((s) => s.openWindow);
  const [story, setStory] = useState(false);

  return (
    <div id="hud">
      <ShakeListener />
      <SystemLog />
      <DeathOverlay />
      {story && <DialogueRunner onClose={() => setStory(false)} />}

      {openWindow === "character" && (
        <div className="window-layer">
          <CharacterWindow />
        </div>
      )}

      <PlayerPanel />
      <TargetFrame />

      <div className={"combo" + (combo > 1 ? " show" : "")}>{combo}<small>x COMBO</small></div>

      <div id="minimap-wrap"><Minimap /></div>
      <div className="mm-legend"><span className="dot" /> objetivos</div>

      <button className="story-btn" onClick={() => setStory(true)}>📖 Historia</button>

      <MenuBar />
      <SkillBar />

      <div className="controls">
        <b>click</b> mover/atacar · <b>doble click</b> auto · <b>TAB</b> objetivo · <b>SHIFT</b> correr · <b>ESPACIO</b> saltar · <b>C</b> personaje · <b>1</b> básico · <b>2·3</b> skills · <b>mouse der</b> cámara
      </div>
    </div>
  );
}

import { create } from "zustand";
import { hasCharacters } from "@/roster";
import { registry } from "@/registry";
import { sysLog } from "@/data/chatStore";

export type Floater = {
  id: number;
  pos: [number, number, number];
  text: string;
  kind: "hit" | "crit" | "hurt" | "info" | "aura";
  life: number;
};

export type Character = {
  name: string; sex: string; origin: string;
  category: string; modelId: string;
  stats: Record<string, number>;
  derived: Record<string, number>;
};

export type CharInit = {
  maxHp: number; maxAura: number; baseDmg: number; passiveDmg: number;
  maxStamina: number; // NUEVO: derivado de Estamina en derive()
};

const AURA_REGEN = 14;
const DEATH_ANIM_TIME = 2.2; // "Stunned to floor" dura 2.17s -> recién ahí mostramos el modal

// === ESTAMINA (Bloque 1) ===
const STAMINA_REGEN_FACTOR = 0.4;   // regen/seg = maxStamina * 0.4  (~2.5s de 0 a full)
const STAMINA_REGEN_DELAY = 3;    // seg sin regen tras gastar (respiro Souls)
const RUN_DRAIN_EXTRA = 1;          // correr gasta (regen + 1)/seg -> drena 1/seg neto

type State = {
  phase: "select" | "onboarding" | "playing";
  dead: boolean;
  deathModal: boolean;
  deathT: number;
  invuln: number;
  character: Character | null;

  hp: number; maxHp: number; kills: number;
  combo: number; comboT: number;
  hitStop: number; shakeAt: number; shakeKind: "normal" | "hard";
  floaters: Floater[];

  aura: number; maxAura: number;
  baseDmg: number; passiveDmg: number;
  cooldowns: Record<string, number>;
  dmgMult: number; buffT: number;

  // estamina
  stamina: number; maxStamina: number;
  staminaDelay: number; // countdown del delay de regen
  running: boolean;     // lo refleja el Player para que el tick sepa si drenar

  setCharacter: (c: Character, init: CharInit) => void;
  setPhase: (p: "select" | "onboarding" | "playing") => void;
  addCombo: () => void;
  damagePlayer: (n: number, pos: [number, number, number], atk?: number) => void;
  addFloater: (f: Omit<Floater, "id" | "life">) => void;
  setHitStop: (s: number) => void;
  shake: (kind?: "normal" | "hard") => void;
  addKill: () => void;
  spendAura: (n: number) => boolean;
  ready: (id: string) => boolean;
  setCooldown: (id: string, cd: number) => void;
  buff: (mult: number, dur: number) => void;
  tick: (dt: number) => void;
  revive: () => void;

  // estamina
  spendStamina: (n: number) => boolean;
  hasStamina: (n: number) => boolean;
  setRunning: (v: boolean) => void;
};

let _fid = 1;

export const useRPG = create<State>((set, get) => ({
  phase: hasCharacters() ? "select" : "onboarding",
  dead: false,
  deathModal: false,
  deathT: 0,
  invuln: 0,
  character: null,

  hp: 100, maxHp: 100, kills: 0,
  combo: 0, comboT: 0,
  hitStop: 0, shakeAt: 0, shakeKind: "normal" as "normal" | "hard",
  floaters: [],
  aura: 100, maxAura: 100,
  baseDmg: 12, passiveDmg: 1,
  cooldowns: {},
  dmgMult: 1, buffT: 0,

  stamina: 100, maxStamina: 100,
  staminaDelay: 0,
  running: false,

  setCharacter: (c, init) =>
    set({
      character: c,
      phase: "playing",
      maxHp: init.maxHp, hp: init.maxHp,
      maxAura: init.maxAura, aura: init.maxAura,
      baseDmg: init.baseDmg, passiveDmg: init.passiveDmg,
      maxStamina: init.maxStamina, stamina: init.maxStamina, staminaDelay: 0, running: false,
      kills: 0, combo: 0, dead: false, deathModal: false, deathT: 0, invuln: 1.5,
    }),
  setPhase: (p) => set({ phase: p }),

  addCombo: () => set((s) => ({ combo: s.combo + 1, comboT: 1.6 })),
  damagePlayer: (n, pos, atk) => {
    const s = get();
    if (s.dead || s.invuln > 0) return;

    // --- TIRADA DE IMPACTO (enemigo -> jugador) ---
    // chance = Ataque_enemigo / (Ataque_enemigo + Defensa_jugador). Si el enemigo
    // manda su atk, se tira; si no (atk undefined), el golpe pega si o si (compat).
    if (atk !== undefined) {
      const defP = s.character?.derived?.["Defensa"] ?? 8;
      const chance = atk / (atk + defP);
      if (Math.random() > chance) {
        // el enemigo te erró: MISS sobre el jugador, sin daño ni sacudida
        const p = registry.player;
        if (p) {
          get().addFloater({ pos: [p.position.x, p.position.y + 2.4, p.position.z], text: "MISS", kind: "info" });
        }
        sysLog.miss("El enemigo", "vos");
        return;
      }
    }

    // --- ABSORCION del jugador: resta al dano recibido, piso de 1 ---
    const absP = s.character?.derived?.["Absorción"] ?? 0;
    const dmg = Math.max(1, Math.round(n - absP));

    const hp = Math.max(0, s.hp - dmg);
    const dead = hp <= 0;
    set({ hp, dead, deathT: dead ? DEATH_ANIM_TIME : s.deathT });
    get().addFloater({ pos, text: `-${dmg}`, kind: "hurt" });
    sysLog.dmgIn("El enemigo", dmg);
    get().shake(dead ? "hard" : "normal");
  },
  addFloater: (f) => set((s) => ({ floaters: [...s.floaters, { ...f, id: _fid++, life: 1 }] })),
  setHitStop: (s) => set({ hitStop: Math.max(get().hitStop, s) }),
  shake: (kind = "normal") => set({ shakeAt: performance.now(), shakeKind: kind }),
  addKill: () => set((s) => ({ kills: s.kills + 1 })),
  spendAura: (n) => { if (get().aura < n) return false; set({ aura: get().aura - n }); return true; },
  ready: (id) => (get().cooldowns[id] ?? 0) <= 0,
  setCooldown: (id, cd) => {
    set((s) => ({ cooldowns: { ...s.cooldowns, [id]: cd } }));
  },
  buff: (mult, dur) => set({ dmgMult: mult, buffT: dur }),
  revive: () => set({ hp: get().maxHp, stamina: get().maxStamina, staminaDelay: 0, dead: false, deathModal: false, deathT: 0, invuln: 2 }),

  // === ESTAMINA ===
  hasStamina: (n) => get().stamina >= n,
  spendStamina: (n) => {
    const s = get();
    if (s.stamina < n) return false;
    set({ stamina: s.stamina - n, staminaDelay: STAMINA_REGEN_DELAY });
    return true;
  },
  setRunning: (v) => set({ running: v }),

  tick: (dt) => {
    const s = get();
    const next: Partial<State> = {};
    next.hitStop = Math.max(0, s.hitStop - dt);
    if (s.invuln > 0) next.invuln = Math.max(0, s.invuln - dt);

    if (s.dead && s.deathT > 0) {
      const dt2 = Math.max(0, s.deathT - dt);
      next.deathT = dt2;
      if (dt2 === 0) next.deathModal = true;
    }

    let combo = s.combo, comboT = s.comboT;
    if (comboT > 0) { comboT = Math.max(0, comboT - dt); if (comboT === 0) combo = 0; }
    next.combo = combo; next.comboT = comboT;
    if (s.floaters.length) {
      next.floaters = s.floaters
        .map((f) => ({ ...f, life: f.life - dt * 1.2, pos: [f.pos[0], f.pos[1] + dt * 1.3, f.pos[2]] as [number, number, number] }))
        .filter((f) => f.life > 0);
    }
    if (s.aura < s.maxAura) next.aura = Math.min(s.maxAura, s.aura + AURA_REGEN * dt);

    // --- ESTAMINA: delay -> regen; correr drena (regen + 1)/seg ---
    const regenPerSec = s.maxStamina * STAMINA_REGEN_FACTOR;
    let stamina = s.stamina;
    let delay = s.staminaDelay > 0 ? Math.max(0, s.staminaDelay - dt) : 0;

    if (s.running) {
      const drain = (regenPerSec + RUN_DRAIN_EXTRA) * dt;
      const regen = delay <= 0 ? regenPerSec * dt : 0;
      stamina = Math.max(0, stamina - drain + regen);
    } else if (delay <= 0 && stamina < s.maxStamina) {
      stamina = Math.min(s.maxStamina, stamina + regenPerSec * dt);
    }
    next.stamina = stamina;
    next.staminaDelay = delay;

    // --- COOLDOWNS: bajar cada uno por dt; los que llegan a 0 se descartan ---
    if (Object.keys(s.cooldowns).length > 0) {
      const cds: Record<string, number> = {};
      for (const k in s.cooldowns) {
        const v = s.cooldowns[k] - dt;
        if (v > 0) cds[k] = v;
      }
      next.cooldowns = cds;
    }

    if (s.buffT > 0) { const bt = Math.max(0, s.buffT - dt); next.buffT = bt; if (bt === 0) next.dmgMult = 1; }
    set(next);
  },
}));

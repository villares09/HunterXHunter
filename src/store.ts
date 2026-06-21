import { create } from "zustand";
import { hasCharacters } from "./roster";

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

export type CharInit = { maxHp: number; maxAura: number; baseDmg: number; passiveDmg: number };

const AURA_REGEN = 14;

type State = {
  phase: "select" | "onboarding" | "playing";
  dead: boolean;
  invuln: number;
  character: Character | null;

  hp: number; maxHp: number; kills: number;
  combo: number; comboT: number;
  hitStop: number; shakeAt: number;
  floaters: Floater[];

  aura: number; maxAura: number;
  baseDmg: number; passiveDmg: number;
  cooldowns: Record<string, number>;
  dmgMult: number; buffT: number;

  setCharacter: (c: Character, init: CharInit) => void;
  setPhase: (p: "select" | "onboarding" | "playing") => void;
  addCombo: () => void;
  damagePlayer: (n: number, pos: [number, number, number]) => void;
  addFloater: (f: Omit<Floater, "id" | "life">) => void;
  setHitStop: (s: number) => void;
  shake: () => void;
  addKill: () => void;
  spendAura: (n: number) => boolean;
  ready: (id: string) => boolean;
  setCooldown: (id: string, cd: number) => void;
  buff: (mult: number, dur: number) => void;
  tick: (dt: number) => void;
  revive: () => void;
};

let _fid = 1;

export const useRPG = create<State>((set, get) => ({
  phase: hasCharacters() ? "select" : "onboarding",
  dead: false,
  invuln: 0,
  character: null,

  hp: 100, maxHp: 100, kills: 0,
  combo: 0, comboT: 0,
  hitStop: 0, shakeAt: 0,
  floaters: [],
  aura: 100, maxAura: 100,
  baseDmg: 12, passiveDmg: 1,
  cooldowns: {},
  dmgMult: 1, buffT: 0,

  setCharacter: (c, init) =>
    set({
      character: c,
      phase: "playing",
      maxHp: init.maxHp, hp: init.maxHp,
      maxAura: init.maxAura, aura: init.maxAura,
      baseDmg: init.baseDmg, passiveDmg: init.passiveDmg,
      kills: 0, combo: 0, dead: false, invuln: 1.5,
    }),
  setPhase: (p) => set({ phase: p }),

  addCombo: () => set((s) => ({ combo: s.combo + 1, comboT: 1.6 })),
  damagePlayer: (n, pos) => {
    const s = get();
    if (s.dead || s.invuln > 0) return;
    const hp = Math.max(0, s.hp - n);
    set({ hp, dead: hp <= 0 });
    get().addFloater({ pos, text: `-${n}`, kind: "hurt" });
    get().shake();
  },
  addFloater: (f) => set((s) => ({ floaters: [...s.floaters, { ...f, id: _fid++, life: 1 }] })),
  setHitStop: (s) => set({ hitStop: Math.max(get().hitStop, s) }),
  shake: () => set({ shakeAt: performance.now() }),
  addKill: () => set((s) => ({ kills: s.kills + 1 })),
  spendAura: (n) => { if (get().aura < n) return false; set({ aura: get().aura - n }); return true; },
  ready: (id) => (get().cooldowns[id] ?? 0) <= 0,
  setCooldown: (id, cd) => set((s) => ({ cooldowns: { ...s.cooldowns, [id]: cd } })),
  buff: (mult, dur) => set({ dmgMult: mult, buffT: dur }),
  revive: () => set({ hp: get().maxHp, dead: false, invuln: 2 }),

  tick: (dt) => {
    const s = get();
    const next: Partial<State> = {};
    next.hitStop = Math.max(0, s.hitStop - dt);
    if (s.invuln > 0) next.invuln = Math.max(0, s.invuln - dt);
    let combo = s.combo, comboT = s.comboT;
    if (comboT > 0) { comboT = Math.max(0, comboT - dt); if (comboT === 0) combo = 0; }
    next.combo = combo; next.comboT = comboT;
    if (s.floaters.length) {
      next.floaters = s.floaters
        .map((f) => ({ ...f, life: f.life - dt * 1.2, pos: [f.pos[0], f.pos[1] + dt * 1.3, f.pos[2]] as [number, number, number] }))
        .filter((f) => f.life > 0);
    }
    if (s.aura < s.maxAura) next.aura = Math.min(s.maxAura, s.aura + AURA_REGEN * dt);
    const cds: Record<string, number> = {};
    let changed = false;
    for (const k in s.cooldowns) { const v = s.cooldowns[k] - dt; if (v > 0) cds[k] = v; else changed = true; }
    if (changed || Object.keys(cds).length !== Object.keys(s.cooldowns).length) next.cooldowns = cds;
    if (s.buffT > 0) { const bt = Math.max(0, s.buffT - dt); next.buffT = bt; if (bt === 0) next.dmgMult = 1; }
    set(next);
  },
}));

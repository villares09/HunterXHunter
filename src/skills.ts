import * as THREE from "three";
import { useRPG } from "./store";
import { hitInRadius } from "./damage";
import { startSwing, attack } from "./combat";
import { requestSlot } from "./components/Movement";
import { useTarget } from "./targeting";

// ============================================================
// SLOTS DE LA BARRA — unifica ACTIONS y SKILLS.
//  - action: sin cooldown (básico, guard futuro). El básico encadena.
//  - skill:  con cooldown (combos).
// Ambos gastan estamina y persiguen al target antes de ejecutar.
// ============================================================
export type SlotKind = "action" | "skill";

export type Slot = {
  id: string;
  name: string;
  code: string;       // KeyboardEvent.code
  keyLabel: string;
  icon: string;
  kind: SlotKind;
  // para skills de combo: el move que disparan + costo + cd
  moveId?: string;    // si es "basic", el Player resuelve la cadena
  staminaDenom?: number;
  cd?: number;
  desc: string;
};

export const SLOTS: Slot[] = [
  {
    id: "basic", name: "Básico", code: "Digit1", keyLabel: "1", icon: "✊",
    kind: "action", moveId: "basic", staminaDenom: useRPG.getState().maxStamina, cd: 0,
    desc: "Golpe básico. Repetí para encadenar.",
  },
  {
    id: "flyingKnee", name: "Rodilla Voladora", code: "Digit2", keyLabel: "2", icon: "🦵",
    kind: "skill", moveId: "flyingKnee", staminaDenom: 4, cd: 4,
    desc: "Salto con rodilla al objetivo.",
  },
  {
    id: "highKick", name: "Patada Alta", code: "Digit3", keyLabel: "3", icon: "🌀",
    kind: "skill", moveId: "kickHigh", staminaDenom: 4, cd: 3,
    desc: "Patada alta de gran alcance.",
  },
  {
    id: "comboPunch", name: "Combo Puños", code: "Digit4", keyLabel: "4", icon: "👊",
    kind: "skill", moveId: "finisher", staminaDenom: 3, cd: 5,
    desc: "Cadena de golpes demoledora.",
  },
];

const slotByCode = new Map(SLOTS.map((s) => [s.code, s]));

/** Costo de estamina actual de un slot (redondeado = lo que se gasta). */
export function slotCost(sk: Slot): number {
  return Math.round(useRPG.getState().maxStamina / (sk.staminaDenom ?? 8));
}

/** Intenta usar un slot por code de tecla. */
export function useSlotByCode(code: string): boolean {
  const sk = slotByCode.get(code);
  if (!sk) return false;
  return useSlot(sk);
}

/** Usa un slot (tecla o click). El Player ejecuta vía requestSlot. */
export function useSlot(sk: Slot): boolean {
  const S = useRPG.getState();

  // TODO requiere target (básico y skills). Sin objetivo -> no hace nada.
  if (!useTarget.getState().target) return false;

  // ACTIONS (básico): sin cooldown. El encadenado lo maneja el Player.
  if (sk.kind === "action") {
    requestSlot(sk.id);
    return true;
  }

  // SKILLS (combo): respeta cd, no se puede tirar durante otro swing.
  if (attack.active) return false;
  if (!S.ready(sk.id)) return false;
  const cost = slotCost(sk);
  if (!S.hasStamina(cost)) return false;
  S.setCooldown(sk.id, sk.cd ?? 0);
  requestSlot(sk.id);
  return true;
}

// ============================================================
// SKILLS DE NEN (aura) — DORMIDAS hasta activar el sistema de Nen.
// ============================================================
export type NenSkill = {
  id: string; name: string; icon: string;
  cost: number; cd: number; desc: string;
  effect: (pos: THREE.Vector3) => void;
};

export const NEN_SKILLS: NenSkill[] = [
  {
    id: "embate", name: "Embate", icon: "🌀", cost: 25, cd: 4, desc: "Golpe en área a tu alrededor.",
    effect: (pos) => {
      startSwing();
      hitInRadius(pos, 3.8, 30, { knockback: 1.2 });
      const S = useRPG.getState();
      S.setHitStop(0.1); S.shake();
      S.addFloater({ pos: [pos.x, pos.y + 2.2, pos.z], text: "EMBATE", kind: "aura" });
    },
  },
  {
    id: "onda", name: "Onda", icon: "💢", cost: 35, cd: 6, desc: "Onda expansiva de mayor alcance.",
    effect: (pos) => {
      startSwing();
      hitInRadius(pos, 7, 22, { knockback: 1.8, critChance: 0.28 });
      const S = useRPG.getState();
      S.setHitStop(0.08); S.shake();
      S.addFloater({ pos: [pos.x, pos.y + 2.2, pos.z], text: "ONDA", kind: "aura" });
    },
  },
  {
    id: "furia", name: "Furia", icon: "🔥", cost: 50, cd: 12, desc: "Duplica tu daño por 6s.",
    effect: (pos) => {
      const S = useRPG.getState();
      S.buff(2, 6); S.shake();
      S.addFloater({ pos: [pos.x, pos.y + 2.4, pos.z], text: "¡FURIA! x2", kind: "aura" });
    },
  },
];

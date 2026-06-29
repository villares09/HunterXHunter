import * as THREE from "three";
import { useRPG } from "./store";
import { hitInRadius } from "./damage";
import { startSwing } from "./combat";
import { requestCombo } from "./components/Movement";

// ============================================================
// SKILLS DE COMBO (estamina) — la barra activa de la 1ra entrega.
// Cada slot dispara un clip de combo de MOVES vía requestCombo.
// Costo = fracción de la estamina máxima (escala con stats):
//   denom 3 = más caro (finisher) · denom 4 = combos normales.
// ============================================================
export type ComboSkill = {
  id: string;
  name: string;
  code: string;
  keyLabel: string;
  icon: string;
  moveId: string;
  staminaDenom: number;
  cd: number;
  desc: string;
};

export const COMBO_SKILLS: ComboSkill[] = [
  {
    id: "comboPunch", name: "Combo Puños", code: "Digit1", keyLabel: "1", icon: "👊",
    moveId: "finisher", staminaDenom: 3, cd: 5, desc: "Cadena de golpes demoledora.",
  },
  {
    id: "flyingKnee", name: "Rodilla Voladora", code: "Digit2", keyLabel: "2", icon: "🦵",
    moveId: "flyingKnee", staminaDenom: 4, cd: 4, desc: "Salto con rodilla al objetivo.",
  },
  {
    id: "highKick", name: "Patada Alta", code: "Digit3", keyLabel: "3", icon: "🌀",
    moveId: "kickHigh", staminaDenom: 4, cd: 3, desc: "Patada alta de gran alcance.",
  },
];

const comboByCode = new Map(COMBO_SKILLS.map((s) => [s.code, s]));

/** Costo de estamina actual de una combo-skill (redondeado = lo que se gasta). */
export function comboCost(sk: ComboSkill): number {
  return Math.round(useRPG.getState().maxStamina / sk.staminaDenom);
}

/** Intenta usar una combo-skill por code de tecla. */
export function useComboByCode(code: string): boolean {
  const sk = comboByCode.get(code);
  if (!sk) return false;
  return useComboSkill(sk);
}

/** Usa una combo-skill (para tecla y click en slot). */
export function useComboSkill(sk: ComboSkill): boolean {
  const S = useRPG.getState();
  if (!S.ready(sk.id)) return false;        // en cooldown
  const cost = comboCost(sk);
  if (!S.hasStamina(cost)) return false;    // sin estamina
  S.setCooldown(sk.id, sk.cd);
  requestCombo(sk.moveId);                   // el Player lo ejecuta (y gasta estamina)
  return true;
}

// ============================================================
// SKILLS DE NEN (aura) — DORMIDAS hasta activar el sistema de Nen.
// No se muestran en la barra. Se conservan para reactivarlas.
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

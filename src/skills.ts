import * as THREE from "three";
import { useRPG } from "./store";
import { hitInRadius } from "./damage";
import { startSwing } from "./combat";

export type Skill = {
  id: string;
  name: string;
  code: string;   // KeyboardEvent.code
  keyLabel: string;
  icon: string;
  cost: number;   // aura
  cd: number;     // cooldown en segundos
  desc: string;
  effect: (pos: THREE.Vector3) => void;
};

// Skills genéricas. Cuando entre el sistema de aura/afinidades (Nen), cada una
// se etiqueta con su categoría (Reforzador, Emisor, etc.) y de ahí salen ramas.
export const SKILLS: Skill[] = [
  {
    id: "embate", name: "Embate", code: "Digit1", keyLabel: "1", icon: "🌀",
    cost: 25, cd: 4, desc: "Golpe en área a tu alrededor.",
    effect: (pos) => {
      startSwing();
      hitInRadius(pos, 3.8, 30, { knockback: 1.2 });
      const S = useRPG.getState();
      S.setHitStop(0.1); S.shake();
      S.addFloater({ pos: [pos.x, pos.y + 2.2, pos.z], text: "EMBATE", kind: "aura" });
    },
  },
  {
    id: "onda", name: "Onda", code: "Digit2", keyLabel: "2", icon: "💢",
    cost: 35, cd: 6, desc: "Onda expansiva de mayor alcance.",
    effect: (pos) => {
      startSwing();
      hitInRadius(pos, 7, 22, { knockback: 1.8, critChance: 0.28 });
      const S = useRPG.getState();
      S.setHitStop(0.08); S.shake();
      S.addFloater({ pos: [pos.x, pos.y + 2.2, pos.z], text: "ONDA", kind: "aura" });
    },
  },
  {
    id: "furia", name: "Furia", code: "Digit3", keyLabel: "3", icon: "🔥",
    cost: 50, cd: 12, desc: "Duplica tu daño por 6s.",
    effect: (pos) => {
      const S = useRPG.getState();
      S.buff(2, 6); S.shake();
      S.addFloater({ pos: [pos.x, pos.y + 2.4, pos.z], text: "¡FURIA! x2", kind: "aura" });
    },
  },
];

const byCode = new Map(SKILLS.map((s) => [s.code, s]));

/** Intenta usar una skill por code de tecla. Devuelve true si se ejecutó. */
export function useSkillByCode(code: string, pos: THREE.Vector3): boolean {
  const sk = byCode.get(code);
  if (!sk) return false;
  const S = useRPG.getState();
  if (!S.ready(sk.id)) return false;     // en cooldown
  if (!S.spendAura(sk.cost)) return false; // sin aura
  S.setCooldown(sk.id, sk.cd);
  sk.effect(pos);
  return true;
}

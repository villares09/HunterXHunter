import type { Character, CharInit } from "./store";
import { CATEGORIES } from "./data/quiz";

/** Deriva vida/aura/daño iniciales a partir de los stats y la categoría. */
export function computeInit(derived: Record<string, number>, categoryId: string): CharInit {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  const p = cat?.passive ?? {};
  return {
    maxHp: Math.round((derived["Vida Total"] ?? 100) * (p.hpMult ?? 1)),
    maxAura: Math.round(Math.max(40, (derived.Nen ?? 10) * 4) * (p.auraMult ?? 1)),
    baseDmg: Math.max(6, derived["Daño"] ?? 12),
    passiveDmg: p.dmgMult ?? 1,
  };
}

export type SavedCharacter = Character & { id: string; createdAt: number };

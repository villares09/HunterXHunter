import type { Character, CharInit } from "./store";
import { CATEGORIES } from "./data/quiz";

/** Deriva vida/aura/daño/estamina iniciales a partir de los stats y la categoría. */
export function computeInit(
  derived: Record<string, number>,
  categoryId: string,
  stats?: Record<string, number>
): CharInit {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  const p = cat?.passive ?? {};

  // Estamina: usa el derived si existe (personaje nuevo). Si es un personaje VIEJO
  // (guardado antes de tener Estamina), la recalcula de los atributos guardados.
  const est =
    derived["Estamina"] ??
    Math.round(20 + (stats?.resistencia ?? 0) * 5 + (stats?.agilidad ?? 0) * 3);

  return {
    maxHp: Math.round((derived["Vida Total"] ?? 100) * (p.hpMult ?? 1)),
    maxAura: Math.round(Math.max(40, (derived.Nen ?? 10) * 4) * (p.auraMult ?? 1)),
    baseDmg: Math.max(6, derived["Daño"] ?? 12),
    passiveDmg: p.dmgMult ?? 1,
    maxStamina: Math.max(20, est),
  };
}

export type SavedCharacter = Character & { id: string; createdAt: number };

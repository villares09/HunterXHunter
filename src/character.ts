import type { Character, CharInit } from "@/store";
import { CATEGORIES } from "@/data/quiz";

// ============================================================
// DERIVACIÓN DE STATS — fuente única de verdad
// ============================================================
// Antes vivía dentro de Onboarding.tsx. Se movió acá para que TANTO el onboarding
// (definir stats base) COMO el motor de progresión (gastar puntos por nivel) usen
// la MISMA fórmula. Una sola copia = no se desincronizan.
export function derive(e: Record<string, number>): Record<string, number> {
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

// ============================================================
// PROGRESIÓN — Nivel de Personaje (Fase 2)
// ============================================================
// El "Nivel de Personaje" es el cimiento del sistema Nen del doc de diseño:
// la fórmula del MOP lo consume (MOP = base + Nivel*50 + ...). Por eso la curva
// vive acá, junto a las reglas del personaje, y no en el store (que solo la usa).

/** EXP acumulada que hay que juntar para pasar de `level` al siguiente. Curva "mediana". */
export const EXP_BASE = 100;   // perilla de calibración
export const EXP_EXP = 1.5;    // perilla de calibración (1 = lineal, 2 = cuadrática)

export function expToNext(level: number): number {
  return Math.floor(EXP_BASE * Math.pow(level, EXP_EXP));
}

/** Puntos de atributo libres que otorga CADA subida de nivel (Fase 2c). */
export const POINTS_PER_LEVEL = 2;

/**
 * Suma `gain` de EXP a un nivel/exp actual y resuelve las subidas de nivel
 * (soporta subir varios niveles de un saque si el gain es grande).
 * Devuelve el nuevo estado y cuántos niveles subió (para loguear/festejar).
 */
export function applyExp(
  level: number,
  exp: number,
  gain: number
): { level: number; exp: number; levelsGained: number } {
  let lv = level;
  let xp = exp + Math.max(0, Math.round(gain));
  let gained = 0;
  let need = expToNext(lv);
  while (xp >= need) {
    xp -= need;
    lv += 1;
    gained += 1;
    need = expToNext(lv);
  }
  return { level: lv, exp: xp, levelsGained: gained };
}

// ============================================================
// GASTO DE PUNTOS (Fase 2c) — asignar un punto a un atributo
// ============================================================

/** Los 6 atributos crudos que el jugador puede subir con puntos. */
export const RAW_STATS = [
  "fuerza", "agilidad", "resistencia", "inteligencia", "percepcion", "carisma",
] as const;
export type RawStat = typeof RAW_STATS[number];

/**
 * Gasta UN punto en un atributo: sube el stat crudo +1, re-deriva TODO,
 * descuenta 1 de `unspent`. Función pura: devuelve un Character nuevo.
 * Si no hay puntos o el attr es inválido, devuelve el char sin cambios.
 */
export function spendPoint(char: Character, attr: RawStat): Character {
  if ((char.unspent ?? 0) <= 0) return char;
  if (!RAW_STATS.includes(attr)) return char;

  const stats = { ...char.stats, [attr]: (char.stats[attr] ?? 0) + 1 };
  const derived = derive(stats);
  return { ...char, stats, derived, unspent: (char.unspent ?? 0) - 1 };
}

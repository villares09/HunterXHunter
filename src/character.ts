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

// ============================================================
// EXP ESCALADA POR DIFERENCIA DE NIVEL (Fase 3)
// ============================================================
// Regla: los enemigos tienen nivel FIJO (no escalan con el jugador). Lo que escala
// es la RECOMPENSA: cuanto más por encima del enemigo estás, menos EXP te da.
// Esto premia el progreso del jugador en vez de compensarlo (anti-patrón del
// scaling global). Caída LINEAL con piso.
//
// diff = nivelJugador - nivelEnemigo
//   diff <= 0  → 100% (enemigo igual o más fuerte: sin bonus, sin castigo)
//   diff  > 0  → 1 - diff*STEP, con piso EXP_FLOOR
//
// Tabla con los valores actuales (STEP 0.12, FLOOR 0.15):
//   diff:  0    1    2    3    4    5    6    7    8+
//   mult: 100%  88%  76%  64%  52%  40%  28%  16%  15%

/** Cuánto % de EXP se pierde por cada nivel de diferencia a favor del jugador. */
export const EXP_DIFF_STEP = 0.12;  // perilla de calibración
/** Multiplicador mínimo: por más diferencia que haya, el enemigo siempre da algo. */
export const EXP_FLOOR = 0.15;      // perilla de calibración

/** Multiplicador de EXP puro (0..1) según la diferencia de nivel. Función pura. */
export function expMultiplier(playerLevel: number, enemyLevel: number): number {
  const diff = playerLevel - enemyLevel;
  if (diff <= 0) return 1;
  return Math.max(EXP_FLOOR, 1 - diff * EXP_DIFF_STEP);
}

/**
 * EXP final que otorga un enemigo, ya escalada y redondeada.
 * Piso duro de 1: si el enemigo da EXP base > 0, nunca devuelve 0 por redondeo.
 * Esta es la función que consume `damage.ts` al matar.
 */
export function scaledExp(
  baseExp: number,
  playerLevel: number,
  enemyLevel: number
): number {
  if (baseExp <= 0) return 0;
  const scaled = baseExp * expMultiplier(playerLevel, enemyLevel);
  return Math.max(1, Math.round(scaled));
}
// ============================================================
// COLOR POR DIFERENCIA DE NIVEL (Fase 3 — Bloque 2)
// ============================================================
// OJO: esta escala comunica PELIGRO, no recompensa. No coincide con la curva de
// EXP y no tiene por qué: la EXP la ves en el floater al matar. El nameplate
// responde a "¿me conviene pelear esto?". Un solo significado por color.
//
// diff = nivelJugador - nivelEnemigo
//   diff <= -8   rojo      te mata
//   -7 .. -3     naranja   peligroso
//   -2 .. +2     amarillo  parejo
//   +3 .. +7     verde     fácil
//   diff >= +8   gris      trivial

export const LEVEL_COLORS = {
  deadly:  "#ff4d4d",
  hard:    "#ff9a3c",
  even:    "#ffd479",  // el dorado que ya tenía el LVL: "parejo" se ve igual que hoy
  easy:    "#5ddd5d",
  trivial: "#9aa4ad",
} as const;

/** Color del LVL de un enemigo según qué tan peligroso es para el jugador. Función pura. */
export function levelColor(playerLevel: number, enemyLevel: number): string {
  const diff = playerLevel - enemyLevel;
  if (diff <= -8) return LEVEL_COLORS.deadly;
  if (diff <= -3) return LEVEL_COLORS.hard;
  if (diff <= 2) return LEVEL_COLORS.even;
  if (diff <= 7) return LEVEL_COLORS.easy;
  return LEVEL_COLORS.trivial;
}

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

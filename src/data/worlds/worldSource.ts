import { WORLDS, ACTIVE_WORLD } from "./registry";

/** Editores de escena: usan el localStorage (borrador) como fuente del mundo.
 *  Sumá acá un editor nuevo (ej: "events") y los tres chequeos de abajo lo heredan. */
export const EDITOR_PARAMS = ["edit", "sculpt", "draw", "path", "forest", "rocks"] as const;

/** Modos que NO son el juego = editores de escena + Panel de Mundo (export). */
export const NON_GAME_PARAMS = [...EDITOR_PARAMS, "export"] as const;

function hasAnyParam(keys: readonly string[]): boolean {
  if (typeof window === "undefined") return false;
  const p = new URLSearchParams(location.search);
  return keys.some((k) => p.has(k));
}

/** ¿Estás en algún editor de escena o en el Panel de Mundo (no en el juego)?
 *  Sirve para saltear select/onboarding y no montar el HUD de juego. */
export function inEditor(): boolean {
  return hasAnyParam(NON_GAME_PARAMS);
}

/** ¿La fuente de datos es el localStorage (borrador) en vez del JSON horneado?
 *  Sí en cualquier editor de escena Y en modo test (caminar el borrador sin hornear). */
export function useLocalSource(): boolean {
  return hasAnyParam([...EDITOR_PARAMS, "test"]);
}

/** @deprecated usá useLocalSource — se mantiene por compatibilidad */
export function isEditMode(): boolean {
  return useLocalSource();
}

/** Capa horneada del mundo activo, o null si no está. */
export function worldLayer(key: string): unknown {
  return WORLDS[ACTIVE_WORLD]?.[key] ?? null;
}
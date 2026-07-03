import { WORLDS, ACTIVE_WORLD } from "./registry";

/** Params de URL que indican que estás editando. */
const EDIT_PARAMS = ["edit", "sculpt", "draw", "path", "forest", "rocks"] as const;

/** ¿La fuente de datos es el localStorage (borrador) en vez del JSON horneado?
 *  Sí en cualquier editor Y en modo test (para caminar el borrador sin hornear). */
export function useLocalSource(): boolean {
  if (typeof window === "undefined") return false;
  const p = new URLSearchParams(location.search);
  return EDIT_PARAMS.some((k) => p.has(k)) || p.has("test");
}

/** @deprecated usá useLocalSource — se mantiene por compatibilidad */
export function isEditMode(): boolean {
  return useLocalSource();
}

/** Capa horneada del mundo activo, o null si no está. */
export function worldLayer(key: string): unknown {
  return WORLDS[ACTIVE_WORLD]?.[key] ?? null;
}

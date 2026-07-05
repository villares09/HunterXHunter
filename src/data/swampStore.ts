import { create } from "zustand";
import { isEditMode, worldLayer } from "@/data/worlds/worldSource";

export type Swamp = {
  id: string;
  center: [number, number]; // (x, z) del pozo del pantano
  radius: number;
  waterY: number | null;    // null = default histórico (lo resuelve SwampWater)
};

const LS_KEY = "mc-swamp";

/* ====== pantano legacy de Isla Ballena ======
   Es lo que estaba hardcodeado en SwampWater.tsx (center 107,39 · radio 53).
   Vive acá SOLO para poder hornearlo al world.json (ver flujo de migración).
   Cuando ya esté en tu JSON, borrá este SEED y quedará 100% dependiente del mundo. */
const SEED: Swamp[] = [];

let _n = 0;
const newId = () => `sw${Date.now().toString(36)}${_n++}`;

/* normaliza cada registro con fallbacks (tolera JSON viejo o incompleto) */
function normalize(raw: unknown): Swamp[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const c = o.center as unknown;
    const center: [number, number] =
      Array.isArray(c) && c.length >= 2 ? [Number(c[0]) || 0, Number(c[1]) || 0] : [0, 0];
    const radius = typeof o.radius === "number" ? o.radius : 40;
    const waterY = typeof o.waterY === "number" ? o.waterY : null;
    const id = typeof o.id === "string" ? o.id : newId();
    return { id, center, radius, waterY };
  });
}

/* desenvuelve array pelado (formato de las demás capas) o wrappers por las dudas */
function unwrap(raw: unknown): Swamp[] {
  if (Array.isArray(raw)) return normalize(raw);
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.swamps)) return normalize(o.swamps);
    const st = o.state as Record<string, unknown> | undefined;
    if (st && Array.isArray(st.swamps)) return normalize(st.swamps);
  }
  return [];
}

function load(): Swamp[] {
  if (isEditMode()) {
    // TALLER: localStorage (borrador).
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) {
        try { return unwrap(JSON.parse(raw)); } catch { /* cae al seed */ }
      }
    }
    return SEED;
  }
  // JUEGO: la capa horneada del JSON. Sin capa → sin pantano (viaja con el mundo).
  return unwrap(worldLayer(LS_KEY));
}

type State = { swamps: Swamp[] };

export const useSwamp = create<State>()(() => ({ swamps: load() }));

/** acceso no-reactivo por si algún sistema lo necesita fuera de React */
export function getSwamps(): Swamp[] {
  return useSwamp.getState().swamps;
}
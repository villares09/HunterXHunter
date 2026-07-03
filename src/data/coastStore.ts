import { create } from "zustand";
import { isEditMode, worldLayer } from "@/data/worlds/worldSource";

/* =========================================================================
   COSTA editable. Guardada NORMALIZADA ([-~1..~1]). Por defecto = el trazado
   de 84 puntos. Si dibujás una nueva con ?draw, se sobreescribe y persiste.
   Island.ts lee de acá (no más constante hardcodeada).
   ========================================================================= */

const DEFAULT_NORM: [number, number][] = [
  [-0.1893, -0.7714], [-0.1411, -0.7417], [-0.0970, -0.7506], [-0.0518, -0.6958],
  [-0.0280, -0.6851], [0.0137, -0.6077], [0.0702, -0.5631], [0.0982, -0.5250],
  [0.1488, -0.5310], [0.1958, -0.4946], [0.2560, -0.4458], [0.2833, -0.4054],
  [0.3185, -0.3381], [0.3435, -0.3054], [0.3631, -0.2708], [0.4470, -0.2440],
  [0.5095, -0.2083], [0.7024, -0.0548], [0.7262, -0.0583], [0.7649, -0.0387],
  [0.8137, -0.0345], [0.8923, -0.0113], [0.9429, 0.0232], [0.9750, 0.0595],
  [0.9952, 0.0952], [1.0167, 0.1446], [1.0048, 0.2595], [0.9470, 0.3357],
  [0.8940, 0.3708], [0.8065, 0.3750], [0.6560, 0.4607], [0.6095, 0.4702],
  [0.5732, 0.4696], [0.5208, 0.5036], [0.4214, 0.4560], [0.3357, 0.4315],
  [0.2905, 0.4208], [0.2375, 0.4351], [0.1857, 0.4738], [0.1583, 0.4732],
  [0.1369, 0.4952], [0.0976, 0.5202], [0.0655, 0.5327], [0.0220, 0.5429],
  [-0.0143, 0.5548], [-0.0851, 0.5637], [-0.1304, 0.5780], [-0.1458, 0.5554],
  [-0.1994, 0.5274], [-0.2357, 0.5310], [-0.2810, 0.5119], [-0.3375, 0.5149],
  [-0.3923, 0.5310], [-0.4536, 0.5071], [-0.5262, 0.4607], [-0.5738, 0.4524],
  [-0.6488, 0.4637], [-0.7173, 0.4173], [-0.7661, 0.3643], [-0.7940, 0.3250],
  [-0.8458, 0.2464], [-0.9000, 0.2036], [-0.9357, 0.1589], [-0.9190, 0.0899],
  [-0.9077, 0.0571], [-0.9173, -0.0345], [-0.9446, -0.0988], [-0.9292, -0.1488],
  [-0.9089, -0.1815], [-0.8929, -0.2101], [-0.8494, -0.2786], [-0.8077, -0.3262],
  [-0.8101, -0.4589], [-0.7375, -0.5685], [-0.6774, -0.6119], [-0.6244, -0.6256],
  [-0.5619, -0.6369], [-0.5083, -0.6655], [-0.4792, -0.6976], [-0.4429, -0.7173],
  [-0.3964, -0.7488], [-0.3256, -0.7750], [-0.2554, -0.7554], [-0.1964, -0.7792],
];

const LS = "mc-coast";

let NORM: [number, number][] | null = null;
let VERSION = 0;

function load() {
  if (NORM) return;
  if (isEditMode()) {
    // TALLER: tu borrador en localStorage, o el default de fábrica (igual que antes)
    if (typeof window !== "undefined") {
      const s = window.localStorage.getItem(LS);
      if (s) {
        try { NORM = JSON.parse(s) as [number, number][]; return; } catch { /* cae a default */ }
      }
    }
    NORM = DEFAULT_NORM;
    return;
  }
  // JUEGO: la capa horneada, o el default si falta
  const baked = worldLayer(LS);
  if (baked) { NORM = baked as [number, number][]; return; }
  NORM = DEFAULT_NORM;
}

export function getCoastNorm(): [number, number][] { load(); return NORM!; }
export function coastVersion(): number { return VERSION; }

/** recibe puntos YA normalizados (world / WORLD_S) */
export function setCoastNorm(norm: [number, number][]) {
  NORM = norm;
  VERSION++;
  if (typeof window !== "undefined") window.localStorage.setItem(LS, JSON.stringify(norm));
  useCoast.getState().bump();
}

export function resetCoast() {
  NORM = DEFAULT_NORM;
  VERSION++;
  if (typeof window !== "undefined") window.localStorage.removeItem(LS);
  useCoast.getState().bump();
}

type CState = { rev: number; bump: () => void };
export const useCoast = create<CState>((set) => ({ rev: 0, bump: () => set((s) => ({ rev: s.rev + 1 })) }));

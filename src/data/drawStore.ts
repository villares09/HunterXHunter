import { create } from "zustand";
import { WORLD_S } from "./island";
import { setCoastNorm } from "./coastStore";
import { resetFlat } from "./terrainStore";

type DState = {
  points: [number, number][]; // world (x, z)
  mapOpacity: number;
  add: (p: [number, number]) => void;
  undo: () => void;
  clear: () => void;
  setOpacity: (v: number) => void;
};

export const useDraw = create<DState>((set) => ({
  points: [],
  mapOpacity: 0.9,
  add: (p) => set((s) => ({ points: [...s.points, p] })),
  undo: () => set((s) => ({ points: s.points.slice(0, -1) })),
  clear: () => set({ points: [] }),
  setOpacity: (mapOpacity) => set({ mapOpacity }),
}));

/** normaliza los puntos dibujados (÷WORLD_S), los aplica como costa y rearma el terreno plano */
export function applyDrawnCoast() {
  const { points } = useDraw.getState();
  if (points.length < 3) { alert("Marcá al menos 3 puntos del contorno."); return; }
  const norm = points.map(([x, z]) => [x / WORLD_S, z / WORLD_S] as [number, number]);
  setCoastNorm(norm);
  resetFlat();
  alert("✓ Costa aplicada. Andá a ?sculpt para darle altura.");
}

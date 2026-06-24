import { create } from "zustand";
import { paintBiomePath, BIOME_ROAD } from "./terrainStore";

type PState = {
  points: [number, number][]; // world (x, z)
  width: number;
  biome: number;
  mapOpacity: number;
  add: (p: [number, number]) => void;
  undo: () => void;
  clear: () => void;
  setWidth: (v: number) => void;
  setBiome: (b: number) => void;
  setOpacity: (v: number) => void;
};

export const usePath = create<PState>((set) => ({
  points: [],
  width: 6,
  biome: BIOME_ROAD,
  mapOpacity: 0.6,
  add: (p) => set((s) => ({ points: [...s.points, p] })),
  undo: () => set((s) => ({ points: s.points.slice(0, -1) })),
  clear: () => set({ points: [] }),
  setWidth: (width) => set({ width }),
  setBiome: (biome) => set({ biome }),
  setOpacity: (mapOpacity) => set({ mapOpacity }),
}));

/** pinta el bioma elegido en una franja a lo largo de la línea dibujada */
export function applyPath() {
  const { points, width, biome } = usePath.getState();
  if (points.length < 2) { alert("Marcá al menos 2 puntos del camino."); return; }
  paintBiomePath(points, width, biome);
}

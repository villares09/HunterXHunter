import { create } from "zustand";
import { OCEAN_Y } from "./island";
import { heightAt } from "./terrainStore";

export type Tree = { id: string; species: string; x: number; z: number; rot: number; scale: number };
export type ForestSet = "bosque" | "pantano" | "pastoAlto" | "flores" | "arbustos" | "mixto";

type SpeciesDef = { propId: string; weight: number; scale: [number, number] };
/* cada set: lista de especies con peso + su separación mínima propia (minDist).
   árboles -> separación grande; flora -> chica (se amontona). */
type SetDef = { minDist: number; species: SpeciesDef[] };

const SETS: Record<ForestSet, SetDef> = {
  bosque: {
    minDist: 3,
    species: [
      { propId: "arbolNormal", weight: 0.55, scale: [0.9, 1.4] },
      { propId: "arbolFrutal", weight: 0.45, scale: [0.9, 1.3] },
    ],
  },
  pantano: {
    minDist: 3,
    species: [
      { propId: "arbolLaguna", weight: 0.45, scale: [0.9, 1.3] },
      { propId: "arbolMaestroPantano", weight: 0.35, scale: [0.5, 0.7] },
      { propId: "arbolNormal", weight: 0.20, scale: [0.9, 1.3] },
    ],
  },
  pastoAlto: {
    minDist: 1,
    species: [
      { propId: "grassTall", weight: 0.4, scale: [0.8, 1.4] },
      { propId: "grassWispy", weight: 0.35, scale: [0.8, 1.4] },
      { propId: "grassShort", weight: 0.25, scale: [0.8, 1.3] },
    ],
  },
  flores: {
    minDist: 1.2,
    species: [
      { propId: "flower3", weight: 0.3, scale: [0.8, 1.3] },
      { propId: "flower4", weight: 0.3, scale: [0.8, 1.3] },
      { propId: "clover", weight: 0.2, scale: [0.8, 1.2] },
      { propId: "grassShort", weight: 0.2, scale: [0.7, 1.2] },
    ],
  },
  arbustos: {
    minDist: 2.2,
    species: [
      { propId: "bushCommon", weight: 0.4, scale: [0.8, 1.3] },
      { propId: "bushFlowers", weight: 0.3, scale: [0.8, 1.3] },
      { propId: "fern", weight: 0.3, scale: [0.8, 1.3] },
    ],
  },
  mixto: {
    minDist: 1.4,
    species: [
      { propId: "grassTall", weight: 0.3, scale: [0.8, 1.4] },
      { propId: "flower3", weight: 0.15, scale: [0.8, 1.3] },
      { propId: "flower4", weight: 0.15, scale: [0.8, 1.3] },
      { propId: "fern", weight: 0.15, scale: [0.8, 1.3] },
      { propId: "plant1", weight: 0.15, scale: [0.8, 1.3] },
      { propId: "clover", weight: 0.10, scale: [0.8, 1.2] },
    ],
  },
};

// todas las especies usadas en cualquier set (para instanciar/precargar)
export const FOREST_SPECIES = Array.from(
  new Set(Object.values(SETS).flatMap((s) => s.species.map((d) => d.propId)))
);

const DRY_LEVEL = OCEAN_Y + 0.3;
const LS_KEY = "mc-forest";

let TREES: Tree[] | null = null;
let _n = 0;
const newId = () => `t${Date.now().toString(36)}${_n++}`;

function load() {
  if (TREES) return;
  if (typeof window !== "undefined") {
    const s = window.localStorage.getItem(LS_KEY);
    if (s) { try { TREES = JSON.parse(s) as Tree[]; return; } catch { /* vacío */ } }
  }
  TREES = [];
}
function ensure() { if (!TREES) load(); }
export function getTrees(): Tree[] { ensure(); return TREES!; }

let _save: ReturnType<typeof setTimeout> | null = null;
function saveDebounced() {
  if (typeof window === "undefined") return;
  if (_save) clearTimeout(_save);
  _save = setTimeout(() => window.localStorage.setItem(LS_KEY, JSON.stringify(TREES)), 400);
}

function pickSpecies(set: ForestSet): SpeciesDef {
  const list = SETS[set].species;
  const total = list.reduce((a, d) => a + d.weight, 0);
  let r = Math.random() * total;
  for (const d of list) { r -= d.weight; if (r <= 0) return d; }
  return list[0];
}

export function plant(x: number, z: number) {
  ensure();
  const { radius, density, set } = useForest.getState();
  const minDist = SETS[set].minDist;
  const md2 = minDist * minDist;
  for (let a = 0; a < density; a++) {
    const ang = Math.random() * Math.PI * 2;
    const rr = radius * Math.sqrt(Math.random());
    const px = x + Math.cos(ang) * rr, pz = z + Math.sin(ang) * rr;
    if (heightAt(px, pz) < DRY_LEVEL) continue;
    let tooClose = false;
    for (const t of TREES!) {
      if ((t.x - px) ** 2 + (t.z - pz) ** 2 < md2) { tooClose = true; break; }
    }
    if (tooClose) continue;
    const sp = pickSpecies(set);
    const scale = sp.scale[0] + Math.random() * (sp.scale[1] - sp.scale[0]);
    TREES!.push({ id: newId(), species: sp.propId, x: px, z: pz, rot: Math.random() * Math.PI * 2, scale });
  }
  useForest.getState().bump();
  saveDebounced();
}

export function erase(x: number, z: number) {
  ensure();
  const { radius } = useForest.getState();
  const r2 = radius * radius;
  TREES = TREES!.filter((t) => (t.x - x) ** 2 + (t.z - z) ** 2 > r2);
  useForest.getState().bump();
  saveDebounced();
}

export function clearForest() {
  TREES = [];
  if (typeof window !== "undefined") window.localStorage.removeItem(LS_KEY);
  useForest.getState().bump();
}

export function exportForest() {
  ensure();
  const blob = new Blob([JSON.stringify(TREES)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "forest.json"; a.click();
  URL.revokeObjectURL(url);
}

export function importForest(file: File) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(String(r.result)) as Tree[];
      if (Array.isArray(data)) { TREES = data; saveDebounced(); useForest.getState().bump(); }
    } catch { alert("No pude leer el forest.json."); }
  };
  r.readAsText(file);
}

type FState = {
  rev: number;
  set: ForestSet;
  mode: "plant" | "erase";
  radius: number;
  density: number;
  showMap: boolean;
  bump: () => void;
  setSet: (s: ForestSet) => void;
  setMode: (m: "plant" | "erase") => void;
  setRadius: (v: number) => void;
  setDensity: (v: number) => void;
  toggleMap: () => void;
};
export const useForest = create<FState>((set) => ({
  rev: 0,
  set: "bosque",
  mode: "plant",
  radius: 18,
  density: 4,
  showMap: false,
  bump: () => set((s) => ({ rev: s.rev + 1 })),
  setSet: (v) => set({ set: v }),
  setMode: (mode) => set({ mode }),
  setRadius: (radius) => set({ radius }),
  setDensity: (density) => set({ density }),
  toggleMap: () => set((s) => ({ showMap: !s.showMap })),
}));

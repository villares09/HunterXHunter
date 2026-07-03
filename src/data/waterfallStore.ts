import { create } from "zustand";
import { isEditMode, worldLayer } from "@/data/worlds/worldSource";

/* =========================================================================
   CASCADAS editables. Cada una se define por dos puntos del terreno:
     - top  (nacimiento): de dónde nace, arriba en el acantilado
     - pool (pozo):        dónde cae, abajo
   La orientación e inclinación se DERIVAN de esos dos puntos (ver Waterfall.tsx),
   así que no hay rotación manual. width = ancho del chorro (ajustable con slider).

   Fuente igual que los otros stores:
     - modo edición → localStorage (tu borrador)
     - modo juego   → world.json horneado
   ========================================================================= */

export type Waterfall = {
  id: string;
  top: [number, number];   // nacimiento (x, z)
  pool: [number, number];  // pozo (x, z)
  width: number;           // ancho del chorro
  cushion: number;         // altura sobre el terreno (evita que se hunda)
  topY: number | null;   // altura manual del nacimiento (null = del terreno)
  poolY: number | null;  // altura manual del pozo (null = del terreno)
};

export const DEFAULT_WIDTH = 5;
export const DEFAULT_CUSHION = 2;

const LS_KEY = "mc-waterfalls";

let FALLS: Waterfall[] | null = null;
let _n = 0;
const newId = () => `w${Date.now().toString(36)}${_n++}`;

function normalize(arr: Waterfall[]): Waterfall[] {
  return arr.map((w) => ({
    ...w,
    cushion: w.cushion ?? DEFAULT_CUSHION,
    width: w.width ?? DEFAULT_WIDTH,
    topY: w.topY ?? null,
    poolY: w.poolY ?? null,
  }));
}

export function setWaterfallTopY(id: string, y: number | null) {
  ensure();
  const w = FALLS!.find((f) => f.id === id);
  if (!w) return;
  w.topY = y;
  useWaterfalls.getState().bump();
  saveDebounced();
}

export function setWaterfallPoolY(id: string, y: number | null) {
  ensure();
  const w = FALLS!.find((f) => f.id === id);
  if (!w) return;
  w.poolY = y;
  useWaterfalls.getState().bump();
  saveDebounced();
}

function load() {
  if (FALLS) return;
  if (isEditMode()) {
    // TALLER: tu borrador en localStorage, o vacío
    if (typeof window !== "undefined") {
      const s = window.localStorage.getItem(LS_KEY);
      if (s) { try { FALLS = normalize(JSON.parse(s)); return; } catch { /* vacío */ } }
    }
    FALLS = [];
    return;
  }
  // JUEGO: capa horneada del world.json
  const baked = worldLayer(LS_KEY);
  if (Array.isArray(baked)) { FALLS = normalize(baked as Waterfall[]); return; }
  FALLS = [];
}
function ensure() { if (!FALLS) load(); }
export function getWaterfalls(): Waterfall[] { ensure(); return FALLS!; }

let _save: ReturnType<typeof setTimeout> | null = null;
function saveDebounced() {
  if (typeof window === "undefined") return;
  if (_save) clearTimeout(_save);
  _save = setTimeout(() => window.localStorage.setItem(LS_KEY, JSON.stringify(FALLS)), 400);
}

/** crea una cascada entre dos puntos del terreno. devuelve su id. */
export function addWaterfall(top: [number, number], pool: [number, number], width = DEFAULT_WIDTH): string {
  ensure();
  const id = newId();
  FALLS!.push({ id, top, pool, width, cushion: DEFAULT_CUSHION, topY: null, poolY: null });
  useWaterfalls.getState().bump();
  saveDebounced();
  return id;
}

export function setWaterfallCushion(id: string, cushion: number) {
  ensure();
  const w = FALLS!.find((f) => f.id === id);
  if (!w) return;
  w.cushion = cushion;
  useWaterfalls.getState().bump();
  saveDebounced();
}

export function removeWaterfall(id: string) {
  ensure();
  FALLS = FALLS!.filter((w) => w.id !== id);
  useWaterfalls.getState().bump();
  saveDebounced();
}

/** cambia el ancho de una cascada (para el slider del HUD). */
export function setWaterfallWidth(id: string, width: number) {
  ensure();
  const w = FALLS!.find((f) => f.id === id);
  if (!w) return;
  w.width = width;
  useWaterfalls.getState().bump();
  saveDebounced();
}

export function clearWaterfalls() {
  FALLS = [];
  if (typeof window !== "undefined") window.localStorage.removeItem(LS_KEY);
  useWaterfalls.getState().bump();
}

export function exportWaterfalls() {
  ensure();
  const blob = new Blob([JSON.stringify(FALLS)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "waterfalls.json"; a.click();
  URL.revokeObjectURL(url);
}

export function importWaterfalls(file: File) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(String(r.result)) as Waterfall[];
      if (Array.isArray(data)) { FALLS = data; saveDebounced(); useWaterfalls.getState().bump(); }
    } catch { alert("No pude leer el waterfalls.json."); }
  };
  r.readAsText(file);
}

/** mueve el nacimiento (top) o el pozo (pool) de una cascada. */
export function setWaterfallPoint(id: string, which: "top" | "pool", x: number, z: number) {
  ensure();
  const w = FALLS!.find((f) => f.id === id);
  if (!w) return;
  w[which] = [x, z];
  useWaterfalls.getState().bump();
  saveDebounced();
}

/* ===================== reactivo (rev + estado del editor) ===================== */
type WState = {
  rev: number;
  selected: string | null;     // cascada seleccionada en ?edit
  pendingTop: [number, number] | null; // primer click (nacimiento) esperando el pozo
  showMap: boolean;
  bump: () => void;
  setSelected: (id: string | null) => void;
  setPendingTop: (p: [number, number] | null) => void;
  toggleMap: () => void;
};
export const useWaterfalls = create<WState>((set) => ({
  rev: 0,
  selected: null,
  pendingTop: null,
  showMap: false,
  bump: () => set((s) => ({ rev: s.rev + 1 })),
  setSelected: (selected) => set({ selected }),
  setPendingTop: (pendingTop) => set({ pendingTop }),
  toggleMap: () => set((s) => ({ showMap: !s.showMap })),
}));

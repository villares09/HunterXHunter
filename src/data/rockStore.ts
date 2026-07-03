import { create } from "zustand";
import { heightAt } from "./terrainStore";
import { OCEAN_Y } from "./island";
import { isEditMode, worldLayer } from "@/data/worlds/worldSource";

/* cada roca guarda rotación en los 3 ejes + escala no uniforme (sx,sy,sz)
   para que con pocos modelos no se note la repetición. */
export type Rock = {
  id: string; species: string; x: number; z: number;
  rx: number; ry: number; rz: number; sx: number; sy: number; sz: number;
};
export type RockSet = "sueltas" | "muralla" | "piedritas";

type SpeciesDef = { propId: string; weight: number; scale: [number, number] };
const SETS: Record<RockSet, SpeciesDef[]> = {
  // rocas grandes desperdigadas
  sueltas: [
    { propId: "rockMedium1", weight: 0.34, scale: [0.35, 0.8] },
    { propId: "rockMedium2", weight: 0.33, scale: [0.35, 0.8] },
    { propId: "rockMedium3", weight: 0.33, scale: [0.35, 0.8] },
  ],
  // acantilados: grandes, densas, pegadas (+ muro invisible)
  muralla: [
    { propId: "rockMedium1", weight: 0.34, scale: [1.2, 2.4] },
    { propId: "rockMedium2", weight: 0.33, scale: [1.2, 2.4] },
    { propId: "rockMedium3", weight: 0.33, scale: [1.2, 2.4] },
  ],
  // piedritas chatas para bordear caminos
  piedritas: [
    { propId: "rockRound1", weight: 0.2, scale: [0.3, 0.6] },
    { propId: "rockRound2", weight: 0.2, scale: [0.3, 0.6] },
    { propId: "rockRound3", weight: 0.2, scale: [0.3, 0.6] },
    { propId: "rockSquare1", weight: 0.13, scale: [0.3, 0.6] },
    { propId: "rockSquare2", weight: 0.13, scale: [0.3, 0.6] },
    { propId: "rockSquare3", weight: 0.14, scale: [0.3, 0.6] },
  ],
};

export const ROCK_SPECIES = Array.from(
  new Set(Object.values(SETS).flatMap((s) => s.map((d) => d.propId)))
);

const DRY_LEVEL = OCEAN_Y + 0.1; // rocas pueden ir más al borde del agua que los árboles
const LS_KEY = "mc-rocks";

/* ===== tilt máximo (rad) por especie =====
   Las medianas son alargadas: con mucho tilt se levantan de una punta como subibaja.
   Las redondas/cuadradas chiquitas toleran tilt sin verse mal. */
function maxTiltFor(species: string): number {
  if (species.startsWith("rockMedium")) return 0.08; // casi derechas
  return 0;                                        // piedritas: algo de gracia
}

let ROCKS: Rock[] | null = null;
let _n = 0;
const newId = () => `r${Date.now().toString(36)}${_n++}`;

function load() {
  if (ROCKS) return;
  if (isEditMode()) {
    if (typeof window !== "undefined") {
      const s = window.localStorage.getItem(LS_KEY);
      if (s) { try { ROCKS = JSON.parse(s) as Rock[]; return; } catch { /* vacío */ } }
    }
    ROCKS = [];
    return;
  }
  // JUEGO: capa horneada
  const baked = worldLayer(LS_KEY);
  if (Array.isArray(baked)) { ROCKS = baked as Rock[]; return; }
  ROCKS = [];
}
function ensure() { if (!ROCKS) load(); }
export function getRocks(): Rock[] { ensure(); return ROCKS!; }

let _save: ReturnType<typeof setTimeout> | null = null;
function saveDebounced() {
  if (typeof window === "undefined") return;
  if (_save) clearTimeout(_save);
  _save = setTimeout(() => window.localStorage.setItem(LS_KEY, JSON.stringify(ROCKS)), 400);
}

function pickSpecies(set: RockSet): SpeciesDef {
  const list = SETS[set];
  const total = list.reduce((a, d) => a + d.weight, 0);
  let r = Math.random() * total;
  for (const d of list) { r -= d.weight; if (r <= 0) return d; }
  return list[0];
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeRock(species: string, x: number, z: number, base: number): Rock {
  const tilt = maxTiltFor(species); // inclinación máxima en X/Z según especie
  return {
    id: newId(), species, x, z,
    rx: rand(-tilt, tilt),
    ry: Math.random() * Math.PI * 2, // giro libre en Y (no afecta el apoyo)
    rz: rand(-tilt, tilt),
    sx: base * rand(0.85, 1.2),
    sy: base * rand(0.8, 1.25),
    sz: base * rand(0.85, 1.2),
  };
}

export function plant(x: number, z: number) {
  ensure();
  const { radius, density, set } = useRocks.getState();
  const minDist = set === "muralla" ? 2 : set === "piedritas" ? 1.2 : 4;
  for (let a = 0; a < density; a++) {
    const ang = Math.random() * Math.PI * 2;
    const rr = radius * Math.sqrt(Math.random());
    const px = x + Math.cos(ang) * rr, pz = z + Math.sin(ang) * rr;
    if (heightAt(px, pz) < DRY_LEVEL) continue;
    let tooClose = false;
    for (const t of ROCKS!) {
      if ((t.x - px) ** 2 + (t.z - pz) ** 2 < minDist * minDist) { tooClose = true; break; }
    }
    if (tooClose) continue;
    const sp = pickSpecies(set);
    const base = rand(sp.scale[0], sp.scale[1]);
    ROCKS!.push(makeRock(sp.propId, px, pz, base));
  }
  useRocks.getState().bump();
  saveDebounced();
}

export function erase(x: number, z: number) {
  ensure();
  const { radius } = useRocks.getState();
  const r2 = radius * radius;
  ROCKS = ROCKS!.filter((t) => (t.x - x) ** 2 + (t.z - z) ** 2 > r2);
  useRocks.getState().bump();
  saveDebounced();
}

/* ===== endereza las rocas YA plantadas =====
   Re-clampea rx/rz al tilt permitido de su especie, conservando posición y escala.
   Las que ya estaban casi derechas no cambian; las muy torcidas se enderezan. */
export function relevelRocks() {
  ensure();
  for (const r of ROCKS!) {
    const tilt = maxTiltFor(r.species);
    r.rx = Math.max(-tilt, Math.min(tilt, r.rx));
    r.rz = Math.max(-tilt, Math.min(tilt, r.rz));
  }
  useRocks.getState().bump();
  saveDebounced();
}

export function clearRocks() {
  ROCKS = [];
  if (typeof window !== "undefined") window.localStorage.removeItem(LS_KEY);
  useRocks.getState().bump();
}

export function exportRocks() {
  ensure();
  const blob = new Blob([JSON.stringify(ROCKS)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "rocks.json"; a.click();
  URL.revokeObjectURL(url);
}

export function importRocks(file: File) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(String(r.result)) as Rock[];
      if (Array.isArray(data)) { ROCKS = data; saveDebounced(); useRocks.getState().bump(); }
    } catch { alert("No pude leer el rocks.json."); }
  };
  r.readAsText(file);
}

type RState = {
  rev: number;
  set: RockSet;
  mode: "plant" | "erase";
  radius: number;
  density: number;
  showMap: boolean;
  bump: () => void;
  setSet: (s: RockSet) => void;
  setMode: (m: "plant" | "erase") => void;
  setRadius: (v: number) => void;
  setDensity: (v: number) => void;
  toggleMap: () => void;
};
export const useRocks = create<RState>((set) => ({
  rev: 0,
  set: "sueltas",
  mode: "plant",
  radius: 14,
  density: 3,
  showMap: false,
  bump: () => set((s) => ({ rev: s.rev + 1 })),
  setSet: (v) => set({ set: v }),
  setMode: (mode) => set({ mode }),
  setRadius: (radius) => set({ radius }),
  setDensity: (density) => set({ density }),
  toggleMap: () => set((s) => ({ showMap: !s.showMap })),
}));

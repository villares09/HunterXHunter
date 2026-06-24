import { create } from "zustand";
import { coastPolygon, isLand, OCEAN_Y } from "./island";

/* ===================== config ===================== */
const CELL = 10;
const MARGIN = 90;
const LAND_FLAT = 1.5;
const SHORE_Y = OCEAN_Y + 0.5;
const SHORE_W = 30;
const SEABED_SLOPE = 0.12, SEABED_MAX = 60;
const LS_KEY = "mc-heightmap";

export type BrushMode =
  | "raise" | "lower" | "flatten" | "smooth"
  | "paintGrass" | "paintRock" | "paintSnow" | "paintSand"
  | "paintSwamp" | "paintRoad" | "paintTown";

export type Meta = { x0: number; z0: number; cell: number; nx: number; nz: number };

/* bioma por vértice: 0 = automático, 1 = pasto, 2 = roca, 3 = nieve, 4 = arena */
export const BIOME_AUTO = 0, BIOME_GRASS = 1, BIOME_ROCK = 2, BIOME_SNOW = 3, BIOME_SAND = 4;
export const BIOME_SWAMP = 5, BIOME_ROAD = 6, BIOME_TOWN = 7;

const PAINT_ID: Record<string, number> = {
  paintGrass: BIOME_GRASS, paintRock: BIOME_ROCK, paintSnow: BIOME_SNOW, paintSand: BIOME_SAND,
  paintSwamp: BIOME_SWAMP, paintRoad: BIOME_ROAD, paintTown: BIOME_TOWN,
};

/* ===================== estado a nivel módulo ===================== */
let HEIGHTS: Float32Array | null = null;
let BIOME: Uint8Array | null = null;
let META: Meta | null = null;
let FLATTEN_LEVEL = LAND_FLAT;

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smoothstep = (t: number) => { t = clamp01(t); return t * t * (3 - 2 * t); };

function distToCoast(x: number, z: number): number {
  const p = coastPolygon();
  let m = Infinity;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const dx = b.x - a.x, dz = b.y - a.y, l2 = dx * dx + dz * dz || 1;
    let t = ((x - a.x) * dx + (z - a.y) * dz) / l2; t = clamp01(t);
    const d = Math.hypot(x - (a.x + t * dx), z - (a.y + t * dz));
    if (d < m) m = d;
  }
  return m;
}

function buildFlat() {
  const poly = coastPolygon();
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  poly.forEach((p) => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.y); maxZ = Math.max(maxZ, p.y); });
  const x0 = minX - MARGIN, z0 = minZ - MARGIN;
  const nx = Math.ceil((maxX + MARGIN - x0) / CELL), nz = Math.ceil((maxZ + MARGIN - z0) / CELL);
  META = { x0, z0, cell: CELL, nx, nz };
  const n = (nx + 1) * (nz + 1);
  HEIGHTS = new Float32Array(n);
  BIOME = new Uint8Array(n); // todo automático
  let k = 0;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + i * CELL, z = z0 + j * CELL;
      const d = distToCoast(x, z);
      HEIGHTS[k++] = isLand(x, z)
        ? SHORE_Y + smoothstep(d / SHORE_W) * (LAND_FLAT - SHORE_Y)
        : OCEAN_Y - Math.min(d, SEABED_MAX) * SEABED_SLOPE - 0.8;
    }
  }
}

function loadOrBuild() {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        const o = JSON.parse(saved) as { meta: Meta; heights: number[]; biome?: number[] };
        META = o.meta;
        HEIGHTS = Float32Array.from(o.heights);
        BIOME = o.biome ? Uint8Array.from(o.biome) : new Uint8Array(HEIGHTS.length);
        return;
      } catch { /* cae a flat */ }
    }
  }
  buildFlat();
}

function ensure() { if (!HEIGHTS || !META || !BIOME) loadOrBuild(); }

export function getMeta(): Meta { ensure(); return META!; }
export function getHeights(): Float32Array { ensure(); return HEIGHTS!; }
export function getBiome(): Uint8Array { ensure(); return BIOME!; }

/* ===================== sample bilineal — fuente de verdad de la altura ===================== */
export function heightAt(x: number, z: number): number {
  ensure();
  const m = META!, h = HEIGHTS!;
  const gx = (x - m.x0) / m.cell, gz = (z - m.z0) / m.cell;
  const i0 = Math.max(0, Math.min(m.nx - 1, Math.floor(gx)));
  const j0 = Math.max(0, Math.min(m.nz - 1, Math.floor(gz)));
  const fx = clamp01(gx - i0), fz = clamp01(gz - j0);
  const W = m.nx + 1;
  const a = h[j0 * W + i0], b = h[j0 * W + i0 + 1];
  const c = h[(j0 + 1) * W + i0], d = h[(j0 + 1) * W + i0 + 1];
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

/* ===================== persistencia (debounce) ===================== */
let _save: ReturnType<typeof setTimeout> | null = null;
function saveLocalDebounced() {
  if (typeof window === "undefined") return;
  if (_save) clearTimeout(_save);
  _save = setTimeout(() => {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ meta: META, heights: Array.from(HEIGHTS!), biome: Array.from(BIOME!) }));
  }, 400);
}

export function setFlattenLevel(v: number) { FLATTEN_LEVEL = v; }

/* ===================== pincel: altura O bioma según el modo ===================== */
export function sculpt(x: number, z: number) {
  ensure();
  const m = META!, h = HEIGHTS!, bio = BIOME!, W = m.nx + 1;
  const { radius, strength, mode } = useTerrain.getState();
  const paintId = PAINT_ID[mode];

  const i0 = Math.max(0, Math.floor((x - radius - m.x0) / m.cell));
  const i1 = Math.min(m.nx, Math.ceil((x + radius - m.x0) / m.cell));
  const j0 = Math.max(0, Math.floor((z - radius - m.z0) / m.cell));
  const j1 = Math.min(m.nz, Math.ceil((z + radius - m.z0) / m.cell));

  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const vx = m.x0 + i * m.cell, vz = m.z0 + j * m.cell;
      const dd = Math.hypot(vx - x, vz - z);
      if (dd > radius) continue;
      const idx = j * W + i;

      if (paintId !== undefined) { bio[idx] = paintId; continue; } // pintar bioma (set duro)

      const fall = smoothstep(1 - dd / radius);
      if (mode === "raise") h[idx] += strength * fall;
      else if (mode === "lower") h[idx] -= strength * fall;
      else if (mode === "flatten") h[idx] += (FLATTEN_LEVEL - h[idx]) * fall * 0.5;
      else { // smooth
        let sum = 0, n = 0;
        if (i > 0) { sum += h[idx - 1]; n++; }
        if (i < m.nx) { sum += h[idx + 1]; n++; }
        if (j > 0) { sum += h[idx - W]; n++; }
        if (j < m.nz) { sum += h[idx + W]; n++; }
        if (n) h[idx] += (sum / n - h[idx]) * fall * 0.6;
      }
    }
  }
  useTerrain.getState().bump();
  saveLocalDebounced();
}

/* ===================== pintar bioma a lo largo de una línea (caminos) ===================== */
export function paintBiomePath(pts: [number, number][], width: number, biomeId: number) {
  ensure();
  if (pts.length < 2) return;
  const m = META!, bio = BIOME!, W = m.nx + 1, r = width / 2;
  for (let j = 0; j <= m.nz; j++) {
    for (let i = 0; i <= m.nx; i++) {
      const vx = m.x0 + i * m.cell, vz = m.z0 + j * m.cell;
      let dmin = Infinity;
      for (let k = 0; k < pts.length - 1; k++) {
        const ax = pts[k][0], az = pts[k][1], bx = pts[k + 1][0], bz = pts[k + 1][1];
        const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
        let t = ((vx - ax) * dx + (vz - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(vx - (ax + t * dx), vz - (az + t * dz));
        if (d < dmin) dmin = d;
      }
      if (dmin <= r) bio[j * W + i] = biomeId;
    }
  }
  useTerrain.getState().bump();
  saveLocalDebounced();
}

export function resetFlat() {
  buildFlat();
  if (typeof window !== "undefined") window.localStorage.removeItem(LS_KEY);
  useTerrain.getState().bump();
}

export function exportHeightmap() {
  ensure();
  const blob = new Blob([JSON.stringify({ meta: META, heights: Array.from(HEIGHTS!), biome: Array.from(BIOME!) })], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "heightmap.json"; a.click();
  URL.revokeObjectURL(url);
}

export function importHeightmap(file: File) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const o = JSON.parse(String(r.result)) as { meta: Meta; heights: number[]; biome?: number[] };
      META = o.meta; HEIGHTS = Float32Array.from(o.heights);
      BIOME = o.biome ? Uint8Array.from(o.biome) : new Uint8Array(HEIGHTS.length);
      saveLocalDebounced(); useTerrain.getState().bump();
    } catch { alert("No pude leer el heightmap."); }
  };
  r.readAsText(file);
}

/* ===================== reactivo (rev + ajustes de pincel) ===================== */
type TState = {
  rev: number;
  radius: number;
  strength: number;
  mode: BrushMode;
  showMap: boolean;
  bump: () => void;
  setRadius: (v: number) => void;
  setStrength: (v: number) => void;
  setMode: (m: BrushMode) => void;
  toggleMap: () => void;
};
export const useTerrain = create<TState>((set) => ({
  rev: 0,
  radius: 40,
  strength: 1.2,
  mode: "raise",
  showMap: false,
  bump: () => set((s) => ({ rev: s.rev + 1 })),
  setRadius: (radius) => set({ radius }),
  setStrength: (strength) => set({ strength }),
  setMode: (mode) => set({ mode }),
  toggleMap: () => set((s) => ({ showMap: !s.showMap })),
}));

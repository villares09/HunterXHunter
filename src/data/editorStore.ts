import { create } from "zustand";
import { heightAt } from "./terrainStore";
import { isEditMode, worldLayer } from "@/data/worlds/worldSource";

export type Instance = {
  key: string;
  propId: string;
  pos: [number, number, number];
  rot: number; // yaw (radianes)
  scale: number;
};

export type Gizmo = "translate" | "rotate" | "scale";

const LS_KEY = "mc-world";

/* ====== seed inicial: tus landmarks legacy (NO se usa hoy) ======
   Se deja de referencia. Las instancias de Isla Ballena viven en el world.json.
   El editor arranca en [] sin borrador (respeta "Mundo nuevo" = lienzo en blanco). */
const SEED: Instance[] = [
  { key: "mito", propId: "casaPersonaje", pos: [-28.3, 0, -74.8], rot: Math.PI, scale: 1.9 },
  { key: "v1", propId: "casaNpc", pos: [78, 0, -22], rot: -0.6, scale: 1.6 },
  { key: "v2", propId: "casaNpc", pos: [90, 0, -8], rot: 1.2, scale: 1.5 },
  { key: "v3", propId: "casaNpc", pos: [100, 0, 4], rot: 2.4, scale: 1.6 },
  { key: "v4", propId: "casaNpc", pos: [108, 0, -4], rot: 0.4, scale: 1.5 },
  { key: "v5", propId: "casaNpc", pos: [83, 0, -12], rot: -1.1, scale: 1.5 },
  { key: "v6", propId: "casaNpc", pos: [104, 0, -8], rot: 0.8, scale: 1.6 },
  { key: "faro", propId: "faro", pos: [151.3, 0, 29.2], rot: 0, scale: 1.5 },
];
void SEED; // referencia; no se consume

let _n = 0;
const newKey = () => `i${Date.now().toString(36)}${_n++}`;

/* ====== fuente de datos (JSON horneado en juego / localStorage en editor) ======
   Desenvuelve cualquiera de los formatos que pudo quedar guardado:
     - array pelado           [...]                       (formato nuevo)
     - wrapper de zustand      { state:{ instances:[...] } } (persist viejo)
     - objeto suelto          { instances:[...] }          (por las dudas)
   Esto es lo que evita "vaciar landmarks": tu localStorage/world.json de hoy
   están en formato persist, y hay que leerlos bien antes de reescribir pelado. */
function unwrapInstances(raw: unknown): Instance[] {
  if (Array.isArray(raw)) return raw as Instance[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const st = o.state as Record<string, unknown> | undefined;
    if (st && Array.isArray(st.instances)) return st.instances as Instance[];
    if (Array.isArray(o.instances)) return o.instances as Instance[];
  }
  return [];
}

function load(): Instance[] {
  if (isEditMode()) {
    // TALLER: localStorage (borrador). Sin borrador → [] (idéntico a antes).
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) {
        try { return unwrapInstances(JSON.parse(raw)); } catch { /* cae a [] */ }
      }
    }
    return [];
  }
  // JUEGO: la capa horneada del JSON (unwrap soporta el wrapper persist viejo).
  return unwrapInstances(worldLayer(LS_KEY));
}

/* ====== persistencia (debounce, solo en editor) ======
   En modo juego NO escribe nada. Guarda SIEMPRE pelado (array de instances),
   consistente con las demás capas. */
let _save: ReturnType<typeof setTimeout> | null = null;
function save(instances: Instance[]) {
  if (typeof window === "undefined" || !isEditMode()) return;
  if (_save) clearTimeout(_save);
  _save = setTimeout(() => {
    window.localStorage.setItem(LS_KEY, JSON.stringify(instances));
  }, 250);
}

type State = {
  instances: Instance[];
  selected: string | null;
  gizmo: Gizmo;
  snap: boolean;
  showMap: boolean;
  spawn: [number, number, number];
  nudgeRadius: number;       // radio de la zona (ajustable con R/F)
  grabbed: string[] | null;  // keys "agarradas" (modo mover en bloque)
  setSelected: (k: string | null) => void;
  setGizmo: (g: Gizmo) => void;
  toggleSnap: () => void;
  toggleMap: () => void;
  commit: (key: string, pos: [number, number, number], rot: number, scale: number) => void;
  add: (propId: string) => void;
  setSpawn: (p: [number, number, number]) => void;
  remove: (key: string) => void;
  load: (instances: Instance[]) => void;
  setNudgeRadius: (r: number) => void;
  /* baja/sube en Y todo lo que esté dentro del radio (modo rápido sin agarrar) */
  nudgeArea: (cx: number, cz: number, radius: number, deltaY: number) => void;
  /* agarra (latch) las keys dentro del radio y CONGELA su Y (las saca del auto-posar)
     para que al moverlas no se hundan/reposen al terreno */
  grab: (cx: number, cz: number, radius: number) => void;
  release: () => void;
  /* mueve un set de keys en X/Y/Z (delta) */
  nudgeKeys: (keys: string[], dx: number, dy: number, dz: number) => void;
  anchorKeysTo: (keys: string[], y: number) => void;
};

export const useEditor = create<State>()((set, get) => ({
  instances: load(),
  selected: null,
  gizmo: "translate",
  snap: true,
  showMap: false,
  spawn: [0, 0, 0],
  nudgeRadius: 70,
  grabbed: null,
  setSelected: (selected) => set({ selected }),
  setGizmo: (gizmo) => set({ gizmo }),
  toggleSnap: () => set((s) => ({ snap: !s.snap })),
  toggleMap: () => set((s) => ({ showMap: !s.showMap })),
  commit: (key, pos, rot, scale) => {
    set((s) => ({ instances: s.instances.map((i) => (i.key === key ? { ...i, pos, rot, scale } : i)) }));
    save(get().instances);
  },
  add: (propId) => {
    set((s) => {
      const key = newKey();
      return { instances: [...s.instances, { key, propId, pos: s.spawn, rot: 0, scale: 1.5 }], selected: key };
    });
    save(get().instances);
  },
  setSpawn: (spawn) => set({ spawn }),
  remove: (key) => {
    set((s) => ({
      instances: s.instances.filter((i) => i.key !== key),
      selected: s.selected === key ? null : s.selected,
    }));
    save(get().instances);
  },
  load: (instances) => {
    set({ instances, selected: null, grabbed: null });
    save(get().instances);
  },
  setNudgeRadius: (nudgeRadius) => set({ nudgeRadius }),
  nudgeArea: (cx, cz, radius, deltaY) => {
    set((s) => {
      const r2 = radius * radius;
      return {
        instances: s.instances.map((i) => {
          const dx = i.pos[0] - cx, dz = i.pos[2] - cz;
          if (dx * dx + dz * dz > r2) return i;
          const yEff = i.pos[1] === 0 ? heightAt(i.pos[0], i.pos[2]) : i.pos[1];
          const pos: [number, number, number] = [i.pos[0], yEff + deltaY, i.pos[2]];
          return { ...i, pos };
        }),
      };
    });
    save(get().instances);
  },
  grab: (cx, cz, radius) => {
    set((s) => {
      const r2 = radius * radius;
      const keys: string[] = [];
      const instances = s.instances.map((i) => {
        const dx = i.pos[0] - cx, dz = i.pos[2] - cz;
        if (dx * dx + dz * dz > r2) return i;
        keys.push(i.key);
        // congelar Y: si está en auto (0) la resuelvo y la dejo explícita
        if (i.pos[1] === 0) {
          const y = heightAt(i.pos[0], i.pos[2]);
          return { ...i, pos: [i.pos[0], y, i.pos[2]] as [number, number, number] };
        }
        return i;
      });
      return { instances, grabbed: keys.length ? keys : null };
    });
    save(get().instances);
  },
  release: () => set({ grabbed: null }),
  nudgeKeys: (keys, dx, dy, dz) => {
    set((s) => {
      const setKeys = new Set(keys);
      return {
        instances: s.instances.map((i) => {
          if (!setKeys.has(i.key)) return i;
          const pos: [number, number, number] = [i.pos[0] + dx, i.pos[1] + dy, i.pos[2] + dz];
          return { ...i, pos };
        }),
      };
    });
    save(get().instances);
  },
  anchorKeysTo: (keys, y) => {
    set((s) => {
      const setKeys = new Set(keys);
      return {
        instances: s.instances.map((i) =>
          setKeys.has(i.key) ? { ...i, pos: [i.pos[0], y, i.pos[2]] as [number, number, number] } : i
        ),
      };
    });
    save(get().instances);
  },
}));

/* ====== export / import (legacy, sin cambios) ====== */
export function exportWorld(instances: Instance[]) {
  const blob = new Blob([JSON.stringify(instances, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "world.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importWorld(file: File, load: (i: Instance[]) => void) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(String(r.result)) as Instance[];
      if (Array.isArray(data)) load(data);
      else alert("El JSON no es una lista de instancias.");
    } catch {
      alert("No pude leer el JSON.");
    }
  };
  r.readAsText(file);
}

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { heightAt } from "./terrainStore";

export type Instance = {
  key: string;
  propId: string;
  pos: [number, number, number];
  rot: number; // yaw (radianes)
  scale: number;
};

export type Gizmo = "translate" | "rotate" | "scale";

/* ====== seed inicial: tus landmarks actuales (los reubicás con el gizmo) ======
   El resto (muelle, botes, juncos, rocas, bosque, foliage) sigue en World.tsx. */
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

let _n = 0;
const newKey = () => `i${Date.now().toString(36)}${_n++}`;

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

export const useEditor = create<State>()(
  persist(
    (set) => ({
      instances: [],
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
      commit: (key, pos, rot, scale) =>
        set((s) => ({ instances: s.instances.map((i) => (i.key === key ? { ...i, pos, rot, scale } : i)) })),
      add: (propId) =>
        set((s) => {
          const key = newKey();
          return { instances: [...s.instances, { key, propId, pos: s.spawn, rot: 0, scale: 1.5 }], selected: key };
        }),
      setSpawn: (spawn) => set({ spawn }),
      remove: (key) =>
        set((s) => ({
          instances: s.instances.filter((i) => i.key !== key),
          selected: s.selected === key ? null : s.selected,
        })),
      load: (instances) => set({ instances, selected: null, grabbed: null }),
      setNudgeRadius: (nudgeRadius) => set({ nudgeRadius }),
      nudgeArea: (cx, cz, radius, deltaY) =>
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
        }),
      grab: (cx, cz, radius) =>
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
        }),
      release: () => set({ grabbed: null }),
      nudgeKeys: (keys, dx, dy, dz) =>
        set((s) => {
          const setKeys = new Set(keys);
          return {
            instances: s.instances.map((i) => {
              if (!setKeys.has(i.key)) return i;
              const pos: [number, number, number] = [i.pos[0] + dx, i.pos[1] + dy, i.pos[2] + dz];
              return { ...i, pos };
            }),
          };
        }),
        anchorKeysTo: (keys, y) =>
        set((s) => {
          const setKeys = new Set(keys);
          return {
            instances: s.instances.map((i) =>
              setKeys.has(i.key) ? { ...i, pos: [i.pos[0], y, i.pos[2]] as [number, number, number] } : i
            ),
          };
        }),
    }),
    { name: "mc-world", version: 1 }
  )
);

/* ====== export / import ====== */
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

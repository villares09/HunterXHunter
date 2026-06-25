import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  setSelected: (k: string | null) => void;
  setGizmo: (g: Gizmo) => void;
  toggleSnap: () => void;
  toggleMap: () => void;
  commit: (key: string, pos: [number, number, number], rot: number, scale: number) => void;
  add: (propId: string) => void;
  setSpawn: (p: [number, number, number]) => void;
  remove: (key: string) => void;
  load: (instances: Instance[]) => void;
};

export const useEditor = create<State>()(
  persist(
    (set) => ({
      instances: SEED,
      selected: null,
      gizmo: "translate",
      snap: true,
      showMap: false,
      spawn: [0, 0, 0],
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
      load: (instances) => set({ instances, selected: null }),
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

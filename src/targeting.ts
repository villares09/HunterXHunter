import { create } from "zustand";
import * as THREE from "three";
import { registry } from "./registry";

export type TargetKind = "enemy" | "npc";
export type Target = { kind: TargetKind; id: number; name: string };

type TargetState = {
  target: Target | null;
  setTarget: (t: Target | null) => void;
  clear: () => void;
};

export const useTarget = create<TargetState>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
  clear: () => set({ target: null }),
}));

function enemyName(id: number): string {
  return registry.enemies.get(id)?.name ?? "Enemigo";
}

/* posición actual del target leída del registry (por frame). Singleton mutado:
   usar y soltar en el acto, no guardar la referencia. */
const _tp = new THREE.Vector3();
export function targetPos(): THREE.Vector3 | null {
  const t = useTarget.getState().target;
  if (!t) return null;
  if (t.kind === "enemy") {
    const en = registry.enemies.get(t.id);
    if (!en || !en.alive) return null; // murió/desapareció -> sin posición
    en.obj.getWorldPosition(_tp);
    return _tp;
  }
  return null; // npc: punto 8
}

/* raycast del click contra los enemigos vivos. Sube del mesh golpeado al obj
   registrado para devolver el Target tipado. */
const _list: THREE.Object3D[] = [];
const _map = new Map<THREE.Object3D, number>();
export function pickEnemy(raycaster: THREE.Raycaster): Target | null {
  _list.length = 0; _map.clear();
  registry.enemies.forEach((en) => {
    if (!en.alive) return;
    _list.push(en.obj);
    _map.set(en.obj, en.id);
  });
  if (!_list.length) return null;
  const hits = raycaster.intersectObjects(_list, true);

  if (!hits.length) return null;
  let o: THREE.Object3D | null = hits[0].object;
  while (o) {
    const id = _map.get(o);
    if (id !== undefined) return { kind: "enemy", id, name: enemyName(id) };
    o = o.parent;
  }
  return null;
}

/* Tab: cicla entre enemigos vivos, ordenados por cercanía al player (estilo L2). */
const _pp = new THREE.Vector3();
const _ep = new THREE.Vector3();
export function cycleTarget(): void {
  const alive: number[] = [];
  registry.enemies.forEach((en) => { if (en.alive) alive.push(en.id); });
  if (!alive.length) { useTarget.getState().clear(); return; }

  if (registry.player) {
    registry.player.getWorldPosition(_pp);
    alive.sort((a, b) => {
      const ea = registry.enemies.get(a)!.obj.getWorldPosition(_ep).distanceToSquared(_pp);
      const eb = registry.enemies.get(b)!.obj.getWorldPosition(_ep).distanceToSquared(_pp);
      return ea - eb;
    });
  } else {
    alive.sort((a, b) => a - b);
  }

  const cur = useTarget.getState().target;
  let idx = -1;
  if (cur && cur.kind === "enemy") idx = alive.indexOf(cur.id);
  const next = alive[(idx + 1) % alive.length];
  useTarget.getState().setTarget({ kind: "enemy", id: next, name: enemyName(next) });
}

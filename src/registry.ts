import * as THREE from "three";

// Registro NO reactivo de entidades. Lo usamos para leer posiciones cada frame
// (minimapa, detección de golpes) sin disparar re-renders de React.
export type EnemyEntry = {
  id: number;
  obj: THREE.Object3D;
  hp: number;
  maxHp: number;
  alive: boolean;
};

export const registry = {
  player: null as THREE.Object3D | null,
  enemies: new Map<number, EnemyEntry>(),
};

export function setPlayer(obj: THREE.Object3D | null) {
  registry.player = obj;
}
export function registerEnemy(e: EnemyEntry) {
  registry.enemies.set(e.id, e);
}
export function unregisterEnemy(id: number) {
  registry.enemies.delete(id);
}

let _id = 1;
export const nextId = () => _id++;

import * as THREE from "three";

// Registro NO reactivo de entidades. Lo usamos para leer posiciones cada frame
// (minimapa, detección de golpes) sin disparar re-renders de React.
export type EnemyEntry = {
  id: number;
  obj: THREE.Object3D;
  hp: number;
  maxHp: number;
  atk: number;      // ataque (tirada oso→jugador) — copiado de la EnemyDef al spawnear
  def: number;      // defensa (tirada jugador→oso) — copiado de la EnemyDef al spawnear
  absorb: number;   // absorción (resta al daño que recibe) — copiado de la EnemyDef al spawnear
  dmg: number;      // daño base al jugador — copiado de la EnemyDef al spawnear
  alive: boolean;
  name?: string; // para el nameplate de targeting
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

import * as THREE from "three";

export type MoveState = {
  dest: THREE.Vector3 | null;
  running: boolean;
  locomotion: "idle" | "walk" | "run";
  onArrive: (() => void) | null;
  stopDist: number;
};

export const move: MoveState = {
  dest: null,
  running: false,
  locomotion: "idle",
  onArrive: null,
  stopDist: 0.25,
};

export function requestMove(
  x: number,
  z: number,
  opts?: { onArrive?: () => void; stopDist?: number }
) {
  if (!move.dest) move.dest = new THREE.Vector3();
  move.dest.set(x, 0, z);
  move.onArrive = opts?.onArrive ?? null;
  move.stopDist = opts?.stopDist ?? 0.25;
}

export function stopMove() {
  move.dest = null;
  move.onArrive = null;
  move.locomotion = "idle";
}

// ===== AUTO-ATTACK L2 (Bloque 2) =====
export type AutoAttack = { active: boolean; enemyId: number | null };
export const auto: AutoAttack = { active: false, enemyId: null };
export function startAutoAttack(enemyId: number) { auto.active = true; auto.enemyId = enemyId; }
export function stopAutoAttack() { auto.active = false; auto.enemyId = null; }

// ===== SALTO (transform, arco vertical sumado al piso) =====
export const jump = { active: false, vy: 0, offset: 0 };
export const JUMP_VELOCITY = 6.5; // impulso inicial (ajustable)
export const GRAVITY = 18;        // gravedad de la parábola (ajustable)
export function startJump() {
  if (jump.active) return; // no doble salto
  jump.active = true;
  jump.vy = JUMP_VELOCITY;
  jump.offset = 0;
}

// ===== SLOT PENDIENTE (Bloque 3b) =====
// La barra/teclas marcan "quiero usar el slot X"; el Player lo lee y lo ejecuta
// (resuelve básico encadenado o combo, con acercamiento al target).
export const pendingSlot = { id: null as string | null };
export function requestSlot(id: string) { pendingSlot.id = id; }

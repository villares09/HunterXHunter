// Estado de ataque NO reactivo, compartido entre Player (daño), CharacterModel
// (animación) y skills.ts. Guarda el "move" activo para que cada parte sepa qué
// clip / daño / timing usar.
import { MOVES, type Move } from "./data/moves";

// Defaults de fallback por si algo dispara sin move explícito.
export const SWING = 0.55;
export const HIT_FRAME = 0.22;

export const attack = {
  active: false,
  startedAt: 0,
  move: null as Move | null,
};

export function startMove(move: Move) {
  attack.active = true;
  attack.startedAt = performance.now();
  attack.move = move;
}

// Compat: las skills disparan un swing genérico (usa el jab como animación).
export function startSwing() {
  startMove(MOVES.jab);
}

export function swingElapsed() {
  return (performance.now() - attack.startedAt) / 1000;
}

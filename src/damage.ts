import * as THREE from "three";
import { registry } from "./registry";
import { useRPG } from "./store";

const _e = new THREE.Vector3();

/** Aplica daño a los enemigos vivos dentro de `range` desde `center`.
 *  Devuelve cuántos golpeó. Respeta el multiplicador de daño (buff). */
export function hitInRadius(
  center: THREE.Vector3,
  range: number,
  dmg: number,
  opts: { critChance?: number; knockback?: number } = {}
): number {
  const { critChance = 0.18, knockback = 0.5 } = opts;
  const S = useRPG.getState();
  let landed = 0;

  registry.enemies.forEach((en) => {
    if (!en.alive) return;
    en.obj.getWorldPosition(_e);
    if (_e.distanceTo(center) <= range) {
      landed++;
      const crit = Math.random() < critChance;
      const d = Math.round(dmg * (crit ? 1.7 : 1) * (0.9 + Math.random() * 0.2) * S.dmgMult * S.passiveDmg);
      en.hp -= d;
      en.obj.position.add(_e.clone().sub(center).setY(0).normalize().multiplyScalar(knockback));
      S.addFloater({ pos: [_e.x, _e.y + 1.8, _e.z], text: `${d}`, kind: crit ? "crit" : "hit" });
      if (en.hp <= 0) {
        en.alive = false;
        S.addKill();
        S.addFloater({ pos: [_e.x, _e.y + 2.1, _e.z], text: "+18 EXP", kind: "info" });
      }
    }
  });

  return landed;
}

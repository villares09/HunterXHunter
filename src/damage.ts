import * as THREE from "three";
import { registry } from "@/registry";
import { useRPG } from "@/store";
import { sysLog } from "@/data/chatStore";

const _e = new THREE.Vector3();

/** Aplica daño a los enemigos vivos dentro de `range` desde `center`.
 *  Devuelve cuántos golpeó (los que CONECTARON, no los que erró).
 *  Respeta el multiplicador de daño (buff), la tirada de impacto y la absorción por enemigo. */
export function hitInRadius(
  center: THREE.Vector3,
  range: number,
  dmg: number,
  opts: { critChance?: number; knockback?: number } = {}
): number {
  const { critChance = 0.18, knockback = 0.5 } = opts;
  const S = useRPG.getState();

  // Ataque del jugador desde los stats derivados (fallback para personajes viejos).
  const atk = S.character?.derived?.["Ataque"] ?? 10;

  let landed = 0;

  registry.enemies.forEach((en) => {
    if (!en.alive) return;
    en.obj.getWorldPosition(_e);
    if (_e.distanceTo(center) > range) return;

    // --- TIRADA DE IMPACTO (jugador → enemigo) ---
    // chance = Ataque / (Ataque + Defensa_enemigo). Estilo D&D: más def = más MISS.
    const chance = atk / (atk + en.def);
    if (Math.random() > chance) {
      S.addFloater({ pos: [_e.x, _e.y + 1.8, _e.z], text: "MISS", kind: "info" });
      sysLog.miss("Vos", en.name ?? "el enemigo");
      return; // erró a este enemigo: sin daño, sin knockback, sin combo
    }
    landed++;
    const crit = Math.random() < critChance;
    // daño bruto (con crit, variación, buff y passiveDmg)
    const raw = dmg * (crit ? 1.7 : 1) * (0.9 + Math.random() * 0.2) * S.dmgMult * S.passiveDmg;
    // --- ABSORCIÓN del enemigo: se resta al daño final, piso de 1 ---
    const d = Math.max(1, Math.round(raw - en.absorb));
    en.hp -= d;
    en.obj.position.add(_e.clone().sub(center).setY(0).normalize().multiplyScalar(knockback));
    S.addFloater({ pos: [_e.x, _e.y + 1.8, _e.z], text: `${d}`, kind: crit ? "crit" : "hit" });
    sysLog.dmgOut(en.name ?? "el enemigo", d, crit);
    if (en.hp <= 0) {
      en.alive = false;
      S.addKill();
      S.addExp(en.exp);
      S.addFloater({ pos: [_e.x, _e.y + 2.1, _e.z], text: `+${en.exp} EXP`, kind: "info" });
      sysLog.kill(en.name ?? "el enemigo", en.exp);
    }
  });

  return landed;
}

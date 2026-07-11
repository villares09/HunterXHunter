import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { registry, registerEnemy, unregisterEnemy, nextId } from "../registry";
import { useRPG } from "../store";
import { EnemyModel } from "./EnemyModel";
import { getEnemy } from "../data/enemies";
import { randomLandPoint } from "../data/island";
import { heightAt } from "../data/terrainStore";
import { Nameplate } from "@/components/NamePlate";

const _p = new THREE.Vector3();
const _self = new THREE.Vector3();
// --- AGRO (Fase 4a) ---
// Radios medidos desde el OSO al jugador. El de enganche es MENOR que el de
// desenganche a propósito (histéresis): si fueran iguales, en el borde exacto
// el oso te agarraría y te soltaría un frame sí y otro no.
const AGGRO_RADIUS = 12;   // te detecta a esta distancia
const LOSE_RADIUS = 20;    // más lejos que esto, arranca el timer de olvido
const LOSE_TIME = 10;      // segundos fuera del LOSE_RADIUS para olvidarte
const RETURN_SPEED = 2.2;  // vuelve más lento de lo que persigue (3.0)
const HOME_EPS = 0.5;      // ya llegó a casa
const DEATH_HOLD = 3.0; // = duración real del clip death del oso

// spawn del player, para no aparecer encima de él
const PLAYER_SPAWN: [number, number] = [95, -32];
const MIN_DIST_FROM_PLAYER = 18;

/* devuelve un punto sobre la isla, apoyado al terreno y lejos del spawn del player */
function randomSpawn(): [number, number, number] {
  for (let i = 0; i < 20; i++) {
    const [x, , z] = randomLandPoint(0.3, 0.82);
    const dx = x - PLAYER_SPAWN[0], dz = z - PLAYER_SPAWN[1];
    if (Math.hypot(dx, dz) >= MIN_DIST_FROM_PLAYER) {
      return [x, heightAt(x, z), z]; // <-- apoyado al piso
    }
  }
  // fallback: el último que salga, igual apoyado
  const [x, , z] = randomLandPoint(0.3, 0.82);
  return [x, heightAt(x, z), z];
}

function Enemy({ initial }: { initial: [number, number, number] }) {
  const id = useMemo(() => nextId(), []);
  const def = useMemo(() => getEnemy("oso"), []);
  const group = useRef<THREE.Group>(null);
  const atkCd = useRef(0);
  const diedAt = useRef(0);
  const anim = useRef({ moving: false, attackAt: 0 });
  const home = useRef<[number, number, number]>(initial);
  const aggro = useRef(false);
  const loseAt = useRef(0); // timestamp en que se cumple el olvido; 0 = no está contando
  const { camera } = useThree();

  useEffect(() => {
    const g = group.current!;
    g.position.set(...initial);
    registerEnemy({
      id, obj: g,
      hp: def.hp, maxHp: def.hp,
      atk: def.atk, def: def.def, absorb: def.absorb, dmg: def.dmg,
      level: def.level, exp: def.exp,
      alive: true, name: def.name,
    });
    return () => unregisterEnemy(id);
  }, [id, initial, def]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const en = registry.enemies.get(id);
    const g = group.current;
    if (!en || !g) return;

    const S = useRPG.getState();

    if (!en.alive) {
      anim.current.moving = false;
      if (diedAt.current === 0) diedAt.current = performance.now();
      const t = (performance.now() - diedAt.current) / 1000;
      if (t > DEATH_HOLD) {
        g.scale.multiplyScalar(1 - dt * 4);
        g.position.y += dt * 0.6;
        if (g.scale.x < 0.05) {
          const sp = randomSpawn();
          g.position.set(sp[0], sp[1], sp[2]); // <-- respawn apoyado (antes era y=0)
          g.scale.setScalar(1);
          en.hp = en.maxHp;
          en.alive = true;
          diedAt.current = 0;
          home.current = sp;
          aggro.current = false;
          loseAt.current = 0;
        }
      }
      return;
    }

    if (S.hitStop > 0) return;

    atkCd.current = Math.max(0, atkCd.current - dt);

    if (registry.player) {
      registry.player.getWorldPosition(_p);
      g.getWorldPosition(_self);
      const dir = _p.clone().sub(_self).setY(0);
      const dist = dir.length();
      dir.normalize();

      // --- MÁQUINA DE AGRO ---
      if (!aggro.current) {
        // pasivo: te engancha si entrás al radio de detección
        if (dist <= AGGRO_RADIUS) {
          aggro.current = true;
          loseAt.current = 0;
        }
      } else {
        // enganchado: si te alejás del LOSE_RADIUS, arranca (o sigue) el timer
        if (dist > LOSE_RADIUS) {
          if (loseAt.current === 0) loseAt.current = performance.now() + LOSE_TIME * 1000;
          else if (performance.now() >= loseAt.current) {
            aggro.current = false;
            loseAt.current = 0;
          }
        } else {
          loseAt.current = 0; // volviste al radio: se cancela el olvido
        }
      }

      if (aggro.current) {
        // --- PERSECUCIÓN (lo de antes) ---
        g.rotation.y = Math.atan2(dir.x, dir.z);

        if (dist > 1.8) {
          anim.current.moving = true;
          g.position.addScaledVector(dir, 3.0 * dt);
          g.position.y = heightAt(g.position.x, g.position.z);
        } else {
          anim.current.moving = false;
          if (atkCd.current === 0) {
            atkCd.current = 1.2;
            anim.current.attackAt = performance.now();
            S.damagePlayer(en.dmg, [_self.x, _self.y + 1.6, _self.z], en.atk, en.name);
          }
        }
      } else {
        // --- VUELTA A CASA ---
        const hx = home.current[0] - g.position.x;
        const hz = home.current[2] - g.position.z;
        const hd = Math.hypot(hx, hz);
        if (hd > HOME_EPS) {
          anim.current.moving = true;
          const inv = 1 / hd;
          g.rotation.y = Math.atan2(hx * inv, hz * inv);
          g.position.x += hx * inv * RETURN_SPEED * dt;
          g.position.z += hz * inv * RETURN_SPEED * dt;
          g.position.y = heightAt(g.position.x, g.position.z);
        } else {
          anim.current.moving = false;
        }
      }
    } else {
      anim.current.moving = false;
    }
  });

  return (
    <group ref={group}>
      <EnemyModel id={id} anim={anim} />
      <Nameplate name={def.name} level={def.level} kind="enemy" targetId={id} y={2.5} />
    </group>
  );
}

export function Enemies({ count = 3 }: { count?: number }) {
  const spawns = useMemo(() => Array.from({ length: count }, () => randomSpawn()), [count]);
  return (
    <>
      {spawns.map((s, i) => (
        <Enemy key={i} initial={s} />
      ))}
    </>
  );
}

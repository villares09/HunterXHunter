import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { registry, registerEnemy, unregisterEnemy, nextId } from "../registry";
import { useRPG } from "../store";
import { EnemyModel } from "./EnemyModel";
import { getEnemy } from "../data/Enemies";
import { randomLandPoint } from "../data/Island";

const _p = new THREE.Vector3();
const _self = new THREE.Vector3();

const DEATH_HOLD = 3.0; // = duración real del clip death del oso

function randomSpawn(): [number, number, number] {
  return randomLandPoint(0.3, 0.82); // siempre sobre la isla
}

function Enemy({ initial }: { initial: [number, number, number] }) {
  const id = useMemo(() => nextId(), []);
  const def = useMemo(() => getEnemy("oso"), []);
  const group = useRef<THREE.Group>(null);
  const fill = useRef<THREE.Mesh>(null);
  const bar = useRef<THREE.Group>(null);
  const atkCd = useRef(0);
  const diedAt = useRef(0);
  const anim = useRef({ moving: false, attackAt: 0 });
  const { camera } = useThree();

  useEffect(() => {
    const g = group.current!;
    g.position.set(...initial);
    registerEnemy({ id, obj: g, hp: def.hp, maxHp: def.hp, alive: true });
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
          g.position.set(sp[0], 0, sp[2]);
          g.scale.setScalar(1);
          en.hp = en.maxHp;
          en.alive = true;
          diedAt.current = 0;
        }
      }
      if (bar.current) bar.current.visible = false;
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

      g.rotation.y = Math.atan2(dir.x, dir.z);

      if (dist > 1.8) {
        anim.current.moving = true;
        g.position.addScaledVector(dir, 3.0 * dt);
      } else {
        anim.current.moving = false;
        if (atkCd.current === 0) {
          atkCd.current = 1.2;
          anim.current.attackAt = performance.now();
          S.damagePlayer(7, [_self.x, _self.y + 1.6, _self.z]);
        }
      }
    } else {
      anim.current.moving = false;
    }

    if (fill.current && bar.current) {
      const ratio = Math.max(0.001, en.hp / en.maxHp);
      fill.current.scale.x = ratio;
      fill.current.position.x = -(1 - ratio) * 0.5;
      (fill.current.material as THREE.MeshBasicMaterial).color.setHSL(ratio * 0.33, 0.9, 0.5);
      bar.current.quaternion.copy(camera.quaternion);
      bar.current.visible = en.hp < en.maxHp;
    }
  });

  return (
    <group ref={group}>
      <EnemyModel id={id} anim={anim} />
      <group ref={bar} position={[0, 2.1, 0]}>
        <mesh>
          <planeGeometry args={[1, 0.14]} />
          <meshBasicMaterial color="#220000" />
        </mesh>
        <mesh ref={fill} position={[0, 0, 0.01]}>
          <planeGeometry args={[0.96, 0.09]} />
          <meshBasicMaterial color="#ff4d4d" />
        </mesh>
      </group>
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

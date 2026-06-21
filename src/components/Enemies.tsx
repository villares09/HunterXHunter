import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { registry, registerEnemy, unregisterEnemy, nextId } from "../registry";
import { useRPG } from "../store";

const _p = new THREE.Vector3();
const _self = new THREE.Vector3();

function randomSpawn(): [number, number, number] {
  const a = Math.random() * Math.PI * 2;
  const r = 28 + Math.random() * 22;
  return [Math.cos(a) * r, 0, Math.sin(a) * r];
}

function Enemy({ initial }: { initial: [number, number, number] }) {
  const id = useMemo(() => nextId(), []);
  const group = useRef<THREE.Group>(null);
  const fill = useRef<THREE.Mesh>(null);
  const bar = useRef<THREE.Group>(null);
  const atkCd = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    const g = group.current!;
    g.position.set(...initial);
    registerEnemy({ id, obj: g, hp: 50, maxHp: 50, alive: true });
    return () => unregisterEnemy(id);
  }, [id, initial]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const en = registry.enemies.get(id);
    const g = group.current;
    if (!en || !g) return;

    const S = useRPG.getState();

    // muerte: encoge y reaparece (mantiene objetivos vivos en el mapa)
    if (!en.alive) {
      g.scale.multiplyScalar(1 - dt * 4);
      g.position.y += dt * 0.6;
      if (g.scale.x < 0.05) {
        const sp = randomSpawn();
        g.position.set(sp[0], 0, sp[2]);
        g.scale.setScalar(1);
        en.hp = en.maxHp;
        en.alive = true;
      }
      return;
    }

    // HITSTOP global: si está activo, el mundo se congela (juice)
    if (S.hitStop > 0) return;

    atkCd.current = Math.max(0, atkCd.current - dt);

    if (registry.player) {
      registry.player.getWorldPosition(_p);
      g.getWorldPosition(_self);
      const dir = _p.clone().sub(_self).setY(0);
      const dist = dir.length();
      dir.normalize();

      if (dist > 1.8) {
        g.position.addScaledVector(dir, 3.0 * dt);
        g.rotation.y = Math.atan2(dir.x, dir.z);
      } else if (atkCd.current === 0) {
        atkCd.current = 1.2;
        S.damagePlayer(7, [_self.x, _self.y + 1.6, _self.z]);
      }
    }

    // barra de vida: escala y billboard
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
      {/* cuerpo (bestia low-poly) */}
      <mesh castShadow position={[0, 0.7, 0]}>
        <capsuleGeometry args={[0.45, 0.5, 6, 10]} />
        <meshStandardMaterial color="#9c4a2e" flatShading />
      </mesh>
      <mesh castShadow position={[0, 1.1, 0.4]}>
        <boxGeometry args={[0.5, 0.45, 0.5]} />
        <meshStandardMaterial color="#8a3f26" flatShading />
      </mesh>
      {/* ojos */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, 1.18, 0.66]}>
          <boxGeometry args={[0.08, 0.08, 0.05]} />
          <meshStandardMaterial color="#ffcc33" emissive="#ff7700" emissiveIntensity={0.9} />
        </mesh>
      ))}
      {/* barra de vida */}
      <group ref={bar} position={[0, 1.9, 0]}>
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

export function Enemies({ count = 6 }: { count?: number }) {
  const spawns = useMemo(
    () => Array.from({ length: count }, () => randomSpawn()),
    [count]
  );
  return (
    <>
      {spawns.map((s, i) => (
        <Enemy key={i} initial={s} />
      ))}
    </>
  );
}

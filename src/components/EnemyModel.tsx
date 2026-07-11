import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { registry } from "../registry";
import { getEnemy } from "../data/enemies";

export type EnemyAnimRef = MutableRefObject<{ moving: boolean; attackAt: number }>;
const DEATH_DROP_SPEED = 8;

export function EnemyModel({
  id,
  anim,
  enemyId = "oso",
}: {
  id: number;
  anim: EnemyAnimRef;
  enemyId?: string;
}) {
  const def = useMemo(() => getEnemy(enemyId), [enemyId]);
  const { scene, animations } = useGLTF(def.url);
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  // mismo limpiado que CharacterModel: dropea junk, saca prefijo, solo .quaternion
  const clips = useMemo(() => {
    const prefix = (def.id + "_").toLowerCase();
    const out: THREE.AnimationClip[] = [];
    for (const c of animations) {
      if (/^action$/i.test(c.name) || /^mixamo\.com/i.test(c.name)) continue;
      const clip = c.clone();
      let n = clip.name;
      if (n.toLowerCase().startsWith(prefix)) n = n.slice(prefix.length);
      clip.name = n.trim();
      clip.tracks = clip.tracks.filter((t) => t.name.endsWith(".quaternion"));
      out.push(clip);
    }
    return out;
  }, [animations, def]);

  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(clips, group);
  const cur = useRef<string>("");

  const prevHp = useRef<number>(def.hp);
  const lastAttack = useRef<number>(0);
  const hitUntil = useRef<number>(0);
  const attackUntil = useRef<number>(0);
  const baseY = useRef(0);

  useLayoutEffect(() => {
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; }
    });
    model.frustumCulled = false;
    const g = group.current!;

    // Medir el modelo en ESPACIO LOCAL, aislado del padre.
    // Sacamos el model a un objeto temporal en el origen, medimos, y lo devolvemos.
    // Así box.min.y/size.y son SIEMPRE del modelo crudo, sin heredar la posición de spawn.
    const parent = model.parent;
    const tmp = new THREE.Group();
    tmp.add(model);                 // model ahora cuelga del tmp en el origen
    tmp.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    if (parent) parent.add(model);  // devolver el model a su lugar (el group del componente)

    const size = box.getSize(new THREE.Vector3());
    const s = def.targetHeight / (size.y || 1);
    g.scale.setScalar(s);
    baseY.current = def.feetY - box.min.y * s;
    g.position.y = baseY.current;
    g.rotation.y = def.faceFlip ? Math.PI : 0;
    cur.current = "";
    
  }, [model, def]);

  // play() idéntico a CharacterModel: una action pura, corta el resto.
  const play = (clip: string, once = false, fade = 0.12, speed = 1) => {
    if (!clip || cur.current === clip) return;
    const next = actions[clip];
    if (!next) {
      console.warn("[enemy-anim] clip NO encontrado:", clip, "| hay:", Object.keys(actions));
      return;
    }
    for (const k in actions) {
      const a = actions[k];
      if (a && a !== next) a.fadeOut(fade);
    }
    next.reset();
    next.setEffectiveTimeScale(speed);
    next.setEffectiveWeight(1);
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.fadeIn(fade).play();
    cur.current = clip;
  };

  const A = def.anim;

  useFrame((_, dt) => {
    if (!group.current) return;
    const en = registry.enemies.get(id);
    if (!en) return;
    const now = performance.now();

    if (!en.alive) {
      prevHp.current = en.hp;
      hitUntil.current = 0;
      attackUntil.current = 0;
      lastAttack.current = anim.current.attackAt;
      play(A.death, true, 0.12);
      // el cuerpo acostado se asienta en el piso
      const want = baseY.current - (def.deathDrop ?? 0.35);
      group.current.position.y += (want - group.current.position.y) * Math.min(1, DEATH_DROP_SPEED * dt);
      return;
    }

    // vivo (incluye el respawn): vuelve a su altura normal
    if (group.current.position.y !== baseY.current) group.current.position.y = baseY.current;

    // golpe = caída de hp (registry no-reactivo, lo polleamos)
    const tookHit = en.hp < prevHp.current;
    prevHp.current = en.hp;
    if (tookHit) {
      const d = actions[A.hit]?.getClip().duration ?? 0.4;
      hitUntil.current = now + d * 1000;
    }

    // 2) HIT-REACTION
    if (now < hitUntil.current) {
      play(A.hit, true, 0.06);
      return;
    }

    // 3) ATAQUE — lo dispara el controller bumpeando anim.current.attackAt
    if (anim.current.attackAt && anim.current.attackAt !== lastAttack.current) {
      lastAttack.current = anim.current.attackAt;
      const d = actions[A.attack]?.getClip().duration ?? 0.6;
      attackUntil.current = now + d * 1000;
    }
    if (now < attackUntil.current) {
      play(A.attack, true, 0.06);
      return;
    }

    // 4) LOCOMOCIÓN
    play(anim.current.moving ? A.walk : A.idle, false, 0.15);
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

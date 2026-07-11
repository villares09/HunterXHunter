import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { attack, swingElapsed, SWING } from "../combat";
import { MODELS, getModel } from "../data/models";
import { useRPG } from "../store";
import { move, jump } from "./movement";

export const FEET_Y = -0.90;
const DEATH_DROP = 0.55;
const DEATH_DROP_SPEED = 8;
const TARGET_HEIGHT = 1.35;
const _v = new THREE.Vector3();

MODELS.forEach((m) => useGLTF.preload(m.url));

export function CharacterModel() {
  const modelId = useRPG((s) => s.character?.modelId) ?? "gon";
  return <CharacterModelInner key={modelId} modelId={modelId} />;
}

function CharacterModelInner({ modelId }: { modelId: string }) {
  const def = useMemo(() => getModel(modelId), [modelId]);
  const { scene, animations } = useGLTF(def.url);

  const model = useMemo(() => SkeletonUtils.clone(scene), [scene]);

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
  const lastSwingAt = useRef(0);
  const baseY = useRef(0);
  const prevHp = useRef(0);
  const hurtUntil = useRef(0);

  useLayoutEffect(() => {
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; }
    });
    model.frustumCulled = false;
    const g = group.current!;
    g.scale.setScalar(1);
    g.rotation.y = def.faceFlip ? Math.PI : 0;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = TARGET_HEIGHT / (size.y || 1);
    g.scale.setScalar(s);
    baseY.current = FEET_Y - box.min.y * s;
    g.position.y = baseY.current;
    cur.current = "";
  }, [model, def]);

  const play = (clip: string, once = false, fade = 0.12, speed = 1) => {
    if (!clip || cur.current === clip) return;
    const next = actions[clip];
    if (!next) return;
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

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;

    const S = useRPG.getState();

    // --- MUERTE: prioridad máxima ---
    if (S.dead) {
      prevHp.current = S.hp;
      if (def.anim.down) play(def.anim.down, true, 0.15);
      // el cuerpo acostado se asienta en el piso (ver DEATH_DROP)
      const want = baseY.current - DEATH_DROP;
      g.position.y += (want - g.position.y) * Math.min(1, DEATH_DROP_SPEED * dt);
      return;
    }

    // vivo: si venía de estar muerto, vuelve a su altura normal
    if (g.position.y !== baseY.current) g.position.y = baseY.current;

    // --- HIT-REACTION ---
    // Poise estilo L2: si estás ejecutando un ataque, el golpe NO corta el skill.
    if (S.hp < prevHp.current && def.anim.hurt && !attack.active) {
      const d = actions[def.anim.hurt]?.getClip().duration ?? 0.5;
      hurtUntil.current = performance.now() + d * 1000;
      cur.current = "";
    }
    prevHp.current = S.hp;

    if (def.anim.hurt && performance.now() < hurtUntil.current) {
      play(def.anim.hurt, true, 0.08);
      return;
    }

    // --- ATAQUE ---
    if (attack.active && attack.move) {
      const name = attack.move.clip;
      const act = actions[name];
      const speed = attack.move.speed || 1;

      if (attack.startedAt !== lastSwingAt.current) {
        lastSwingAt.current = attack.startedAt;
        hurtUntil.current = 0;   // un swing nuevo cancela el hit-reaction en curso
        cur.current = "";
        if (!act) console.warn("[anim] clip NO encontrado:", name, "| hay:", Object.keys(actions));
      }

      const visualDur = act ? act.getClip().duration / speed : (attack.move.swing || SWING);
      if (swingElapsed() < visualDur) {
        play(act ? name : (def.anim.attack || def.anim.idle), true, 0.1, speed);
        return;
      }
      attack.active = false;
    }

    // --- SALTO: prioridad sobre la locomoción ---
    if (jump.active && def.anim.jump) {
      play(def.anim.jump, false, 0.08, 1);
      return;
    }

    // --- LOCOMOCIÓN ---
    const loco = move.locomotion;
    const clip =
      loco === "run" ? def.anim.run :
      loco === "walk" ? def.anim.walk :
      def.anim.idle;
    play(clip || def.anim.idle, false, 0.15, 1);
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

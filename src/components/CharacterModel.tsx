import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { useGame } from "ecctrl";
import { attack, swingElapsed, SWING } from "../combat";
import { MODELS, getModel } from "../data/models";
import { useRPG } from "../store";

MODELS.forEach((m) => useGLTF.preload(m.url));

const FEET_Y = -0.65;
const TARGET_HEIGHT = 1.35;
const JUMP_SPEED = 0.69; // velocidad de la animación de salto (ajustable a ojo)
const _v = new THREE.Vector3();

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

  // hit-reaction del player: poleamos hp como el oso pollea en.hp
  const prevHp = useRef(0);
  const hurtUntil = useRef(0);

  // Nombre canónico del clip de salto (para distinguirlo en play).
  const jumpName = def.anim.jump ?? def.anim.idle;

  // Inicializa el set de animaciones que ecctrl usa para setear curAnimation.
  const animSet = useMemo(
    () => ({
      idle: def.anim.idle,
      walk: def.anim.walk,
      run: def.anim.run,
      jump: jumpName,
      jumpIdle: jumpName,
      jumpLand: def.anim.idle, // no tenemos clip de aterrizaje aparte -> idle directo
      fall: jumpName,
    }),
    [def, jumpName]
  );

  useLayoutEffect(() => {
    useGame.getState().initializeAnimationSet(animSet);
  }, [animSet]);

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
    g.position.y = FEET_Y - box.min.y * s;
    cur.current = "";
  }, [model, def]);

  // Reproduce UNA sola animación pura (corta el resto), igual que el visor.
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

  useFrame(() => {
    const g = group.current;
    if (!g) return;

    const S = useRPG.getState();

    // --- MUERTE: se cae y se clava en el piso. Prioridad máxima. ---
    if (S.dead) {
      prevHp.current = S.hp;
      if (def.anim.down) play(def.anim.down, true, 0.15);
      return;
    }

    // --- HIT-REACTION: si hp bajó respecto al frame anterior, comimos un golpe. ---
    if (def.anim.hurt && S.hp < prevHp.current) {
      const d = actions[def.anim.hurt]?.getClip().duration ?? 0.5;
      hurtUntil.current = performance.now() + d * 1000;
      cur.current = ""; // re-dispara la anim aunque ya estuviéramos reaccionando (multi-golpe)
    }
    prevHp.current = S.hp;

    if (def.anim.hurt && performance.now() < hurtUntil.current) {
      play(def.anim.hurt, true, 0.08);
      return; // tapa ataque y locomoción mientras dura la reacción
    }

    // --- ATAQUE: nuestro sistema, tiene prioridad sobre locomoción ---
    if (attack.active && attack.move) {
      const name = attack.move.clip;
      const act = actions[name];
      const speed = attack.move.speed || 1;

      if (attack.startedAt !== lastSwingAt.current) {
        lastSwingAt.current = attack.startedAt;
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

    // --- LOCOMOCIÓN + SALTO: lo decide ecctrl (detección de piso por rayo) ---
    const ca = useGame.getState().curAnimation;
    const clip = ca ?? def.anim.idle;
    const isJump = clip === jumpName && jumpName !== def.anim.idle;
    play(clip, isJump, isJump ? 0.08 : 0.15, isJump ? JUMP_SPEED : 1);
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}
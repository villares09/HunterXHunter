import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { CharacterModel, FEET_Y } from "@/components/CharacterModel";
import { registry, setPlayer } from "@/registry";
import { useRPG } from "@/store";
import { hitInRadius } from "@/damage";
import { useSlotByCode, SLOTS } from "@/skills";
import { startMove } from "@/combat";
import { MOVES, type Move } from "@/data/moves";
import { heightAt } from "@/data/terrainStore";
import {
  move, requestMove, stopMove, auto, startAutoAttack, stopAutoAttack,
  jump, startJump, GRAVITY, pendingSlot,
} from "@/components/Movement";
import { isWalkable, clampWalkable } from "@/components/walkable";
import { useTarget, targetPos, pickEnemy, cycleTarget } from "@/targeting";
import { Nameplate } from "@/components/NamePlate";
import { AuraBurst } from "@/components/AuraBurst";

const _tmp = new THREE.Vector3();
const CHAIN_WINDOW = 3.5; // ventana para encadenar el básico

const SPAWN: [number, number] = [95, -32];

const WALK_SPEED = 3.4;
const RUN_SPEED = 6.2;

const ATTACK_RANGE = 1.8;
const CHASE_RANGE = 2.2;
const NPC_TALK_DIST = 2.5;

const BASIC_STAMINA_FRAC = 1 / 8;

// básico encadenado: secuencia SIN finisher
const BASIC_CHAIN: Move[] = [MOVES.jab, MOVES.cross, MOVES.hook];

const BASIC_POOL: Move[] = [MOVES.jab, MOVES.cross, MOVES.hook, MOVES.kick, MOVES.elbow];

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function raymarchGround(ray: THREE.Ray): THREE.Vector3 | null {
  const o = ray.origin, d = ray.direction;
  const STEP = 2, MAX_T = 4000;
  let prevT = 0;
  let prevDiff = o.y - heightAt(o.x, o.z);
  for (let t = STEP; t < MAX_T; t += STEP) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    const diff = y - heightAt(x, z);
    if (diff <= 0 && prevDiff > 0) {
      let a = prevT, b = t;
      for (let k = 0; k < 12; k++) {
        const mid = (a + b) / 2;
        const mx = o.x + d.x * mid, my = o.y + d.y * mid, mz = o.z + d.z * mid;
        if (my - heightAt(mx, mz) > 0) a = mid; else b = mid;
      }
      const fx = o.x + d.x * b, fz = o.z + d.z * b;
      return new THREE.Vector3(fx, heightAt(fx, fz), fz);
    }
    prevT = t; prevDiff = diff;
  }
  return null;
}

export function Player() {
  const ref = useRef<THREE.Group>(null);
  const facing = useRef(0);
  const nextAtk = useRef(0);
  const pending = useRef<{ at: number; move: Move; hitIndex: number }[]>([]);

  // cadena del básico
  const basicStep = useRef(0);
  const lastBasicAt = useRef(0);

  const lastInputAt = useRef(0);

  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const spawnY = heightAt(SPAWN[0], SPAWN[1]) - FEET_Y;

  useEffect(() => {
    setPlayer(ref.current);
    return () => setPlayer(null);
  }, []);

  const fireMove = (m: Move, staminaCost?: number): boolean => {
    const now = performance.now();
    const S = useRPG.getState();
    if (S.dead || now < nextAtk.current || S.hitStop > 0 || !registry.player) return false;
    const cost = staminaCost ?? S.maxStamina * BASIC_STAMINA_FRAC;
    if (!S.hasStamina(cost)) return false;
    S.spendStamina(cost);
    lastInputAt.current = now;
    nextAtk.current = now + (m.swing + m.cooldown) * 1000;
    startMove(m);
    const frames = Array.isArray(m.hitFrame) ? m.hitFrame : [m.hitFrame];
    frames.forEach((hf, idx) =>
      pending.current.push({ at: now + hf * 1000, move: m, hitIndex: idx })
    );
    return true;
  };

  // resuelve el básico encadenado: avanza la secuencia si estás dentro de la ventana
  const fireBasic = (): boolean => {
    const now = performance.now();
    const chained = (now - lastBasicAt.current) / 1000 <= CHAIN_WINDOW;
    if (chained) basicStep.current = (basicStep.current + 1) % BASIC_CHAIN.length;
    else basicStep.current = 0;
    const m = BASIC_CHAIN[basicStep.current];
    // costo desde el slot del básico (staminaDenom), no la constante
    const basicSlot = SLOTS.find((s) => s.id === "basic");
    const denom = basicSlot?.staminaDenom ?? 8;
    const cost = Math.round(useRPG.getState().maxStamina / denom);
    const ok = fireMove(m, cost);
    if (ok) lastBasicAt.current = now;
    return ok;
  };

  useEffect(() => {
    const onCanvasDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (useRPG.getState().dead || !registry.player) return;

      const rect = gl.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);

      const hit = pickEnemy(raycaster);
      if (hit) {
        const cur = useTarget.getState().target;
        const already = cur && cur.kind === hit.kind && cur.id === hit.id;
        if (!already) {
          useTarget.getState().setTarget(hit);
        } else {
          if (hit.kind === "enemy") {
            startAutoAttack(hit.id);
          } else {
            const tp = targetPos();
            if (tp) {
              registry.player.getWorldPosition(_tmp);
              const [cx, cz] = clampWalkable(_tmp.x, _tmp.z, tp.x, tp.z);
              requestMove(cx, cz, { stopDist: NPC_TALK_DIST });
            }
          }
        }
        return;
      }

      // click en piso: mueve. Cancela auto-attack y slot pendiente, pero NO suelta el target.
      stopAutoAttack();
      pendingSlot.id = null;
      const g = raymarchGround(raycaster.ray);
      if (!g) return;
      registry.player.getWorldPosition(_tmp);
      const [cx, cz] = clampWalkable(_tmp.x, _tmp.z, g.x, g.z);
      requestMove(cx, cz);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Tab") {
        e.preventDefault();
        if (e.repeat) return;
        cycleTarget();
        return;
      }
      if (e.code === "Escape") {
        // si hay una ventana abierta, Escape la cierra y NO suelta el target
        if (useRPG.getState().openWindow) {
          useRPG.getState().closeWindow();
          return;
        }
        stopAutoAttack();
        pendingSlot.id = null;
        useTarget.getState().clear();
        return;
      }
      if (e.code === "Space") {
        if (e.repeat) return;
        startJump();
        return;
      }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        if (e.repeat) return;
        const S = useRPG.getState();
        if (!move.running && S.stamina <= 0) return;
        move.running = !move.running;
        if (move.dest) move.locomotion = move.running ? "run" : "walk";
        return;
      }
      if (e.code === "KeyC") {
        if (e.repeat) return;
        useRPG.getState().toggleWindow("character");
        return;
      }

      if (useRPG.getState().dead) return;
      if (e.code.startsWith("Digit")) {
        useSlotByCode(e.code);
      }
    };

    const onContext = (e: MouseEvent) => e.preventDefault();

    gl.domElement.addEventListener("pointerdown", onCanvasDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("contextmenu", onContext);
    return () => {
      gl.domElement.removeEventListener("pointerdown", onCanvasDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("contextmenu", onContext);
    };
  }, [camera, gl, raycaster]);

  useFrame((_, dt) => {
    const root = ref.current;
    const S = useRPG.getState();
    let movingNow = false;

    // ===== SLOT PENDIENTE (básico encadenado o skill con acercamiento) =====
    if (pendingSlot.id && root) {
      const slot = SLOTS.find((s) => s.id === pendingSlot.id);
      const tp = targetPos();

      // determinar el move y su rango para el acercamiento
      let mv: Move | null = null;
      if (slot) {
        if (slot.id === "basic") {
          mv = BASIC_CHAIN[basicStep.current]; // rango aprox del básico
        } else if (slot.moveId) {
          mv = (MOVES as Record<string, Move>)[slot.moveId] ?? null;
        }
      }

      // ¿hay que acercarse? sólo si hay target y está fuera del rango del move
      let inRange = true;
      if (slot && tp && mv) {
        const dx = tp.x - root.position.x, dz = tp.z - root.position.z;
        const dist = Math.hypot(dx, dz);
        const reach = Math.max(1.2, mv.range - 0.4); // un pelín menos que el rango
        if (dist > reach) {
          inRange = false;
          // perseguir hasta el rango
          const inv = 1 / dist;
          const txp = tp.x - dx * inv * reach;
          const tzp = tp.z - dz * inv * reach;
          const [cx, cz] = clampWalkable(root.position.x, root.position.z, txp, tzp);
          requestMove(cx, cz, { stopDist: 0.3 });
        } else {
          // ya en rango: encarar al target
          if (move.dest) stopMove();
          facing.current = Math.atan2(dx, dz);
          root.rotation.y = facing.current;
        }
      }

      if (inRange) {
        // ejecutar el slot. Guardamos si realmente disparó: si el swing anterior
        // todavía bloquea (fireMove devuelve false), NO limpiamos el pending —
        // se reintenta en los próximos frames y así el básico encadena solo.
        let fired = false;
        if (slot?.id === "basic") {
          fired = fireBasic();
        } else if (mv && slot) {
          const cost = Math.round(S.maxStamina / (slot.staminaDenom ?? 4));
          fired = fireMove(mv, cost);
          // el CD arranca ACÁ, al ejecutar (no al apretar la tecla).
          if (fired && slot.kind === "skill") {
            S.setCooldown(slot.id, slot.cd ?? 0);
          }
        }
        if (fired) {
          pendingSlot.id = null;
          // encarar de nuevo por si tp existe
          if (tp && root) {
            const dx = tp.x - root.position.x, dz = tp.z - root.position.z;
            if (Math.hypot(dx, dz) > 0.01) { facing.current = Math.atan2(dx, dz); root.rotation.y = facing.current; }
          }
        }
      }
    }

    // ===== AUTO-ATTACK (click) =====
    if (auto.active && root) {
      const en = auto.enemyId != null ? registry.enemies.get(auto.enemyId) : null;
      if (!en || !en.alive) {
        stopAutoAttack();
      } else if (S.stamina < S.maxStamina * BASIC_STAMINA_FRAC && nextAtk.current < performance.now()) {
        stopAutoAttack();
        S.addFloater({ pos: [root.position.x, root.position.y + 2.4, root.position.z], text: "¡SIN AIRE!", kind: "info" });
      } else {
        en.obj.getWorldPosition(_tmp);
        const dx = _tmp.x - root.position.x, dz = _tmp.z - root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > CHASE_RANGE) {
          const inv = 1 / dist;
          const tx = _tmp.x - dx * inv * ATTACK_RANGE;
          const tz = _tmp.z - dz * inv * ATTACK_RANGE;
          const [cx, cz] = clampWalkable(root.position.x, root.position.z, tx, tz);
          requestMove(cx, cz, { stopDist: 0.3 });
        } else {
          if (move.dest) stopMove();
          const ang = Math.atan2(dx, dz);
          facing.current = lerpAngle(facing.current, ang, 1 - Math.pow(0.0005, dt));
          root.rotation.y = facing.current;
          if (performance.now() >= nextAtk.current) {
            fireMove(BASIC_POOL[(Math.random() * BASIC_POOL.length) | 0]);
          }
        }
      }
    }

    // ===== MOVIMIENTO =====
    let groundY = root ? heightAt(root.position.x, root.position.z) - FEET_Y : 0;

    if (root && move.dest) {
      const px = root.position.x, pz = root.position.z;
      let dx = move.dest.x - px, dz = move.dest.z - pz;
      const dist = Math.hypot(dx, dz);

      if (dist <= move.stopDist) {
        root.position.x = move.dest.x;
        root.position.z = move.dest.z;
        groundY = heightAt(move.dest.x, move.dest.z) - FEET_Y;
        const cb = move.onArrive;
        stopMove();
        cb?.();
      } else {
        const inv = 1 / dist; dx *= inv; dz *= inv;
        const canRun = move.running && S.stamina > 0;
        const baseSpeed = canRun ? RUN_SPEED : WALK_SPEED;
        const SLOW_RADIUS = 2.5;
        const speedFactor = dist < SLOW_RADIUS ? Math.max(0.25, dist / SLOW_RADIUS) : 1;
        const speed = baseSpeed * speedFactor;
        const step = Math.min(speed * dt, dist);
        const nx = px + dx * step, nz = pz + dz * step;

        if (!isWalkable(nx, nz)) {
          stopMove();
        } else {
          root.position.x = nx;
          root.position.z = nz;
          groundY = heightAt(nx, nz) - FEET_Y;
          move.locomotion = canRun ? "run" : "walk";
          movingNow = canRun;
          const targetAng = Math.atan2(dx, dz);
          facing.current = lerpAngle(facing.current, targetAng, 1 - Math.pow(0.0015, dt));
          root.rotation.y = facing.current;
        }
      }
    } else {
      if (move.locomotion !== "idle") move.locomotion = "idle";
      const tp = targetPos();
      if (tp && root && !auto.active) {
        const dx = tp.x - root.position.x, dz = tp.z - root.position.z;
        if (Math.hypot(dx, dz) > 0.01) {
          const targetAng = Math.atan2(dx, dz);
          facing.current = lerpAngle(facing.current, targetAng, 1 - Math.pow(0.0015, dt));
          root.rotation.y = facing.current;
        }
      }
    }

    // ===== SALTO =====
    if (root) {
      if (jump.active) {
        jump.vy -= GRAVITY * dt;
        jump.offset += jump.vy * dt;
        if (jump.offset <= 0) { jump.offset = 0; jump.active = false; jump.vy = 0; }
      }
      root.position.y = groundY + jump.offset;
    }

    if (S.running !== movingNow) S.setRunning(movingNow);
    if (move.running && S.stamina <= 0) {
      move.running = false;
      if (move.dest) move.locomotion = "walk";
    }

    // ===== golpes pendientes (daño) =====
    if (!pending.current.length || !registry.player) return;
    const now = performance.now();
    registry.player.getWorldPosition(_tmp);
    pending.current = pending.current.filter((p) => {
      if (now < p.at) return true;
      const dmg = S.baseDmg * p.move.dmg + S.combo * 1.0;
      // Knockback por hit: en combos multi-hit los golpes intermedios casi no
      // empujan (así el enemigo no se sale del rango y engancha todo el combo);
      // solo el ÚLTIMO hit descarga el knockback pleno del move.
      const nHits = Array.isArray(p.move.hitFrame) ? p.move.hitFrame.length : 1;
      const isLast = p.hitIndex === nHits - 1;
      const kb = nHits > 1 && !isLast ? p.move.knockback * 0.12 : p.move.knockback;
      const landed = hitInRadius(_tmp, p.move.range, dmg, { knockback: kb });
      if (landed > 0) {
        S.addCombo();
        S.setHitStop(p.move.kind === "finisher" || p.move.kind === "heavy" ? 0.12 : 0.07);
        S.shake();
      }
      return false;
    });
  });

  function PlayerNameplate() {
  const name = useRPG((s) => s.character?.name) ?? "Cazador";
  // el PJ va a la altura de su cabeza (modelo escalado a 1). Sin LVL.
  return <Nameplate name={name} kind="player" y={1} />;
}

  return (
    <>
      <group ref={ref} position={[SPAWN[0], spawnY, SPAWN[1]]}>
        <CharacterModel />
        <PlayerNameplate />
        <AuraBurst />
      </group>
      <DestMarker />
      <TargetIndicator />
      <FollowCam targetRef={ref} />
    </>
  );
}

function DestMarker() {
  const grp = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = grp.current;
    if (!g) return;
    if (move.dest) {
      g.visible = true;
      g.position.set(move.dest.x, heightAt(move.dest.x, move.dest.z) + 0.06, move.dest.z);
      const p = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.18;
      g.scale.setScalar(p);
    } else {
      g.visible = false;
    }
  });
  return (
    <group ref={grp} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <mesh>
        <ringGeometry args={[0.38, 0.52, 40]} />
        <meshBasicMaterial color="#5fe0ff" transparent opacity={0.9} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.12, 20]} />
        <meshBasicMaterial color="#eafcff" transparent opacity={0.85} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function TargetIndicator() {
  const target = useTarget((s) => s.target);
  const ring = useRef<THREE.Group>(null);

  useFrame((state) => {
    const pos = targetPos();
    if (!target || !pos) {
      if (ring.current) ring.current.visible = false;
      if (target && !pos) { useTarget.getState().clear(); stopAutoAttack(); }
      return;
    }
    if (ring.current) {
      ring.current.visible = true;
      ring.current.position.set(pos.x, heightAt(pos.x, pos.z) + 0.07, pos.z);
      const p = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.12;
      ring.current.scale.setScalar(p);
    }
  });

  return (
    <group ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <mesh>
        <ringGeometry args={[0.6, 0.78, 44]} />
        <meshBasicMaterial color="#ff5a5a" transparent opacity={0.95} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function FollowCam({ targetRef }: { targetRef: React.RefObject<THREE.Group | null> }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const prev = useRef(new THREE.Vector3());
  const init = useRef(false);

  useFrame(() => {
    const t = targetRef.current, c = controls.current;
    if (!t || !c) return;
    const p = t.position;
    if (!init.current) {
      prev.current.copy(p);
      c.target.set(p.x, p.y + 1.2, p.z);
      c.object.position.set(p.x, p.y + 6, p.z + 9);
      c.update();
      init.current = true;
      return;
    }
    const dx = p.x - prev.current.x, dy = p.y - prev.current.y, dz = p.z - prev.current.z;
    c.target.x += dx; c.target.y += dy; c.target.z += dz;
    c.object.position.x += dx; c.object.position.y += dy; c.object.position.z += dz;
    prev.current.copy(p);
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      minDistance={3}
      maxDistance={16}
      maxPolarAngle={Math.PI * 0.49}
      mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
    />
  );
}

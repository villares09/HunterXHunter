import Ecctrl from "ecctrl";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { CharacterModel } from "./CharacterModel";
import { registry, setPlayer } from "../registry";
import { useRPG } from "../store";
import { hitInRadius } from "../damage";
import { useSkillByCode } from "../skills";
import { startMove } from "../combat";
import { MOVES, PUNCH_COMBO, type Move } from "../data/moves";
import { heightAt } from "./Terrain";

const _tmp = new THREE.Vector3();
const CHAIN_WINDOW = 1.2;

export function Player() {
  const ref = useRef<THREE.Group>(null);
  const nextAtk = useRef(0);
  const pending = useRef<{ at: number; move: Move }[]>([]);

  const punchStep = useRef(0);
  const lastInputAt = useRef(0);
  const lastToken = useRef<"P" | "K" | "">("");
  const SPAWN: [number, number] = [60, 0]; // zona llana entre cascada y puerto
  const spawnY = heightAt(SPAWN[0], SPAWN[1]) + 2;

  useEffect(() => {
    setPlayer(ref.current);
    return () => setPlayer(null);
  }, []);

  useEffect(() => {
    const resolveMove = (token: "P" | "K", now: number): Move => {
      const chained = (now - lastInputAt.current) / 1000 <= CHAIN_WINDOW;
      if (token === "K" && chained && lastToken.current === "P") {
        punchStep.current = 0; lastToken.current = "K";
        return MOVES.flyingKnee;
      }
      if (token === "K") {
        const high = chained && lastToken.current === "K";
        punchStep.current = 0; lastToken.current = "K";
        return high ? MOVES.kickHigh : MOVES.kick;
      }
      if (chained && lastToken.current === "P") {
        punchStep.current = (punchStep.current + 1) % PUNCH_COMBO.length;
      } else {
        punchStep.current = 0;
      }
      lastToken.current = "P";
      return MOVES[PUNCH_COMBO[punchStep.current]];
    };

    const doMove = (token: "P" | "K") => {
      const now = performance.now();
      const S = useRPG.getState();
      if (S.dead || now < nextAtk.current || S.hitStop > 0 || !registry.player) return;
      const move = resolveMove(token, now);
      lastInputAt.current = now;
      nextAtk.current = now + (move.swing + move.cooldown) * 1000;
      startMove(move);
      const frames = Array.isArray(move.hitFrame) ? move.hitFrame : [move.hitFrame];
      for (const hf of frames) pending.current.push({ at: now + hf * 1000, move });
    };

    const onPointer = (e: PointerEvent) => {
      if (e.button === 0) doMove("P");
      else if (e.button === 2) doMove("K");
    };
    const onContext = (e: MouseEvent) => e.preventDefault();

    const onMouseDownCapture = (e: MouseEvent) => {
      if (e.button === 1) { e.preventDefault(); return; }
      e.stopPropagation();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyJ") { doMove("P"); return; }
      if (e.code === "KeyK") { doMove("K"); return; }
      if (useRPG.getState().dead) return;
      if (e.code.startsWith("Digit") && registry.player) {
        registry.player.getWorldPosition(_tmp);
        useSkillByCode(e.code, _tmp);
      }
    };

    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("contextmenu", onContext);
    window.addEventListener("mousedown", onMouseDownCapture, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("contextmenu", onContext);
      window.removeEventListener("mousedown", onMouseDownCapture, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useFrame(() => {
    if (!pending.current.length || !registry.player) return;
    const now = performance.now();
    registry.player.getWorldPosition(_tmp);
    const S = useRPG.getState();
    pending.current = pending.current.filter((p) => {
      if (now < p.at) return true;
      const dmg = S.baseDmg * p.move.dmg + S.combo * 1.0;
      const landed = hitInRadius(_tmp, p.move.range, dmg, { knockback: p.move.knockback });
      if (landed > 0) {
        S.addCombo();
        S.setHitStop(p.move.kind === "finisher" || p.move.kind === "heavy" ? 0.12 : 0.07);
        S.shake();
      }
      return false;
    });
  });

  return (
    <Ecctrl
      animated
      position={[SPAWN[0], spawnY, SPAWN[1]]}
      maxVelLimit={4}
      sprintMult={1.8}
      jumpVel={4}
      camInitDis={-300}
      camMaxDis={-350}
      camMinDis={-2}
    >
      <group ref={ref}>
        <CharacterModel />
      </group>
    </Ecctrl>
  );
}

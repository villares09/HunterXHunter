// src/debug/AnimDebug.tsx — TEMPORAL. Tuner de animaciones.
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations, Grid } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

const clean = (n: string) => n.replace(/^(gon|killua)_/i, "").trim();
const junk = (n: string) => /^action$/i.test(n) || /^mixamo\.com/i.test(n);

type Tune = { speed: number; swing: number; hitFrame: number };

function Model({
  url, clip, speed, swing, hitFrame, playing, loop, onTime,
}: {
  url: string; clip: string; speed: number; swing: number; hitFrame: number;
  playing: boolean; loop: boolean; onTime: (t: number) => void;
}) {
  const { scene, animations } = useGLTF(url);
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const group = useRef<THREE.Group>(null);

  const clips = useMemo(() => {
    const out: THREE.AnimationClip[] = [];
    for (const c of animations) {
      if (junk(c.name)) continue;
      const cl = c.clone();
      cl.name = clean(cl.name);
      cl.tracks = cl.tracks.filter((t) => t.name.endsWith(".quaternion"));
      out.push(cl);
    }
    return out;
  }, [animations]);

  const { actions, mixer } = useAnimations(clips, group);
  const action = clip ? actions[clip] : null;

  useEffect(() => {
    const g = group.current!;
    g.scale.setScalar(1);
    const box = new THREE.Box3().setFromObject(model);
    const s = 1.6 / (box.getSize(new THREE.Vector3()).y || 1);
    g.scale.setScalar(s);
    g.position.y = -box.min.y * s;
  }, [model]);

  useEffect(() => {
    Object.values(actions).forEach((a) => a?.stop());
    if (action) {
      action.reset();
      action.setEffectiveTimeScale(speed);
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      action.clampWhenFinished = !loop;
      action.play();
    }
  }, [actions, clip, speed, loop]);

  useFrame((_, delta) => {
    if (!action) return;
    if (!playing) { mixer.update(0); return; }
    mixer.update(delta);
    const tGame = action.time / speed;
    if (loop && tGame >= swing) action.time = 0;
    onTime(tGame);
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

export function AnimDebug({ url = "/models/gon.glb" }: { url?: string }) {
  const { animations } = useGLTF(url);
  const [clip, setClip] = useState("");
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);
  const [tunes, setTunes] = useState<Record<string, Tune>>({});

  const list = useMemo(() => {
    const seen = new Set<string>(); const out: { name: string; dur: number }[] = [];
    for (const a of animations) {
      if (junk(a.name)) continue;
      const n = clean(a.name);
      if (!seen.has(n)) { seen.add(n); out.push({ name: n, dur: a.duration }); }
    }
    return out;
  }, [animations]);

  const dur = list.find((c) => c.name === clip)?.dur ?? 1;
  const isJump = clip === "Jumping + standing";
  const tune = tunes[clip] ?? { speed: 1.5, swing: +(dur / 1.5).toFixed(2), hitFrame: +(dur / 1.5 / 2).toFixed(2) };
  const set = (patch: Partial<Tune>) => setTunes((p) => ({ ...p, [clip]: { ...tune, ...patch } }));
  const maxReal = dur / tune.speed;

  const row = (label: string, key: keyof Tune, max: number) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span><b>{tune[key].toFixed(2)}</b>
      </div>
      <input type="range" min={key === "speed" ? 0.25 : 0} max={max} step={0.01}
             value={tune[key]} onChange={(e) => set({ [key]: +e.target.value } as Partial<Tune>)}
             style={{ width: "100%" }} />
    </div>
  );

  const snippet = isJump
    ? `// en CharacterModel:  const JUMP_SPEED = ${tune.speed.toFixed(2)};\n// salto fluido a esta velocidad dura ${maxReal.toFixed(2)}s`
    : clip
    ? `${clip.replace(/\W+/g, "")}: { clip: "${clip}", hitFrame: ${tune.hitFrame.toFixed(2)}, swing: ${tune.swing.toFixed(2)}, speed: ${tune.speed.toFixed(2)} },`
    : "";

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", font: "13px monospace" }}>
      <div style={{ width: 230, overflowY: "auto", background: "#0e0e0e", color: "#ddd", padding: 8 }}>
        {list.map((c) => (
          <div key={c.name} onClick={() => { setClip(c.name); setPlaying(true); }}
               style={{ padding: "5px 6px", cursor: "pointer", borderRadius: 4,
                        background: clip === c.name ? "#2a8" : "transparent" }}>
            {c.name} <span style={{ opacity: 0.45 }}>· {c.dur.toFixed(2)}s</span>
          </div>
        ))}
      </div>

      <Canvas shadows camera={{ position: [0, 1.4, 3.4], fov: 45 }} style={{ flex: 1, background: "#1d2124" }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 6, 3]} intensity={1.3} castShadow />
        <Grid args={[12, 12]} cellColor="#3a3f44" sectionColor="#5a626a" infiniteGrid fadeDistance={20} />
        {clip && (
          <Model url={url} clip={clip} speed={tune.speed} swing={tune.swing}
                 hitFrame={tune.hitFrame} playing={playing} loop={!isJump} onTime={setT} />
        )}
        <OrbitControls target={[0, 0.9, 0]} />
      </Canvas>

      <div style={{ width: 300, background: "#0e0e0e", color: "#ddd", padding: 12 }}>
        {!clip && <div style={{ opacity: 0.6 }}>Elegí un clip.</div>}
        {clip && (
          <>
            <div style={{ fontSize: 15, marginBottom: 4 }}><b>{clip}</b> {isJump && "(modo salto)"}</div>
            <div style={{ opacity: 0.6, marginBottom: 10 }}>
              dura {dur.toFixed(2)}s · a {tune.speed.toFixed(2)}x = {maxReal.toFixed(2)}s reales
            </div>

            {row("speed (velocidad)", "speed", 3)}
            {!isJump && row("swing", "swing", maxReal)}
            {!isJump && row("hitFrame", "hitFrame", tune.swing)}

            <button onClick={() => setPlaying((p) => !p)}
                    style={{ width: "100%", padding: 6, margin: "8px 0", cursor: "pointer" }}>
              {playing ? "⏸ pausar" : "▶ reproducir"}
            </button>
            {isJump
              ? <button onClick={() => setT(-1)} style={{ width: "100%", padding: 6, marginBottom: 8, cursor: "pointer" }}>↻ reiniciar salto</button>
              : null}
            <div style={{ opacity: 0.6 }}>
              t = {t.toFixed(2)}s {!isJump && t >= tune.hitFrame && t < tune.hitFrame + 0.08 ? "💥 HIT" : ""}
            </div>

            {isJump && (
              <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5, background: "#161a1d", padding: 8, borderRadius: 6 }}>
                <b>Para calibrar el salto:</b><br />
                Movés <b>speed</b> hasta que el gesto de saltar se vea fluido (ni robótico ni lento).<br />
                Anotá ese <b>speed</b> → ese es tu <b>JUMP_SPEED</b>.
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 11, opacity: 0.7 }}>resultado:</div>
            <textarea readOnly value={snippet} onFocus={(e) => e.currentTarget.select()}
              style={{ width: "100%", height: 60, background: "#000", color: "#6f6", border: "1px solid #333", fontSize: 11, marginTop: 4 }} />
          </>
        )}
      </div>
    </div>
  );
}

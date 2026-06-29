import { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF, OrbitControls, TransformControls, Grid, useTexture } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getProp } from "../data/world";
import { heightAt, Terrain } from "../components/Terrain";
import { flattenRect } from "../data/terrainStore";
import { ANCHO_TOTAL_3D, ALTO_TOTAL_3D, islandCenter } from "../data/island";
import { useEditor, type Instance } from "../data/editorStore";

const NO_BTN = -1 as unknown as THREE.MOUSE;

/* ===== pasos del nudge ===== */
const NUDGE_STEP = 0.5;   // Q/E: cuánto baja/sube en Y por pulsación
const MOVE_STEP = 2;      // WASD: cuánto mueve en X/Z por pulsación (con G activo)
const RADIUS_STEP = 5;    // R/F: cuánto cambia el radio por pulsación
const RADIUS_MIN = 10, RADIUS_MAX = 300;
/* ===== aplanar (T) ===== */
const FLATTEN_MARGIN = 12;  // cuánto se extiende el área plana más allá de las casas
const FLATTEN_FALLOFF = 16; // ancho del borde suave alrededor de la plaza

function useModel(propId: string) {
  const def = getProp(propId);
  const { scene } = useGLTF(def.url);
  return useMemo(() => {
    const m = scene.clone(true);
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const s = def.height / (size.y || 1);
    m.scale.setScalar(s);
    m.position.y = -box.min.y * s;
    m.traverse((o) => {
      const me = o as THREE.Mesh;
      if (me.isMesh) { me.castShadow = true; me.frustumCulled = false; }
    });
    return m;
  }, [scene, def]);
}

function EditableProp({
  inst, selected, grabbed, onSelect,
}: {
  inst: Instance;
  selected: boolean;
  grabbed: boolean;
  onSelect: (key: string, obj: THREE.Object3D) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const model = useModel(inst.propId);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    const y = inst.pos[1] === 0 ? heightAt(inst.pos[0], inst.pos[2]) : inst.pos[1];
    g.position.set(inst.pos[0], y, inst.pos[2]);
    g.rotation.set(0, inst.rot, 0);
    g.scale.setScalar(inst.scale);
  }, [inst.pos, inst.rot, inst.scale]);

  return (
    <group
      ref={ref}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (ref.current) onSelect(inst.key, ref.current);
      }}
    >
      <primitive object={model} />
      {selected && (
        <mesh position={[0, 0.1, 0]}>
          <ringGeometry args={[1.6, 1.9, 32]} />
          <meshBasicMaterial color="#ffd23f" side={THREE.DoubleSide} />
        </mesh>
      )}
      {grabbed && (
        <mesh position={[0, 0.12, 0]}>
          <ringGeometry args={[1.2, 1.5, 24]} />
          <meshBasicMaterial color="#43e08a" side={THREE.DoubleSide} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}

function MapRef() {
  const tex = useTexture("/assets/mapa-isla.png");
  const c = islandCenter();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 90, c.y]}>
      <planeGeometry args={[ANCHO_TOTAL_3D, ALTO_TOTAL_3D]} />
      <meshBasicMaterial map={tex} transparent opacity={0.4} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

export function WorldEditor() {
  const { camera } = useThree();
  const instances = useEditor((s) => s.instances);
  const selected = useEditor((s) => s.selected);
  const gizmo = useEditor((s) => s.gizmo);
  const snap = useEditor((s) => s.snap);
  const showMap = useEditor((s) => s.showMap);
  const nudgeRadius = useEditor((s) => s.nudgeRadius);
  const grabbed = useEditor((s) => s.grabbed);
  const setSelected = useEditor((s) => s.setSelected);
  const commit = useEditor((s) => s.commit);
  const remove = useEditor((s) => s.remove);
  const setSpawn = useEditor((s) => s.setSpawn);

  const [selObj, setSelObj] = useState<THREE.Object3D | null>(null);
  const [dragging, setDragging] = useState(false);
  const c = useMemo(() => islandCenter(), []);
  const nudgeRingRef = useRef<THREE.Mesh>(null);
  const grabbedSet = useMemo(() => new Set(grabbed ?? []), [grabbed]);

  useEffect(() => {
    camera.position.set(c.x, 180, c.y + 230);
    camera.lookAt(c.x, 0, c.y);
  }, [camera, c]);

  useEffect(() => { useEditor.getState().release(); }, []);

  const ringGeo = useMemo(
    () => new THREE.RingGeometry(Math.max(1, nudgeRadius - 1.5), nudgeRadius, 64),
    [nudgeRadius]
  );

  const ray = useMemo(() => new THREE.Raycaster(), []);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    if (ray.ray.intersectPlane(groundPlane, hit)) {
      setSpawn([hit.x, 0, hit.z]);
      if (nudgeRingRef.current) nudgeRingRef.current.position.set(hit.x, 0.15, hit.z);
    }
  });

  useEffect(() => { if (!selected) setSelObj(null); }, [selected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useEditor.getState();
      const [sx, , sz] = st.spawn;

      if ((e.key === "Delete" || e.key === "Backspace") && st.selected) { remove(st.selected); return; }
      if (e.key === "Escape") { st.release(); return; }

      // R/F: radio del anillo
      if (e.code === "KeyR") { st.setNudgeRadius(Math.min(RADIUS_MAX, st.nudgeRadius + RADIUS_STEP)); return; }
      if (e.code === "KeyF") { st.setNudgeRadius(Math.max(RADIUS_MIN, st.nudgeRadius - RADIUS_STEP)); return; }

      // G: agarrar / soltar lo que esté en el anillo
      if (e.code === "KeyG") {
        if (st.grabbed) st.release();
        else st.grab(sx, sz, st.nudgeRadius);
        return;
      }

      // T: aplanar terreno bajo el grupo agarrado, a un nivel común (promedio)
      if (e.code === "KeyT" && st.grabbed && st.grabbed.length) {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        let sum = 0, cnt = 0;
        for (const k of st.grabbed) {
          const inst = st.instances.find((i) => i.key === k);
          if (!inst) continue;
          const x = inst.pos[0], z = inst.pos[2];
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
          sum += heightAt(x, z); cnt++;
        }
        if (!cnt) return;
        let level = sum / cnt;
        if (level === 0) level = 0.001; // evita el modo "auto" (pos[1]===0)
        flattenRect(minX - FLATTEN_MARGIN, maxX + FLATTEN_MARGIN, minZ - FLATTEN_MARGIN, maxZ + FLATTEN_MARGIN, level, FLATTEN_FALLOFF);
        st.anchorKeysTo(st.grabbed, level);
        return;
      }

      // Q/E: bajar / subir
      if (e.code === "KeyQ" || e.code === "KeyE") {
        const dy = e.code === "KeyQ" ? -NUDGE_STEP : NUDGE_STEP;
        if (st.grabbed) st.nudgeKeys(st.grabbed, 0, dy, 0);
        else st.nudgeArea(sx, sz, st.nudgeRadius, dy);
        return;
      }

      // WASD: mover en horizontal (solo con algo agarrado)
      if (st.grabbed && (e.code === "KeyW" || e.code === "KeyS" || e.code === "KeyA" || e.code === "KeyD")) {
        let dx = 0, dz = 0;
        if (e.code === "KeyW") dz = -MOVE_STEP;
        else if (e.code === "KeyS") dz = MOVE_STEP;
        else if (e.code === "KeyA") dx = -MOVE_STEP;
        else if (e.code === "KeyD") dx = MOVE_STEP;
        st.nudgeKeys(st.grabbed, dx, 0, dz);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [remove]);

  const onSelect = (key: string, obj: THREE.Object3D) => { setSelected(key); setSelObj(obj); };

  const onCommit = () => {
    if (!selected || !selObj) return;
    const p = selObj.position;
    let py = p.y;
    if (snap && gizmo === "translate") py = heightAt(p.x, p.z);
    const e = new THREE.Euler().setFromQuaternion(selObj.quaternion, "YXZ");
    commit(selected, [p.x, py, p.z], e.y, selObj.scale.x);
  };

  return (
    <>
      <OrbitControls
        makeDefault
        enabled={!dragging}
        target={[c.x, 0, c.y]}
        enablePan
        zoomToCursor
        screenSpacePanning
        minDistance={3}
        maxDistance={1200}
        maxPolarAngle={Math.PI / 2.05}
        mouseButtons={{ LEFT: NO_BTN, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }}
      />

      <Terrain refOnly />
      <hemisphereLight args={["#ffe9c2", "#46603a", 0.9]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[120, 160, 60]} intensity={1.4} color="#ffe2b0" castShadow />
      {showMap && <MapRef />}

      <Grid args={[1600, 1600]} cellSize={20} sectionSize={100} infiniteGrid fadeDistance={900} position={[0, 0.1, 0]} />

      <mesh ref={nudgeRingRef} geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          color={grabbed ? "#43e08a" : "#4ec5e0"}
          transparent
          opacity={grabbed ? 0.4 : 0.25}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>

      <group onPointerMissed={() => { setSelected(null); setSelObj(null); }}>
        {instances.map((i) => (
          <EditableProp
            key={i.key}
            inst={i}
            selected={i.key === selected}
            grabbed={grabbedSet.has(i.key)}
            onSelect={onSelect}
          />
        ))}
      </group>

      {selObj && (
        <TransformControls
          object={selObj}
          mode={gizmo}
          onMouseDown={() => setDragging(true)}
          onMouseUp={() => { setDragging(false); onCommit(); }}
        />
      )}
    </>
  );
}

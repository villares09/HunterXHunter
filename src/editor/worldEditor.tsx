import { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF, OrbitControls, TransformControls, Grid } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getProp } from "../data/world";
import { heightAt } from "../components/Terrain";
import { Terrain } from "../components/Terrain";
import { useEditor, type Instance } from "../data/editorStore";

/* modelo clonado y normalizado a def.height (scale 1). El scale de la instancia
   va en el group, así el gizmo de escala edita group.scale directamente. */
function useModel(propId: string) {
  const def = getProp(propId);
  const { scene } = useGLTF(def.url);
  return useMemo(() => {
    const m = scene.clone(true);
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const s = def.height / (size.y || 1);
    m.scale.setScalar(s);
    m.position.y = -box.min.y * s; // base en y=0 del group
    m.traverse((o) => {
      const me = o as THREE.Mesh;
      if (me.isMesh) { me.castShadow = true; me.frustumCulled = false; }
    });
    return m;
  }, [scene, def]);
}

function EditableProp({
  inst,
  selected,
  onSelect,
}: {
  inst: Instance;
  selected: boolean;
  onSelect: (key: string, obj: THREE.Object3D) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const model = useModel(inst.propId);
  const y = inst.pos[1] === 0 ? heightAt(inst.pos[0], inst.pos[2]) : inst.pos[1];

  return (
    <group
      ref={ref}
      position={[inst.pos[0], y, inst.pos[2]]}
      rotation={[0, inst.rot, 0]}
      scale={inst.scale}
      onPointerDown={(e) => {
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
    </group>
  );
}

export function WorldEditor() {
  const { camera } = useThree();
  const instances = useEditor((s) => s.instances);
  const selected = useEditor((s) => s.selected);
  const gizmo = useEditor((s) => s.gizmo);
  const snap = useEditor((s) => s.snap);
  const setSelected = useEditor((s) => s.setSelected);
  const commit = useEditor((s) => s.commit);
  const remove = useEditor((s) => s.remove);

  const [selObj, setSelObj] = useState<THREE.Object3D | null>(null);
  const [dragging, setDragging] = useState(false);

  // cámara alejada al entrar
  useEffect(() => {
    camera.position.set(0, 180, 230);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // si se deselecciona desde el HUD/borrado, soltar el objeto
  useEffect(() => {
    if (!selected) setSelObj(null);
  }, [selected]);

  // borrar con Supr/Backspace
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selected) remove(selected);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, remove]);

  const onSelect = (key: string, obj: THREE.Object3D) => {
    setSelected(key);
    setSelObj(obj);
  };

  const onCommit = () => {
    if (!selected || !selObj) return;
    const p = selObj.position;
    let py = p.y;
    if (snap && gizmo === "translate") py = heightAt(p.x, p.z);
    commit(selected, [p.x, py, p.z], selObj.rotation.y, selObj.scale.x);
  };

  return (
    <>
      <OrbitControls makeDefault enabled={!dragging} target={[0, 0, 0]} />

      {/* terreno como referencia (sin física: sculptMode salta el RigidBody) */}
      <Terrain sculptMode />
      <hemisphereLight args={["#ffe9c2", "#46603a", 0.9]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[120, 160, 60]} intensity={1.4} color="#ffe2b0" castShadow />

      <Grid args={[800, 800]} cellSize={20} sectionSize={100} infiniteGrid fadeDistance={600} position={[0, 0.1, 0]} />

      <group onPointerMissed={() => { setSelected(null); setSelObj(null); }}>
        {instances.map((i) => (
          <EditableProp key={i.key} inst={i} selected={i.key === selected} onSelect={onSelect} />
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

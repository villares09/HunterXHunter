import { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF, OrbitControls, TransformControls, Grid, useTexture } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getProp } from "../data/world";
import { heightAt, Terrain } from "../components/Terrain";
import { ANCHO_TOTAL_3D, ALTO_TOTAL_3D, islandCenter } from "../data/island";
import { useEditor, type Instance } from "../data/editorStore";

const NO_BTN = -1 as unknown as THREE.MOUSE;

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
  inst, selected, onSelect,
}: {
  inst: Instance;
  selected: boolean;
  onSelect: (key: string, obj: THREE.Object3D) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const model = useModel(inst.propId);

  // Aplica la transformación del store al group SOLO cuando cambian los valores
  // guardados (no en cada render). De ahí en más lo maneja el gizmo, sin que
  // React lo pise -> ya no "vuelve" al soltar.
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
        if (e.button !== 0) return; // sólo clic izq selecciona (der = orbitar)
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
  const setSelected = useEditor((s) => s.setSelected);
  const commit = useEditor((s) => s.commit);
  const remove = useEditor((s) => s.remove);
  const setSpawn = useEditor((s) => s.setSpawn);

  const [selObj, setSelObj] = useState<THREE.Object3D | null>(null);
  const [dragging, setDragging] = useState(false);
  const c = useMemo(() => islandCenter(), []);

  useEffect(() => {
    camera.position.set(c.x, 180, c.y + 230);
    camera.lookAt(c.x, 0, c.y);
  }, [camera, c]);

  // centro de lo que mira la cámara, proyectado al plano del suelo -> punto de spawn
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    ray.setFromCamera(new THREE.Vector2(0, 0), camera); // centro de pantalla
    if (ray.ray.intersectPlane(groundPlane, hit)) {
      setSpawn([hit.x, 0, hit.z]); // pos[1]=0 -> Prop lo apoya al terreno con heightAt
    }
  });

  useEffect(() => { if (!selected) setSelObj(null); }, [selected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selected) remove(selected);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, remove]);

  const onSelect = (key: string, obj: THREE.Object3D) => { setSelected(key); setSelObj(obj); };

  // Lee la transformación REAL del objeto (posición, rotación Y y escala) y la guarda.
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
      {/* clic izq = seleccionar/mover objetos · clic der = rotar cámara · medio = paneo · rueda = zoom */}
      <OrbitControls
        makeDefault
        enabled={!dragging}
        target={[c.x, 0, c.y]}
        enablePan
        mouseButtons={{ LEFT: NO_BTN, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }}
      />

      <Terrain refOnly />
      <hemisphereLight args={["#ffe9c2", "#46603a", 0.9]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[120, 160, 60]} intensity={1.4} color="#ffe2b0" castShadow />
      {showMap && <MapRef />}

      <Grid args={[1600, 1600]} cellSize={20} sectionSize={100} infiniteGrid fadeDistance={900} position={[0, 0.1, 0]} />

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

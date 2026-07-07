import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useTarget } from "@/targeting";
import { auto, pendingSlot } from "@/components/movement";

/**
 * Nameplate flotante 3D sobre una unidad (Fase 2d-A).
 *
 * El nameplate vive DENTRO de un group que rota (el personaje/enemigo gira al
 * caminar). Para que el texto quede SIEMPRE de frente a la cámara sin heredar
 * ese giro, cada frame seteamos la orientación en espacio-MUNDO: tomamos la
 * cuaternión de la cámara y le restamos la rotación mundial del padre. Así el
 * resultado neto es "mirar a la cámara" pase lo que pase con el padre.
 *
 * - Nombre siempre visible.
 * - Enemigo: "LVL n" arriba del nombre, en renglón aparte.
 * - Dos pelotitas a los lados del nombre, SOLO con target. Azul = pasivo, rojo = agresión.
 */
export function Nameplate({
  name,
  level,
  y = 2.5,
  kind = "enemy",
  targetId,
}: {
  name: string;
  level?: number;
  y?: number;
  kind?: "enemy" | "player";
  targetId?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const orbL = useRef<THREE.Mesh>(null);
  const orbR = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const BLUE = useRef(new THREE.Color("#4aa3ff")).current;
  const RED = useRef(new THREE.Color("#ff4d4d")).current;

  // temporales reutilizables (sin alocar por frame)
  const parentQ = useRef(new THREE.Quaternion()).current;
  const outQ = useRef(new THREE.Quaternion()).current;

  useFrame(() => {
    const g = group.current;
    if (!g) return;

    // orientación en espacio-mundo = cámara, PERO cancelando la rotación del padre.
    // outQ = inverse(parentWorldQuat) * cameraQuat  -> mira a la cámara neto.
    if (g.parent) {
      g.parent.getWorldQuaternion(parentQ);
      outQ.copy(parentQ).invert().multiply(camera.quaternion);
      g.quaternion.copy(outQ);
    } else {
      g.quaternion.copy(camera.quaternion);
    }

    // pelotitas: visibles solo si esta unidad está targeteada
    const t = useTarget.getState().target;
    const targeted =
      kind === "enemy" && t?.kind === "enemy" && targetId !== undefined && t.id === targetId;
    const aggro =
      targeted &&
      ((auto.active && auto.enemyId === targetId) || pendingSlot.id != null);
    const col = aggro ? RED : BLUE;

    for (const orb of [orbL.current, orbR.current]) {
      if (!orb) continue;
      orb.visible = !!targeted;
      if (targeted) (orb.material as THREE.MeshBasicMaterial).color.copy(col);
    }
  });

  return (
    <group ref={group} position={[0, y, 0]}>
      {kind === "enemy" && level !== undefined && (
        <Text
          position={[0, 0.34, 0]}
          fontSize={0.26}
          color="#ffd479"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.018}
          outlineColor="#1a0d00"
          material-depthTest={false}
          renderOrder={998}
        >
          {`LVL ${level}`}
        </Text>
      )}

      <Text
        fontSize={0.22}
        color="#eef6ff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.022}
        outlineColor="#0a0f16"
        material-depthTest={false}
        renderOrder={999}
      >
        {name}
      </Text>

      <mesh ref={orbL} position={[-0.42, 0, 0]} visible={false} renderOrder={999}>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshBasicMaterial depthTest={false} />
      </mesh>
      <mesh ref={orbR} position={[0.42, 0, 0]} visible={false} renderOrder={999}>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshBasicMaterial depthTest={false} />
      </mesh>
    </group>
  );
}

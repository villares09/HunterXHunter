import { useState } from "react";

// Entrás con ?place en la URL. Clickeás el suelo -> imprime en consola y copia [x, 0, z].
export function DevPlacer() {
  const on = new URLSearchParams(location.search).has("place");
  const [marks, setMarks] = useState<[number, number, number][]>([]);
  if (!on) return null;

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
        onClick={(e) => {
          e.stopPropagation();
          const x = Math.round(e.point.x * 10) / 10;
          const z = Math.round(e.point.z * 10) / 10;
          const str = `[${x}, 0, ${z}]`;
          console.log("PLACE", str);
          navigator.clipboard?.writeText(str);
          setMarks((m) => [...m, [x, 0.5, z]]);
        }}
      >
        <planeGeometry args={[1200, 1200]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {marks.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[1.2, 12, 12]} />
          <meshBasicMaterial color="#ff3b3b" />
        </mesh>
      ))}
    </>
  );
}

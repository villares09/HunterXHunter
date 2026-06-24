import { Prop } from "./Prop";
import { useEditor } from "../data/editorStore";

/* Renderiza en el JUEGO los assets colocados con el editor (?edit).
   Lee el mismo store que el editor (persistido en localStorage). */
export function PlacedProps() {
  const instances = useEditor((s) => s.instances);
  return (
    <>
      {instances.map((i) => (
        <Prop key={i.key} propId={i.propId} position={i.pos} rotation={i.rot} scale={i.scale} />
      ))}
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { useTarget } from "@/targeting";
import { registry } from "@/registry";
import { UnitFrame } from "@/components/UnitFrame";

/**
 * Barra del objetivo (estilo L2), fija arriba-centro de la pantalla.
 * El HP del enemigo NO es reactivo (se muta por frame en el registry), así que
 * lo leemos con un loop de requestAnimationFrame y actualizamos solo el % local.
 * Aparece cuando hay target enemigo; se esconde cuando no.
 */
export function TargetFrame() {
  const target = useTarget((s) => s.target);
  const [pct, setPct] = useState(100);

  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!target || target.kind !== "enemy") return;
    let raf = 0;
    const loop = () => {
      const en = registry.enemies.get(target.id);
      if (en && en.maxHp > 0) {
        const p = Math.max(0, Math.min(100, (en.hp / en.maxHp) * 100));
        // escribir directo al DOM evita re-render por frame; el % del texto lo
        // actualizamos con un throttle liviano vía setState redondeado.
        if (fillRef.current) fillRef.current.style.width = `${p}%`;
        setPct((prev) => (Math.round(prev) !== Math.round(p) ? p : prev));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  if (!target || target.kind !== "enemy") return null;

  return (
    <div className="target-wrap">
      <UnitFrame name={target.name} compact>
        <div className="statbar thin target-hp">
          <div ref={fillRef} className="statbar-fill sb-hp" style={{ width: `${pct}%` }} />
          <div className="statbar-text">
            <span className="statbar-readout">{Math.round(pct)}%</span>
          </div>
        </div>
      </UnitFrame>
    </div>
  );
}

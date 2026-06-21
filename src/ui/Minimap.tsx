import { useEffect, useRef } from "react";
import * as THREE from "three";
import { registry } from "../registry";

const RANGE = 45; // unidades de mundo que abarca el radio del minimapa
const _pp = new THREE.Vector3();
const _ep = new THREE.Vector3();
const _fwd = new THREE.Vector3();

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;
    const dpr = Math.min(devicePixelRatio, 2);
    const size = 168;
    cvs.width = size * dpr;
    cvs.height = size * dpr;
    ctx.scale(dpr, dpr);
    const cx = size / 2;
    const cy = size / 2;
    const scale = cx / RANGE;
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, size, size);

      // anillos de referencia
      ctx.strokeStyle = "rgba(86,194,255,0.18)";
      ctx.lineWidth = 1;
      [0.5, 1].forEach((f) => {
        ctx.beginPath();
        ctx.arc(cx, cy, cx * f, 0, Math.PI * 2);
        ctx.stroke();
      });

      const player = registry.player;
      if (!player) return;
      player.getWorldPosition(_pp);

      // dirección de mirada del jugador (para la flecha)
      player.getWorldDirection(_fwd); // -Z local en mundo
      const yaw = Math.atan2(_fwd.x, _fwd.z);

      // objetivos (enemigos vivos) en ROJO
      registry.enemies.forEach((en) => {
        if (!en.alive) return;
        en.obj.getWorldPosition(_ep);
        let dx = (_ep.x - _pp.x) * scale;
        let dz = (_ep.z - _pp.z) * scale;
        // recortar al borde del círculo si está fuera de rango
        const d = Math.hypot(dx, dz);
        if (d > cx - 5) {
          dx = (dx / d) * (cx - 5);
          dz = (dz / d) * (cx - 5);
        }
        const x = cx + dx;
        const y = cy + dz;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ff4d4d";
        ctx.shadowColor = "#ff4d4d";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // jugador: triángulo dorado apuntando a su dirección
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-yaw);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 6);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fillStyle = "#ffc24b";
      ctx.fill();
      ctx.restore();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas id="minimap" ref={canvasRef} />;
}

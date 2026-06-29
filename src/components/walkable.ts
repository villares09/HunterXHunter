import { heightAt, getMeta, getBiome, BIOME_SWAMP } from "../data/terrainStore";
import { OCEAN_Y } from "../data/island";

const WATER_MARGIN = 1.2; // margen sobre el agua: no pisar la orilla mojada

function biomeAt(x: number, z: number): number {
  const m = getMeta(), b = getBiome();
  const gi = Math.round((x - m.x0) / m.cell);
  const gj = Math.round((z - m.z0) / m.cell);
  if (gi < 0 || gi > m.nx || gj < 0 || gj > m.nz) return 0;
  return b[gj * (m.nx + 1) + gi] ?? 0;
}

/* Fuente de verdad de "¿puedo pisar acá?": bloquea océano/orilla y pantano. */
export function isWalkable(x: number, z: number): boolean {
  if (heightAt(x, z) < OCEAN_Y + WATER_MARGIN) return false; // océano / orilla
  if (biomeAt(x, z) === BIOME_SWAMP) return false;           // pantano
  return true;
}

/* Marcha de (fx,fz) hacia (tx,tz) y devuelve el último punto PISABLE antes de
   tocar agua/pantano. Si el destino ya es pisable, lo devuelve tal cual.
   Resultado: si clickeás el mar, el personaje frena en la orilla. */
export function clampWalkable(
  fx: number, fz: number, tx: number, tz: number
): [number, number] {
  if (isWalkable(tx, tz)) return [tx, tz];
  const dx = tx - fx, dz = tz - fz;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-3) return [fx, fz];
  const STEP = 1.0;
  const n = Math.floor(dist / STEP);
  let lx = fx, lz = fz;
  for (let i = 1; i <= n; i++) {
    const t = (i * STEP) / dist;
    const px = fx + dx * t, pz = fz + dz * t;
    if (!isWalkable(px, pz)) break;
    lx = px; lz = pz;
  }
  return [lx, lz];
}

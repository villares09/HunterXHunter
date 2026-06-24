import * as THREE from "three";
import { getCoastNorm, coastVersion } from "./coastStore";

// ===== tamaño global de la isla =====
export const ISLAND_SCALE = 2.8;
const UNIT = 60;
export const WORLD_S = ISLAND_SCALE * UNIT;

export const ANCHO_TOTAL_3D = (1.30 - (-1.30)) * ISLAND_SCALE * UNIT * 1.05;
export const ALTO_TOTAL_3D = ANCHO_TOTAL_3D * (1800 / 2500);

export const LAND_Y = 0;
export const OCEAN_Y = -2.2;
const CLIFF_BOTTOM = OCEAN_Y - 1.8;
const UV_TILE = 8;

/* ===== costa (viene del store, cacheada por versión) ===== */
let _outline: THREE.Vector2[] | null = null;
let _outlineV = -1;
let _center: THREE.Vector2 | null = null;
let _bb: { minX: number; maxX: number; minZ: number; maxZ: number } | null = null;

export function coastPolygon(): THREE.Vector2[] {
  if (!_outline || _outlineV !== coastVersion()) {
    const s = ISLAND_SCALE * UNIT;
    _outline = getCoastNorm().map(([x, z]) => new THREE.Vector2(x * s, z * s));
    _outlineV = coastVersion();
    _center = null;
    _bb = null;
  }
  return _outline;
}

export function islandCenter(): THREE.Vector2 {
  coastPolygon();
  if (!_center) {
    const c = new THREE.Vector2();
    _outline!.forEach((p) => c.add(p));
    c.multiplyScalar(1 / _outline!.length);
    _center = c;
  }
  return _center.clone();
}

export function coastPolygonInset(scale: number): THREE.Vector2[] {
  const c = islandCenter();
  return coastPolygon().map(
    (p) => new THREE.Vector2(c.x + (p.x - c.x) * scale, c.y + (p.y - c.y) * scale)
  );
}

export function coastAt(t: number, insetScale = 1): THREE.Vector2 {
  const pts = insetScale === 1 ? coastPolygon() : coastPolygonInset(insetScale);
  const n = pts.length;
  const f = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(f) % n;
  const a = pts[i], b = pts[(i + 1) % n];
  const k = f - Math.floor(f);
  return new THREE.Vector2(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
}

export function isLand(x: number, z: number, inset = 1): boolean {
  const pts = coastPolygon();
  let px = x, pz = z;
  if (inset !== 1) {
    const c = islandCenter();
    px = c.x + (x - c.x) / inset;
    pz = c.y + (z - c.y) / inset;
  }
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, zi = pts[i].y, xj = pts[j].x, zj = pts[j].y;
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi)
      inside = !inside;
  }
  return inside;
}

function bbox() {
  coastPolygon();
  if (!_bb) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    _outline!.forEach((p) => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.y); maxZ = Math.max(maxZ, p.y);
    });
    _bb = { minX, maxX, minZ, maxZ };
  }
  return _bb;
}

export function randomLandPoint(_a = 0, _b = 0): [number, number, number] {
  const bb = bbox();
  for (let i = 0; i < 150; i++) {
    const x = bb.minX + Math.random() * (bb.maxX - bb.minX);
    const z = bb.minZ + Math.random() * (bb.maxZ - bb.minZ);
    if (isLand(x, z, 0.82)) return [x, LAND_Y, z];
  }
  const c = islandCenter();
  return [c.x, LAND_Y, c.y];
}

export function buildLandGeometry(insetScale: number, y: number): THREE.BufferGeometry {
  const c = islandCenter();
  const pts = coastPolygon().map(
    (p) => new THREE.Vector2(c.x + (p.x - c.x) * insetScale, c.y + (p.y - c.y) * insetScale)
  );
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.closePath();

  const flat = new THREE.ShapeGeometry(shape, 14);
  const src = flat.attributes.position.array as ArrayLike<number>;
  const n = flat.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const sx = src[i * 3], sy = src[i * 3 + 1];
    pos[i * 3] = sx; pos[i * 3 + 1] = y; pos[i * 3 + 2] = sy;
    nor[i * 3 + 1] = 1;
    uv[i * 2] = sx / UV_TILE; uv[i * 2 + 1] = sy / UV_TILE;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  if (flat.index) g.setIndex(Array.from(flat.index.array));
  flat.dispose();
  return g;
}

export function buildCliffGeometry(): THREE.BufferGeometry {
  const top = coastPolygon();
  const c = islandCenter();
  const n = top.length;
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  let v = 0;
  for (let i = 0; i < n; i++) {
    const a = top[i], b = top[(i + 1) % n];
    const mx = (a.x + b.x) / 2 - c.x, mz = (a.y + b.y) / 2 - c.y;
    const ex = b.x - a.x, ez = b.y - a.y;
    let nx = ez, nz = -ex;
    if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
    const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    pos.push(a.x, LAND_Y, a.y, b.x, LAND_Y, b.y, b.x, CLIFF_BOTTOM, b.y, a.x, CLIFF_BOTTOM, a.y);
    for (let k = 0; k < 4; k++) nor.push(nx, 0, nz);
    idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
    v += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

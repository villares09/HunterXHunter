import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

function makeGrassGeometry(): THREE.BufferGeometry {
  const positions: number[] = [], colors: number[] = [], normals: number[] = [], indices: number[] = [];
  const base = new THREE.Color("#2f5d2a"), tip = new THREE.Color("#74c24a");
  const BLADES = 5;
  let v = 0;
  for (let b = 0; b < BLADES; b++) {
    const ang = (b / BLADES) * Math.PI * 2 + Math.random() * 0.6;
    const dist = Math.random() * 0.12;
    const ox = Math.cos(ang) * dist, oz = Math.sin(ang) * dist;
    const w = 0.05 + Math.random() * 0.03;
    const h = 0.3 + Math.random() * 0.22;
    const rot = Math.random() * Math.PI;
    const bx = (Math.random() - 0.5) * 0.12, bz = (Math.random() - 0.5) * 0.12;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const local = [[-w / 2, 0, 0], [w / 2, 0, 0], [w / 2 + bx, h, bz], [-w / 2 + bx, h, bz]];
    for (const [lx, ly, lz] of local) {
      positions.push(lx * cos - lz * sin + ox, ly, lx * sin + lz * cos + oz);
      normals.push(0, 1, 0);
      const c = base.clone().lerp(tip, ly / h);
      colors.push(c.r, c.g, c.b);
    }
    indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
    v += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setIndex(indices);
  return g;
}

function makeFlowerGeometry(): THREE.BufferGeometry {
  const positions: number[] = [], normals: number[] = [], indices: number[] = [];
  const s = 0.11, h = 0.32;
  let v = 0;
  for (let i = 0; i < 2; i++) {
    const rot = (i * Math.PI) / 2;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const local = [[-s, h - s, 0], [s, h - s, 0], [s, h + s, 0], [-s, h + s, 0]];
    for (const [lx, ly, lz] of local) {
      positions.push(lx * cos - lz * sin, ly, lx * sin + lz * cos);
      normals.push(0, 1, 0);
    }
    indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
    v += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setIndex(indices);
  return g;
}

function scatter(count: number, half: number, accept: (x: number, z: number) => boolean) {
  const pts: { x: number; z: number }[] = [];
  let guard = 0;
  while (pts.length < count && guard < count * 8) {
    guard++;
    const x = (Math.random() * 2 - 1) * half, z = (Math.random() * 2 - 1) * half;
    if (!accept(x, z)) continue;
    pts.push({ x, z });
  }
  return pts;
}

export function Foliage({
  count = 4200,
  area = 215,
  flowerRatio = 0.06,
  accept = () => true,
}: {
  count?: number;
  area?: number;
  flowerRatio?: number;
  accept?: (x: number, z: number) => boolean;
}) {
  const grassGeo = useMemo(makeGrassGeometry, []);
  const flowerGeo = useMemo(makeFlowerGeometry, []);
  const grassMat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1, metalness: 0 }),
    []
  );
  const flowerMat = useMemo(
    () => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, metalness: 0 }),
    []
  );

  const points = useMemo(() => scatter(count, area / 2, accept), [count, area, accept]);
  const flowerCount = Math.floor(points.length * flowerRatio);
  const flowerColors = useMemo(
    () => ["#ff6b8a", "#ffd23f", "#ffffff", "#c77dff", "#ff924c"].map((c) => new THREE.Color(c)),
    []
  );

  const grassRef = useRef<THREE.InstancedMesh>(null);
  const flowerRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = grassRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const pos = new THREE.Vector3(), scl = new THREE.Vector3(), tint = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    points.forEach((p, i) => {
      q.setFromAxisAngle(up, Math.random() * Math.PI * 2);
      const s = 0.7 + Math.random() * 0.8;
      scl.set(s, s * (0.85 + Math.random() * 0.5), s);
      pos.set(p.x, 0, p.z);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(i, m);
      const r = Math.random();
      if (r < 0.33) tint.setRGB(1.1, 1.05, 0.8);
      else if (r < 0.66) tint.setRGB(0.8, 0.92, 0.8);
      else tint.setRGB(0.92, 1.08, 0.9);
      mesh.setColorAt(i, tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [points]);

  useLayoutEffect(() => {
    const mesh = flowerRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const pos = new THREE.Vector3(), scl = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const stride = Math.max(1, Math.floor(points.length / Math.max(1, flowerCount)));
    for (let i = 0; i < flowerCount; i++) {
      const p = points[(i * stride) % points.length];
      q.setFromAxisAngle(up, Math.random() * Math.PI * 2);
      const s = 0.8 + Math.random() * 0.7;
      scl.set(s, s, s);
      pos.set(p.x, 0, p.z);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, flowerColors[i % flowerColors.length]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [points, flowerCount, flowerColors]);

  return (
    <>
      <instancedMesh ref={grassRef} args={[grassGeo, grassMat, Math.max(1, points.length)]} frustumCulled={false} />
      <instancedMesh ref={flowerRef} args={[flowerGeo, flowerMat, Math.max(1, flowerCount)]} frustumCulled={false} />
    </>
  );
}

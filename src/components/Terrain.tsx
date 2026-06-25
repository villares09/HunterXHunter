import { useEffect, useMemo, useRef, useState } from "react";
import { useTexture } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import { RigidBody, HeightfieldCollider } from "@react-three/rapier";
import * as THREE from "three";
import { OCEAN_Y } from "../data/island";
import {
  getMeta, getHeights, getBiome, useTerrain, sculpt, setFlattenLevel,
  BIOME_GRASS, BIOME_ROCK, BIOME_SNOW, BIOME_SAND,
} from "../data/terrainStore";

// re-exporto heightAt para que Prop/Player/editor lo sigan importando desde acá
export { heightAt } from "../data/terrainStore";

const UV_TILE = 8;
const SNOW_Y = 40, ROCK_SLOPE = 0.5;

function toonGradient(): THREE.DataTexture {
  const data = new Uint8Array([90, 170, 255]);
  const t = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

const tile = (t: THREE.Texture) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  return t;
};

/* Escribe PESOS por vértice (peso 1 al bioma de ese vértice, 0 al resto).
   Los pesos interpolan bien -> en los bordes se mezclan solo los 2 biomas reales,
   sin biomas fantasma. bw0 = pasto/roca/nieve/arena · bw1 = pantano/camino/pueblo. */
function fillGeometry(geo: THREE.BufferGeometry) {
  const m = getMeta(), h = getHeights(), bio = getBiome(), W = m.nx + 1;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let j = 0; j <= m.nz; j++)
    for (let i = 0; i <= m.nx; i++)
      pos.setY(j * W + i, h[j * W + i]);
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const bw0 = geo.attributes.bw0 as THREE.BufferAttribute; // grass,rock,snow,sand
  const bw1 = geo.attributes.bw1 as THREE.BufferAttribute; // swamp,road,town
  for (let v = 0; v < pos.count; v++) {
    let b = bio[v]; // 1..7 pintado, 0 = auto
    if (b === 0) {
      const y = pos.getY(v), slope = 1 - nor.getY(v);
      if (y < OCEAN_Y + 1.3) b = BIOME_SAND;
      else if (y > SNOW_Y) b = BIOME_SNOW;
      else if (slope > ROCK_SLOPE) b = BIOME_ROCK;
      else b = BIOME_GRASS;
    }
    bw0.setXYZW(v, b === BIOME_GRASS ? 1 : 0, b === BIOME_ROCK ? 1 : 0, b === BIOME_SNOW ? 1 : 0, b === BIOME_SAND ? 1 : 0);
    bw1.setXYZ(v, b === 5 ? 1 : 0, b === 6 ? 1 : 0, b === 7 ? 1 : 0);
  }
  bw0.needsUpdate = true;
  bw1.needsUpdate = true;
}

export function Terrain({ sculptMode = false, refOnly = false }: { sculptMode?: boolean; refOnly?: boolean }) {
  const grass = tile(useTexture("/assets/pasto.jpg"));
  const rock = tile(useTexture("/assets/roca.jpg"));
  const snow = tile(useTexture("/assets/nieve.jpg"));
  const sand = tile(useTexture("/assets/arena.jpg"));
  const swamp = tile(useTexture("/assets/pasto-pantano.jpg"));
  const road = tile(useTexture("/assets/pasto-camino.jpg"));
  const town = tile(useTexture("/assets/piso-pueblo.jpg"));
  const gradient = useMemo(() => toonGradient(), []);

  const rev = useTerrain((s) => s.rev);
  const radius = useTerrain((s) => s.radius);
  const painting = useRef(false);
  const [cursor, setCursor] = useState<[number, number, number] | null>(null);

  const material = useMemo(() => {
    const mat = new THREE.MeshToonMaterial({ gradientMap: gradient });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uGrass = { value: grass };
      shader.uniforms.uRock = { value: rock };
      shader.uniforms.uSnow = { value: snow };
      shader.uniforms.uSand = { value: sand };
      shader.uniforms.uSwamp = { value: swamp };
      shader.uniforms.uRoad = { value: road };
      shader.uniforms.uTown = { value: town };
      shader.uniforms.uTile = { value: 1 / UV_TILE };

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute vec4 bw0;\nattribute vec3 bw1;\nvarying vec4 vBW0;\nvarying vec3 vBW1;\nvarying vec3 vWPos;"
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvBW0 = bw0;\nvBW1 = bw1;\nvWPos = position;"
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform sampler2D uGrass; uniform sampler2D uRock; uniform sampler2D uSnow; uniform sampler2D uSand;
           uniform sampler2D uSwamp; uniform sampler2D uRoad; uniform sampler2D uTown;
           uniform float uTile;
           varying vec4 vBW0; varying vec3 vBW1; varying vec3 vWPos;`
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
           vec2 wuv = vWPos.xz * uTile;
           vec3 col =
               texture2D(uGrass, wuv).rgb * vBW0.x
             + texture2D(uRock,  wuv).rgb * vBW0.y
             + texture2D(uSnow,  wuv).rgb * vBW0.z
             + texture2D(uSand,  wuv).rgb * vBW0.w
             + texture2D(uSwamp, wuv).rgb * vBW1.x
             + texture2D(uRoad,  wuv).rgb * vBW1.y
             + texture2D(uTown,  wuv).rgb * vBW1.z;
           float wsum = vBW0.x + vBW0.y + vBW0.z + vBW0.w + vBW1.x + vBW1.y + vBW1.z;
           diffuseColor.rgb = col / max(wsum, 0.0001);`
        );
    };
    return mat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grass, rock, snow, sand, swamp, road, town, gradient]);

  const geo = useMemo(() => {
    const m = getMeta(), W = m.nx + 1, vcount = W * (m.nz + 1);
    const pos = new Float32Array(vcount * 3), uv = new Float32Array(vcount * 2);
    const bw0 = new Float32Array(vcount * 4), bw1 = new Float32Array(vcount * 3);
    let k = 0;
    for (let j = 0; j <= m.nz; j++)
      for (let i = 0; i <= m.nx; i++) {
        const x = m.x0 + i * m.cell, z = m.z0 + j * m.cell;
        pos[k * 3] = x; pos[k * 3 + 2] = z;
        uv[k * 2] = x / UV_TILE; uv[k * 2 + 1] = z / UV_TILE;
        k++;
      }
    const idx = new Uint32Array(m.nx * m.nz * 6);
    let t = 0;
    for (let j = 0; j < m.nz; j++)
      for (let i = 0; i < m.nx; i++) {
        const a = j * W + i, b = a + 1, cc = a + W, d = cc + 1;
        idx[t++] = a; idx[t++] = cc; idx[t++] = b; idx[t++] = b; idx[t++] = cc; idx[t++] = d;
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setAttribute("bw0", new THREE.BufferAttribute(bw0, 4));
    g.setAttribute("bw1", new THREE.BufferAttribute(bw1, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    return g;
  }, []);

  useEffect(() => { fillGeometry(geo); }, [geo, rev]);

  /* HeightfieldCollider: liviano y hecho para terreno (en vez de Trimesh pesado).
     Rapier espera las alturas en orden COLUMNA-MAYOR y centradas en el origen,
     con scale = tamaño total en X/Z. heights[col*(nrows+1)+row]. */
  const heightfield = useMemo(() => {
    if (sculptMode) return null;
    const m = getMeta(), h = getHeights(), W = m.nx + 1;
    // Rapier heightfield: rows -> eje Z, cols -> eje X.
    // Almacenamiento columna-mayor: heights[ x*(nz+1) + z ] (z varía más rápido).
    const nrows = m.nz, ncols = m.nx;
    const heights: number[] = [];
    const FLOOR = OCEAN_Y - 1;
    for (let x = 0; x <= m.nx; x++) {     // columnas (X) -> j
      for (let z = 0; z <= m.nz; z++) {   // filas (Z) -> i (varía rápido)
        const v = h[z * W + x];
        heights.push(Number.isFinite(v) ? v : FLOOR); // nunca NaN -> no rompe Rapier
      }
    }
    const sizeX = m.cell * m.nx, sizeZ = m.cell * m.nz;
    const cx = m.x0 + sizeX / 2, cz = m.z0 + sizeZ / 2;
    return { nrows, ncols, heights, scale: { x: sizeX, y: 1, z: sizeZ }, cx, cz };
  }, [sculptMode, rev]);

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!sculptMode || e.button !== 0) return;
    e.stopPropagation();
    painting.current = true;
    setFlattenLevel(e.point.y);
    sculpt(e.point.x, e.point.z);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!sculptMode) return;
    setCursor([e.point.x, e.point.y, e.point.z]);
    if (painting.current) sculpt(e.point.x, e.point.z);
  };
  const stop = () => { painting.current = false; };

  const mesh = (
    <mesh
      geometry={geo}
      material={material}
      receiveShadow
      castShadow
      onPointerDown={sculptMode ? onDown : undefined}
      onPointerMove={sculptMode ? onMove : undefined}
      onPointerUp={sculptMode ? stop : undefined}
      onPointerLeave={sculptMode ? stop : undefined}
    />
  );

  if (refOnly) return mesh; // solo visual, sin física ni handlers

  if (sculptMode) {
    return (
      <>
        {mesh}
        {cursor && (
          <mesh position={cursor} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius - 1.2, radius, 48]} />
            <meshBasicMaterial color="#ffd23f" transparent opacity={0.8} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
        )}
      </>
    );
  }

  return (
    <RigidBody type="fixed" colliders={false}>
      {mesh}
      {heightfield && (
        <HeightfieldCollider
          position={[heightfield.cx, 0, heightfield.cz]}
          args={[heightfield.nrows, heightfield.ncols, heightfield.heights, heightfield.scale]}
        />
      )}
    </RigidBody>
  );
}
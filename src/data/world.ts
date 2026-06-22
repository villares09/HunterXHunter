import { useGLTF } from "@react-three/drei";

export type ColliderKind = "box" | "trunk" | "none";

export type PropDef = {
  id: string;
  url: string;
  height: number;          // altura objetivo en metros — auto-escala por bbox (Tripo no normaliza)
  collider: ColliderKind;  // box=casa/roca · trunk=cilindro fino en el tronco · none=deco
  trunkRadius?: number;    // radio del collider de tronco
  colliderScale?: number;  // achica el cuboid respecto al bbox (0.9 = 90% del footprint)
  faceFlip?: boolean;      // gira 180° si el modelo mira al revés
};

const A = "/assets/";

// AJUSTÁ "height" a ojo hasta que la escala te cierre. Es el único número que importa.
export const PROPS: Record<string, PropDef> = {
  casaPersonaje: { id: "casaPersonaje", url: A + "casa-personaje.glb", height: 5.5, collider: "box", colliderScale: 0.9 },
  casaNpc:       { id: "casaNpc",       url: A + "casa-npc.glb",       height: 4.2, collider: "box", colliderScale: 0.9 },
  faro:          { id: "faro",          url: A + "faro.glb",           height: 11,  collider: "box", colliderScale: 0.7 },
  muelle:        { id: "muelle",        url: A + "muelle.glb",         height: 1.2, collider: "box" },
  bote:          { id: "bote",          url: A + "bote-pesquero.glb",  height: 1.6, collider: "none" },

  arbolNormal:   { id: "arbolNormal",   url: A + "arbol-normal.glb",   height: 5,   collider: "trunk", trunkRadius: 0.45 },
  arbolFrutal:   { id: "arbolFrutal",   url: A + "arbol-frutal.glb",   height: 4,   collider: "trunk", trunkRadius: 0.4 },
  arbolGigante:  { id: "arbolGigante",  url: A + "arbol-gigante.glb",  height: 8,   collider: "trunk", trunkRadius: 0.7 },
  arbolLaguna:   { id: "arbolLaguna",   url: A + "arbol-laguna.glb",   height: 5,   collider: "trunk", trunkRadius: 0.5 },

  roca:          { id: "roca",          url: A + "rocas.glb",          height: 1.4, collider: "box", colliderScale: 0.8 },
};

export const getProp = (id: string) => PROPS[id] ?? PROPS.arbolNormal;

Object.values(PROPS).forEach((p) => useGLTF.preload(p.url));
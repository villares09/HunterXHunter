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
  arbolGigante:  { id: "arbolGigante",  url: A + "arbol-gigante.glb",  height: 9,   collider: "trunk", trunkRadius: 0.8 },
  arbolLaguna:   { id: "arbolLaguna",   url: A + "arbol-laguna.glb",   height: 5,   collider: "trunk", trunkRadius: 0.5 },
  arbolMaestro:       { id: "arbolMaestro",       url: A + "arbol-maestro-2.glb",        height: 9, collider: "trunk", trunkRadius: 0.8 },
  arbolMaestroPantano:{ id: "arbolMaestroPantano",url: A + "arbol-maestro-de-pantano.glb",height: 8, collider: "trunk", trunkRadius: 0.7 },

  grassTall:    { id: "grassTall",    url: A + "Grass_Common_Tall.glb",  height: 0.7, collider: "none" },
  grassWispy:   { id: "grassWispy",   url: A + "Grass_Wispy_Tall.glb",   height: 0.8, collider: "none" },
  grassShort:   { id: "grassShort",   url: A + "Grass_Common_Short.glb", height: 0.4, collider: "none" },
  flower3:      { id: "flower3",      url: A + "Flower_3_Group.glb",     height: 0.5, collider: "none" },
  flower4:      { id: "flower4",      url: A + "Flower_4_Group.glb",     height: 0.5, collider: "none" },
  bushCommon:   { id: "bushCommon",   url: A + "Bush_Common.glb",        height: 1.2, collider: "none" },
  bushFlowers:  { id: "bushFlowers",  url: A + "Bush_Common_Flowers.glb",height: 1.2, collider: "none" },
  fern:         { id: "fern",         url: A + "Fern_1.glb",             height: 0.7, collider: "none" },
  clover:       { id: "clover",       url: A + "Clover_1.glb",           height: 0.3, collider: "none" },
  plant1:       { id: "plant1",       url: A + "Plant_1.glb",            height: 0.6, collider: "none" },

  rocas:     { id: "rocas",     url: A + "rocas.glb",      height: 4,  collider: "box" },
  rockMedium1: { id: "rockMedium1", url: A + "Rock_Medium_1.glb", height: 3, collider: "box" },
  rockMedium2: { id: "rockMedium2", url: A + "Rock_Medium_2.glb", height: 3, collider: "box" },
  rockMedium3: { id: "rockMedium3", url: A + "Rock_Medium_3.glb", height: 3, collider: "box" },
  rockRound1:  { id: "rockRound1",  url: A + "RockPath_Round_Small_1.glb",  height: 0.6, collider: "box" },
  rockRound2:  { id: "rockRound2",  url: A + "RockPath_Round_Small_2.glb",  height: 0.6, collider: "box" },
  rockRound3:  { id: "rockRound3",  url: A + "RockPath_Round_Small_3.glb",  height: 0.6, collider: "box" },
  rockRoundThin: { id: "rockRoundThin", url: A + "RockPath_Round_Thin.glb", height: 0.5, collider: "box" },
  rockRoundWide: { id: "rockRoundWide", url: A + "RockPath_Round_Wide.glb", height: 0.6, collider: "box" },
  rockSquare1: { id: "rockSquare1", url: A + "RockPath_Square_Small_1.glb", height: 0.6, collider: "box" },
  rockSquare2: { id: "rockSquare2", url: A + "RockPath_Square_Small_2.glb", height: 0.6, collider: "box" },
  rockSquare3: { id: "rockSquare3", url: A + "RockPath_Square_Small_3.glb", height: 0.6, collider: "box" },
};

export const getProp = (id: string) => PROPS[id] ?? PROPS.arbolNormal;

Object.values(PROPS).forEach((p) => useGLTF.preload(p.url));
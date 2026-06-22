export type AnimMap = {
  idle: string;
  walk: string;
  run: string;
  jump?: string;
  attack?: string;
  hurt?: string; // reacción a golpe (Receive Punch To The Face)
  down?: string; // caída / muerte (Stunned to floor)
};

export type ModelDef = {
  id: string;
  name: string;
  blurb: string;
  url: string;
  faceFlip?: boolean;
  anim: AnimMap;
};

// Nombres canónicos (sin el prefijo gon_/killua_, que CharacterModel saca al cargar).
const MIXAMO_ANIM: AnimMap = {
  idle: "standing",
  walk: "Walking",
  run: "Running",
  jump: "Jumping + standing",
  attack: "PunchingRight",
  hurt: "Receive Punch To The Face",
  down: "Stunned to floor",
};

export const MODELS: ModelDef[] = [
  { id: "gon", name: "Gon", blurb: "HxH. Set completo de combate.",
    url: "/models/gon.glb", anim: MIXAMO_ANIM },
  { id: "killua", name: "Killua", blurb: "HxH. Set completo de combate.",
    url: "/models/killua.glb", anim: MIXAMO_ANIM },
];

export const getModel = (id: string) => MODELS.find((m) => m.id === id) ?? MODELS[0];
export const ALL_MODEL_URLS = MODELS.map((m) => m.url);
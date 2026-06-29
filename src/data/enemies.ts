import { useGLTF } from "@react-three/drei";

export type EnemyAnimMap = {
  idle: string;
  walk: string;
  attack: string;
  hit: string;
  death: string;
  stunned?: string;
};

export type EnemyDef = {
  id: string;
  name: string;
  url: string;
  hp: number;
  faceFlip?: boolean;
  targetHeight: number; // renormalización por bounding box (como CharacterModel)
  feetY: number;        // offset de pies al piso (acá es ~0, NO -0.65: no hay capsula de Ecctrl)
  anim: EnemyAnimMap;
};

// OJO: nombres canónicos DESPUÉS de sacar el prefijo oso_.
// Si la consola tira "[enemy-anim] clip NO encontrado", mirá el array "hay:"
// y corregí los nombres ACÁ. Es el único lugar para tocarlos.
export const OSO: EnemyDef = {
  id: "oso",
  name: "Oso",
  url: "/models/oso.glb",
  hp: 50,
  faceFlip: false,
  targetHeight: 1.7,
  feetY: 0,      // <-- era 0. Levanta el modelo sobre la superficie, igual que FEET_Y en el player
  anim: {
    idle: "idle",
    walk: "walk",
    attack: "attack",
    hit: "hit",
    death: "death",
    stunned: "stunned",
  },
};

export const ENEMIES: EnemyDef[] = [OSO];
ENEMIES.forEach((e) => useGLTF.preload(e.url));

export const getEnemy = (id: string) => ENEMIES.find((e) => e.id === id) ?? OSO;

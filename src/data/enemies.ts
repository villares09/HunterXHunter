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

  // === stats de combate (Fase 1) ===
  hp: number;
  atk: number;      // ataque: entra en la tirada oso→jugador (más atk = más chance de acertarte)
  def: number;      // defensa: entra en la tirada jugador→oso (más def = más chance de MISS tuyo)
  absorb: number;   // absorción: se resta al daño final que recibe (piso de 1)
  dmg: number;      // daño base que le hace al jugador (antes era el 7 hardcodeado)
  level: number;    // nivel ESTÁTICO. Aún no se usa en Fase 1; lo van a leer EXP/némesis (Fases 2/3/5)

  faceFlip?: boolean;
  targetHeight: number; // renormalización por bounding box (como CharacterModel) — controla la escala del modelo
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
  atk: 5,       // ataque del oso (calibrá contra la Defensa del jugador cuando pruebes)
  def: 6,       // defensa base del oso (calibrá contra el Ataque del jugador)
  absorb: 2,    // le come 2 de daño a cada golpe tuyo
  dmg: 7,       // daño base al jugador (= el 7 que antes estaba fijo en Enemies.tsx)
  level: 1,
  faceFlip: false,
  targetHeight: 1.7,  // escala del oso; cada enemigo nuevo define la suya acá
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

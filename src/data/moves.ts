export type MoveKind = "punch" | "kick" | "heavy" | "finisher";

export type Move = {
  id: string; clip: string; kind: MoveKind;
  dmg: number; range: number; hitFrame: number | number[];
  swing: number; cooldown: number; knockback: number; speed: number;
};

export const MOVES = {
  jab:       { id: "jab",       clip: "PunchingLeft",                  kind: "punch",    dmg: 1.0,  range: 2.6, hitFrame: 0.35, swing: 0.52, cooldown: 0,    knockback: 0.4, speed: 1.78 },
  cross:     { id: "cross",     clip: "Cross Punch",                   kind: "punch",    dmg: 1.25, range: 2.7, hitFrame: 0.51, swing: 0.70, cooldown: 0,    knockback: 0.6, speed: 2.01 },
  hook:      { id: "hook",      clip: "Hook down",                     kind: "punch",    dmg: 1.6,  range: 2.7, hitFrame: 0.60, swing: 0.78, cooldown: 0,    knockback: 0.9, speed: 2.30 },
  finisher:  { id: "finisher",  clip: "Punch To Elbow Combo final",    kind: "finisher", dmg: 0.6,  range: 3.0, hitFrame: [0.59, 0.77, 0.89, 0.97, 1.15, 1.56, 1.80], swing: 2.57, cooldown: 0.3, knockback: 1.8, speed: 1.96 },

  kick:      { id: "kick",      clip: "Mma Kick frontal",              kind: "kick",     dmg: 1.8,  range: 3.0, hitFrame: 0.49, swing: 0.68, cooldown: 0.15, knockback: 1.3, speed: 1.44 },
  kickHigh:  { id: "kickHigh",  clip: "high Mma Kick",                 kind: "kick",     dmg: 2.1,  range: 3.0, hitFrame: 0.25, swing: 0.43, cooldown: 0.35, knockback: 1.6, speed: 2.30 },

  elbow:     { id: "elbow",     clip: "Elbow Punching",                kind: "heavy",    dmg: 2.2,  range: 2.4, hitFrame: 0.32, swing: 0.50, cooldown: 0.3,  knockback: 1.1, speed: 2.30 },
  flyingKnee:{ id: "flyingKnee",clip: "jump + Flying Knee Punch Combo",kind: "heavy",    dmg: 1.5,  range: 2.8, hitFrame: [0.29, 0.65], swing: 1.43, cooldown: 0.6, knockback: 2.2, speed: 1.90 },
} satisfies Record<string, Move>;

export type MoveId = keyof typeof MOVES;
export const PUNCH_COMBO: MoveId[] = ["jab", "cross", "hook", "finisher"];

export const CLIPS = {
  loco:  ["standing", "Walking", "Running", "Jumping + standing", "Walking Backwards", "Running Jump"],
  punch: ["PunchingLeft", "PunchingRight", "Cross Punch", "Elbow Punching", "Hook down", "Jab To Elbow Punch"],
  combo: ["Combo Punch", "Punch Combo fast", "Punch To Elbow Combo final", "jump + Flying Knee Punch Combo"],
  kick:  ["high Mma Kick", "low Mma Kick", "Mma Kick frontal", "double Kicking"],
  react: ["Receive Punch To The Face", "Stunned to floor"],
} as const;

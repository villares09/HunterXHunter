import islaBallena from "./islaBallena.json";

/** Las 5 capas que forman un mundo. mc:characters NO va (es del jugador). */
export const WORLD_KEYS = ["mc-coast", "mc-forest", "mc-heightmap", "mc-rocks", "mc-world"] as const;
export type WorldKey = (typeof WORLD_KEYS)[number];

/** Registro de mundos. Agregá acá cada isla/país/provincia nueva. */
export const WORLDS: Record<string, Record<string, unknown>> = {
  islaBallena: islaBallena as Record<string, unknown>,
};

/** Mundo activo. Hoy fijo; en Fase 5 esto lo decide el mapa-mundo / viaje. */
export const ACTIVE_WORLD = "islaBallena";


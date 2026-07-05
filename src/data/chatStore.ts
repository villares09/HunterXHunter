import { create } from "zustand";

/* ============================================================
   CANAL DE MENSAJES — base del log de sistema y del chat futuro.
   Hoy solo se usa el canal "system" (eventos de combate).
   Los demás canales quedan MODELADOS para el multiplayer:
   cuando exista la red, las fuentes escriben acá y el panel ya
   los muestra sin reescribir nada.
   ============================================================ */

export type ChatChannel = "system" | "global" | "trade" | "party" | "clan";

/* tipo de mensaje = color/estilo en el panel. "system" se subdivide por kind. */
export type ChatKind =
  | "dmgOut"   // daño que HACÉS
  | "dmgIn"    // daño que RECIBÍS
  | "miss"     // MISS (tuyo o del enemigo)
  | "exp"      // experiencia / kills
  | "info"     // avisos del sistema (sin aire, etc.)
  | "chat";    // mensaje de jugador (futuro)

export type ChatMessage = {
  id: number;
  channel: ChatChannel;
  kind: ChatKind;
  text: string;
  from?: string; // quién lo mandó (undefined = sistema; nombre del jugador en chat)
  at: number;    // performance.now() al crearse
};

const MAX_MESSAGES = 100; // buffer: guardamos las últimas N, las viejas se descartan

type ChatState = {
  messages: ChatMessage[];
  push: (m: Omit<ChatMessage, "id" | "at">) => void;
  clear: () => void;
};

let _cid = 1;

export const useChat = create<ChatState>((set) => ({
  messages: [],
  push: (m) =>
    set((s) => {
      const next = [...s.messages, { ...m, id: _cid++, at: performance.now() }];
      // recortar al buffer máximo (descarta las más viejas)
      if (next.length > MAX_MESSAGES) next.splice(0, next.length - MAX_MESSAGES);
      return { messages: next };
    }),
  clear: () => set({ messages: [] }),
}));

/* ============================================================
   HELPERS DE SISTEMA — el combate llama a estos (no al panel).
   Emiten una línea al canal "system". Se usan JUNTO a los floaters,
   no en su lugar: el floater salta en el mundo, esto queda en el log.
   ============================================================ */

export const sysLog = {
  /** daño que le hacés a un enemigo */
  dmgOut: (target: string, amount: number, crit = false) =>
    useChat.getState().push({
      channel: "system", kind: "dmgOut",
      text: crit ? `Golpe crítico a ${target} por ${amount}.` : `Le pegás a ${target} por ${amount}.`,
    }),
  /** daño que recibís */
  dmgIn: (source: string, amount: number) =>
    useChat.getState().push({
      channel: "system", kind: "dmgIn",
      text: `${source} te pega por ${amount}.`,
    }),
  /** MISS: quién le erró a quién */
  miss: (attacker: string, target: string) =>
    useChat.getState().push({
      channel: "system", kind: "miss",
      text: `${attacker} falla el golpe a ${target}.`,
    }),
  /** kill + exp (la exp real llega en Fase 2; por ahora el número lo pasa quien llama) */
  kill: (target: string, exp: number) =>
    useChat.getState().push({
      channel: "system", kind: "exp",
      text: `Derrotaste a ${target}. +${exp} EXP.`,
    }),
  /** aviso genérico del sistema */
  info: (text: string) =>
    useChat.getState().push({ channel: "system", kind: "info", text }),
};

/* ============================================================
   PARSER DE PREFIJOS — LISTO PARA EL FUTURO, sin uso todavía.
   Estilo L2: el símbolo al inicio del input decide el canal.
     (nada)  -> global  (lo ven los que están cerca, por radio)
     +texto  -> trade
     -texto  -> party
     #texto  -> clan
   Cuando exista el input de chat, se llama a esto y se enruta el
   mensaje al canal correspondiente. HOY NO se invoca desde ningún lado.
   ============================================================ */

export function parseChatInput(raw: string): { channel: ChatChannel; text: string } {
  const s = raw.trimStart();
  if (s.startsWith("+")) return { channel: "trade", text: s.slice(1).trim() };
  if (s.startsWith("-")) return { channel: "party", text: s.slice(1).trim() };
  if (s.startsWith("#")) return { channel: "clan", text: s.slice(1).trim() };
  return { channel: "global", text: s.trim() };
}

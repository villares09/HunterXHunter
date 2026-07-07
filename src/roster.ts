import type { Character } from "@/store";
import type { SavedCharacter } from "@/character";

const KEY = "mc:characters";

export function loadRoster(): SavedCharacter[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedCharacter[]) : [];
  } catch {
    return [];
  }
}

function persist(list: SavedCharacter[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function saveCharacter(c: Character): SavedCharacter {
  const list = loadRoster();
  const saved: SavedCharacter = { ...c, id: `c_${Date.now()}_${Math.floor(Math.random() * 1e4)}`, createdAt: Date.now() };
  list.push(saved);
  persist(list);
  return saved;
}

/**
 * Reescribe campos de un personaje YA guardado, por id. Puerta única de persistencia:
 * el progreso (level/exp, y a futuro maestrías de Nen) se guarda SIEMPRE por acá.
 * El día del backend, solo cambia el cuerpo de estas funciones, no los call sites.
 */
export function updateCharacter(id: string, patch: Partial<Character>): void {
  const list = loadRoster();
  const i = list.findIndex((c) => c.id === id);
  if (i === -1) return;
  list[i] = { ...list[i], ...patch };
  persist(list);
}

export function deleteCharacter(id: string) {
  persist(loadRoster().filter((c) => c.id !== id));
}

export function hasCharacters(): boolean {
  return loadRoster().length > 0;
}

import type { Character } from "./store";
import type { SavedCharacter } from "./character";

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

export function deleteCharacter(id: string) {
  persist(loadRoster().filter((c) => c.id !== id));
}

export function hasCharacters(): boolean {
  return loadRoster().length > 0;
}

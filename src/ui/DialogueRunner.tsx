import { useState } from "react";
import story from "../data/story.json";

type SNode = {
  id: number; title: string; text: string;
  hasImage: boolean; isCombat: boolean;
  options: { text: string; to: number }[];
};
const NODES = story.nodes as Record<string, SNode>;

export function DialogueRunner({ onClose }: { onClose: () => void }) {
  const [id, setId] = useState<number>(story.start);
  const [history, setHistory] = useState<number[]>([]);
  const node = NODES[String(id)];
  if (!node) return null;

  const go = (to: number) => { setHistory((h) => [...h, id]); setId(to); };
  const back = () => setHistory((h) => { if (!h.length) return h; setId(h[h.length - 1]); return h.slice(0, -1); });

  return (
    <div className="story-overlay" onClick={onClose}>
      <div className="story-box" onClick={(e) => e.stopPropagation()}>
        <div className="story-head">
          <div className="story-title">
            {node.title || "—"} {node.isCombat && <span className="story-combat">⚔ COMBATE</span>}
          </div>
          <button className="story-x" onClick={onClose}>✕</button>
        </div>

        <div className="story-text">
          {node.hasImage && <div className="story-img">🖼 (este nodo tiene una imagen en tu bookgame)</div>}
          {node.text ? node.text.split("\n").map((p, i) => p && <p key={i}>{p}</p>) : <p className="dim">(sin texto)</p>}
        </div>

        <div className="story-opts">
          {node.options.length === 0 && <div className="dim">— Fin de este recorrido —</div>}
          {node.options.map((o, i) => (
            <button key={i} className="story-opt" onClick={() => go(o.to)}>{o.text}</button>
          ))}
        </div>

        <div className="story-foot">
          {history.length > 0 && <button className="story-back" onClick={back}>← Atrás</button>}
          <span className="dim">Recorriendo tu historia · Mundo Cazador</span>
        </div>
      </div>
    </div>
  );
}

// Test de personalidad → categoría de Nen. Tomado del bookgame "Mundo Cazador".
// DATA-DRIVEN: editá nombres/textos acá para una versión original (sin IP).

export type CategoryId =
  | "intensificador" | "emisor" | "transmutador"
  | "materializador" | "manipulador" | "especialista";

export type Category = {
  id: CategoryId;
  name: string;
  color: string;
  question: string;       // la frase que elige el jugador
  desc: string;
  affinity: string;
  featuredSkill: string;  // skill destacada (id en skills.ts)
  passive: { hpMult?: number; auraMult?: number; dmgMult?: number };
};

export const CATEGORIES: Category[] = [
  { id: "transmutador", name: "Transmutador", color: "#56c2ff",
    question: "Soy mentiroso/a y caprichoso/a.",
    desc: "Los Transmutadores son mentirosos y caprichosos. Tienen actitudes únicas y muchos son considerados bichos raros o tramposos. Rara vez revelan sus verdaderas intenciones.",
    affinity: "Aura con propiedades", featuredSkill: "furia", passive: { dmgMult: 1.1 } },
  { id: "especialista", name: "Especialista", color: "#ff5fae",
    question: "Soy independiente y carismático/a.",
    desc: "Los Especialistas son independientes y carismáticos. Hacen sentir que hay algo importante en ellos y evitan la intimidad, pero su carisma los rodea de gente.",
    affinity: "Comodín", featuredSkill: "furia", passive: { hpMult: 1.1, auraMult: 1.1 } },
  { id: "materializador", name: "Materializador", color: "#7df0ff",
    question: "Soy nervioso/a y analizo todo con cuidado.",
    desc: "Los Materializadores son muy nerviosos y prudentes. Muy atentos, rara vez caen en trampas. Analizar las cosas con calma es su fuerza.",
    affinity: "Invocación", featuredSkill: "onda", passive: { auraMult: 1.3 } },
  { id: "manipulador", name: "Manipulador", color: "#b87dff",
    question: "Soy lógico/a y argumento mi pensamiento.",
    desc: "Los Manipuladores son lógicos y avanzan a su propio ritmo. Los argumentos lo son todo; protegen a los suyos y persiguen sus objetivos sin escuchar a otros.",
    affinity: "Control", featuredSkill: "onda", passive: { dmgMult: 1.05, auraMult: 1.1 } },
  { id: "emisor", name: "Emisor", color: "#ffd24a",
    question: "Soy impaciente y no me fijo en los detalles.",
    desc: "Los Emisores son impacientes y poco detallistas. Muchos son temperamentales y apasionados, pero tienden a calmarse y olvidar fácilmente.",
    affinity: "Aura a distancia", featuredSkill: "onda", passive: { auraMult: 1.2 } },
  { id: "intensificador", name: "Intensificador", color: "#ff7a45",
    question: "Soy determinado/a y simple.",
    desc: "Los Intensificadores son determinados y simples. La mayoría nunca mienten ni ocultan nada; sus palabras y acciones están dominadas por sus sentimientos. Suelen ser egoístas y centrados en sus metas.",
    affinity: "Cuerpo a cuerpo", featuredSkill: "embate", passive: { hpMult: 1.2, dmgMult: 1.1 } },
];

export const QUIZ_INTRO =
  "Para dar inicio a esto vamos a preguntarte algunas cosas personales… pero tranquilo, podés mentir un poco. Elegí la que más te representa:";

# Cazadores — RPG slice (React Three Fiber + ecctrl)

Base jugable de un action-RPG 3D en el navegador. Mundo original inspirado en el
género (nada de IP de HxH). Pensado para que lo corras, lo toques y le sumes el
**Examen de Cazador** y el **sistema de aura/afinidades** más adelante.

## Correr el proyecto

Requiere Node 18+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de producción en dist/
```

## Controles

| Acción         | Tecla / input        |
|----------------|----------------------|
| Mover          | WASD / flechas       |
| Saltar         | Espacio              |
| Correr         | Shift                |
| Atacar         | Click izq / J        |
| Rotar cámara   | Arrastrar con mouse  |

## Qué incluye este slice

- **Movimiento + salto + cámara que sigue y rota** → vía `ecctrl` (controlador de
  cápsula flotante sobre Rapier). No hay que programar la física del personaje.
- **Combate con feel "anime"**: combo, **hit-stop** (congela el mundo 60-90 ms en el
  impacto), **screen shake** y knockback. Está en `src/components/Player.tsx` y
  `src/store.ts`.
- **Enemigos** con IA de persecución, vida con barra billboard y respawn → `src/components/Enemies.tsx`.
- **Minimapa** con el jugador al centro (flecha de dirección) y los **objetivos en
  rojo** → `src/ui/Minimap.tsx`.
- **HUD**: vida, contador de combo, bestias derrotadas → `src/ui/HUD.tsx`.
- **Números de daño/EXP flotantes** → `src/components/Systems.tsx`.

## Arquitectura (mapa rápido)

```
src/
  registry.ts          posiciones de entidades (NO reactivo) → minimapa + golpes
  store.ts             zustand: vida, combo, hitstop, shake, floaters
  components/
    Game.tsx           Canvas + KeyboardControls + Physics
    World.tsx          suelo (collider), cielo, luces+sombras, árboles/rocas
    Player.tsx         Ecctrl + lógica de ataque
    CharacterPlaceholder.tsx   muñeco temporal (reemplazar por GLB)
    Enemies.tsx        IA, vida, respawn
    Systems.tsx        tick del store + floaters
  ui/
    HUD.tsx            paneles + screen shake
    Minimap.tsx        canvas 2D top-down
```

**Por qué dos "estados":** `registry.ts` guarda objetos 3D y se lee cada frame sin
re-render (perf); `store.ts` (zustand) guarda lo que la UI necesita mostrar.

## Personaje

Ya viene con un **personaje 3D animado y libre (CC0)**: "RobotExpressive", del repo
oficial de three.js. Tiene Idle / Walking / Running / Jump / Punch y más, todo
enganchado a ecctrl vía `EcctrlAnimation` (ver `src/components/Player.tsx` y
`CharacterModel.tsx`). El golpe (`Punch`) se reproduce al atacar estando quieto.
El modelo se autoescala a la cápsula (no hay que calibrar nada).

### Cambiarlo por otro (Quaternius / Mixamo / el tuyo)

1. Conseguí un `.glb` rigueado y animado (ver `public/models/LEEME.txt`).
   Reemplazá `public/models/character.glb`.
2. En `Player.tsx`, ajustá los nombres del `animationSet` para que coincidan con
   los clips de tu modelo (así está armado con `EcctrlAnimation`):

```tsx
import Ecctrl, { EcctrlAnimation } from "ecctrl";
import { useGLTF } from "@react-three/drei";

const URL = "/models/character.glb";
const animationSet = {
  idle: "Idle", walk: "Walk", run: "Run",
  jump: "Jump_Start", jumpIdle: "Jump_Idle", jumpLand: "Jump_Land",
  fall: "Fall", action1: "Slash", action2: "Hit",
}; // ← los nombres tienen que coincidir con los clips del .glb

<Ecctrl animated>
  <EcctrlAnimation characterURL={URL} animationSet={animationSet}>
    <CharacterModel />   {/* useGLTF(URL) */}
  </EcctrlAnimation>
</Ecctrl>
```

Con animaciones reales, el cuerpo entero se mueve solo (incluido el brazo
izquierdo) y la pelea se ve fluida — eso no salía del muñeco de cajas.

## Roadmap (próximos slices)

1. **Este** — mundo + personaje + skills + combate base. ✓
2. **Examen de Cazador** — arenas/pruebas contra NPCs rivales, fases, ranking.
3. **Sistema de aura/afinidades** — capa nueva sobre el combate: barra de aura,
   6 categorías como ramas de habilidades, costos y cooldowns. El esqueleto de
   combo + hitstop de hoy es la base sobre la que se monta.
4. **Multiplayer** (lo "MM" del MMO) — server autoritativo (Colyseus / Socket.io)
   que sincroniza posición y combate. Recién acá, y es proyecto aparte.

## Onboarding (creación + test de personalidad)

Al abrir el juego entrás al **onboarding** (`src/onboarding/Onboarding.tsx`):

1. **Crear personaje** — nombre, sexo, origen (bosque/ciudad), 16 puntos en 6
   características, y **elección de modelo 3D**. Los atributos derivados (Vida,
   Ataque, Daño, Nen…) se calculan en vivo.
2. **Test de personalidad** — las 6 frases del bookgame "Mundo Cazador"
   (`src/data/quiz.ts`). La que elegís define tu **categoría de Nen**.
3. **Resultado** — tu categoría + afinidad. Al entrar, `setCharacter()` arranca el
   juego: la Vida sale de tu Resistencia, el Aura de tu Nen, el daño base de tu
   Daño, y la **pasiva de la categoría** (p.ej. Intensificador +Vida/+Daño) se aplica.

Todo es **data-driven**: `src/data/quiz.ts` (categorías/textos) y `src/data/models.ts`
(modelos). Para una versión sin IP de HxH, editás esos dos archivos y listo.

## Modelos 3D seleccionables

Vienen 3 modelos CC0 (en `public/models`): **Autómata** (set completo con golpe y
salto), **Soldado** y **Cadete** (idle/caminar/correr). Cada uno mapea sus clips en
`src/data/models.ts`. Para sumar el tuyo (Quaternius/Mixamo): dejá el `.glb` en
`public/models` y agregá una entrada al array `MODELS` con su `anim` map.

## Mapa

La escena (`src/components/World.tsx`) es una **ciudad** low-poly: avenida central,
plaza con fuente, edificios con techos y ventanas (con colliders), faroles, y bosque
alrededor donde aparecen las bestias. Luz de atardecer con sombras y niebla.

## Novedades de esta versión

- **Persistencia + panel de personajes**: los personajes se guardan en localStorage.
  Al abrir el juego ves el panel (`src/onboarding/CharacterSelect.tsx`): jugar, crear
  o borrar. Ya no se pierde el progreso al recargar.
- **Muerte y reaparición**: al llegar a 0 de vida se bloquea el input y aparece la
  pantalla de caída (revivir o cambiar de personaje). Hay invulnerabilidad breve al
  reaparecer/entrar.
- **Lector de historia**: el botón "📖 Historia" abre el recorrido ramificado cargado
  desde tu bookgame (`src/data/story.json`, generado del JSON de Mundo Cazador). Sigue
  nodos y opciones; los nodos de combate están marcados (integración al 3D pendiente).

## Combate y skills

**Ataque básico** (click / J): tiene cooldown de swing, así que clickear como loco
ya no apila combos. El daño se aplica en el *hit-frame* (mitad del swing), no al
instante del click, y el **combo sube solo si pegás**. La animación de golpe se
reproduce camines o corras (la manejamos nosotros, no el sistema de ecctrl).

**Skills** (teclas 1·2·3) — definidas en `src/skills.ts` como datos:

```ts
type Skill = {
  id, name, code, icon, cost /*aura*/, cd /*cooldown*/, effect(pos)
}
```

Cada skill chequea cooldown + aura, descuenta el aura, arranca el cooldown y corre
su `effect`. Las tres de ejemplo: **Embate** (AoE corto), **Onda** (AoE largo),
**Furia** (x2 daño 6s). El `effect` usa el helper `hitInRadius()` de `src/damage.ts`,
que respeta el multiplicador de daño. Para agregar una skill nueva: pushás un objeto
al array `SKILLS` y listo (la UI y el input se enganchan solos).

**Aura** es el recurso (regenera con el tiempo) → es la base del sistema de
aura/afinidades (Nen) del roadmap: cada skill se va a etiquetar con su categoría
(Reforzador, Emisor, Transformador, Materializador, Manipulador, Especialista) y de
ahí salen las ramas.

## Stack

React 19 · React Three Fiber 9 · drei 10 · React Three Rapier 2 · ecctrl · zustand · Vite.

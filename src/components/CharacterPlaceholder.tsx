/**
 * Personaje PLACEHOLDER. Existe para que el proyecto arranque sin descargar nada.
 * Para reemplazarlo por un modelo real (Quaternius / Mixamo), ver README → "Modelo real".
 * Construido mirando hacia +Z.
 */
export function CharacterPlaceholder() {
  return (
    <group>
      {/* torso */}
      <mesh castShadow position={[0, 0.95, 0]}>
        <capsuleGeometry args={[0.28, 0.55, 6, 12]} />
        <meshStandardMaterial color="#2fa37a" flatShading />
      </mesh>
      {/* cabeza */}
      <mesh castShadow position={[0, 1.55, 0]}>
        <boxGeometry args={[0.42, 0.42, 0.4]} />
        <meshStandardMaterial color="#e0b48a" flatShading />
      </mesh>
      {/* pelo */}
      <mesh position={[0, 1.76, 0]}>
        <boxGeometry args={[0.46, 0.18, 0.44]} />
        <meshStandardMaterial color="#16121c" flatShading />
      </mesh>
      {/* ojos */}
      <mesh position={[-0.1, 1.56, 0.21]}>
        <boxGeometry args={[0.06, 0.08, 0.04]} />
        <meshStandardMaterial color="#16161e" />
      </mesh>
      <mesh position={[0.1, 1.56, 0.21]}>
        <boxGeometry args={[0.06, 0.08, 0.04]} />
        <meshStandardMaterial color="#16161e" />
      </mesh>
      {/* brazos */}
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[0.42 * s, 0.98, 0]} rotation={[0, 0, 0.1 * s]}>
          <capsuleGeometry args={[0.1, 0.45, 4, 8]} />
          <meshStandardMaterial color="#2a8e6a" flatShading />
        </mesh>
      ))}
    </group>
  );
}

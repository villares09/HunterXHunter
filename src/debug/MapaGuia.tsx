// ==========================================
// ARCHIVO NUEVO: MapaGuia.tsx
// ==========================================
import React from "react";
import * as THREE from "three";

// Variables de tamaño basadas en tu código original de la isla
const ISLAND_SCALE = 2.8;
const UNIT = 60;
export const LAND_Y = 0;

// El largo real en el espacio 3D según tus vectores máximos de WHALE_NORM
// Multiplicamos por 1.05 para darle un pequeño margen de encuadre con la imagen
export const ANCHO_TOTAL_3D = (1.30 - (-1.30)) * ISLAND_SCALE * UNIT * 1.05; 

// Proporción exacta basada en tu mapa real de Hunter x Hunter (2500m de largo por 1800m de ancho)
export const ALTO_TOTAL_3D = ANCHO_TOTAL_3D * (1800 / 2500);

/**
 * COMPONENTE VISUAL EXTRA: Crea un plano gigante con la imagen de tu mapa acoplada.
 * Solo se mostrará si entrás con ?place en la URL, igual que tu DevPlacer.
 */
export function MapaGuiaFondo() {
  // Detecta si "?place" está activo en la barra de direcciones del navegador
  const mostrarGuia = new URLSearchParams(typeof window !== "undefined" ? location.search : "").has("place");
  if (!mostrarGuia) return null;

  // Cargamos la imagen desde tu carpeta de assets públicos
  // Asegúrate de que el archivo en "public/assets/" se llame exactamente "mapa_isla.jpg"
  const textura = new THREE.TextureLoader().load("/assets/mapa-isla.png");

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, LAND_Y + 0.1, 0]} // Un pelito más arriba del suelo plano para que no parpadee
    >
      <planeGeometry args={[ANCHO_TOTAL_3D, ALTO_TOTAL_3D]} />
      <meshBasicMaterial map={textura} transparent opacity={0.7} depthWrite={false} />
    </mesh>
  );
}

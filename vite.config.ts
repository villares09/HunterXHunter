import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Una sola instancia de three en todo el árbol (ecctrl trae la suya y rompe sutil).
  resolve: { dedupe: ["three"] },
  // Rapier viene como WASM; Vite lo maneja, pero lo excluimos del pre-bundle
  // para evitar problemas de inicialización del módulo wasm.
  optimizeDeps: { exclude: ["@dimforge/rapier3d-compat"] },
});
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Configuración de Vite
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
  ],
  cacheDir: "node_modules/.vite-app",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

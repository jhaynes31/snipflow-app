import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { "/api": `http://localhost:${process.env.API_PORT ?? 4000}` },
  },
  build: { outDir: "../dist/web", emptyOutDir: true },
});

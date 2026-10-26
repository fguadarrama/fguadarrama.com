import { defineConfig } from "vite";

// La app se publica en https://fguadarrama.com/lecturi/ (GitHub Pages, repositorio "lecturi").
export default defineConfig({
  base: "/lecturi/",
  build: { outDir: "dist", target: "es2022" },
});

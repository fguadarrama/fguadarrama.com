import { defineConfig } from "vite";

// La app se publica en https://fguadarrama.com/lecturi/ (GitHub Pages, repositorio "lecturi").
export default defineConfig({
  base: "/lecturi/",
  build: {
    outDir: "dist", target: "es2022",
    rollupOptions: {
      input: { reader: "index.html", editor: "editor/index.html" },
      // GitHub Pages/Jekyll omits files whose basename begins with "_".
      output: { chunkFileNames: chunk => `assets/${chunk.name.replace(/^_+/, "")}-[hash].js` },
    },
  },
});

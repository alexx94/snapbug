import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(root, "src/index.ts"),
      name: "SnapBug",
      fileName: "snapbug",
      formats: ["es", "umd"]
    },
    rollupOptions: {
      output: {
        exports: "named"
      }
    }
  }
});

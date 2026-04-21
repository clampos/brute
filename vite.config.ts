import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    // Prefer TS/TSX when duplicate JS files exist during migration.
    extensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
});

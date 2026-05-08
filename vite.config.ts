import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    proxy: {
      '/auth': 'http://localhost:4242',
      '/api': 'http://localhost:4242',
    },
  },
  resolve: {
    // Prefer TS/TSX when duplicate JS files exist during migration.
    extensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
});

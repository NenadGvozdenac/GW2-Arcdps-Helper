import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    // Local dev: forward /api to the backend (npm --prefix backend run dev).
    proxy: { "/api": process.env.API_PROXY_TARGET ?? "http://localhost:3000" },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ExcelJS is big and only needed for the session export: its own chunk, loaded on demand.
          if (id.includes("node_modules/exceljs")) return "exceljs";
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});

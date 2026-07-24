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
    proxy: {
      "/api": "http://127.0.0.1:4600",
      "/projects": "http://127.0.0.1:4600",
      "/renders": "http://127.0.0.1:4600"
    }
  },
  build: {
    outDir: "dist"
  }
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { suitableApiPlugin } from "./server/suitablePlugin.js";

export default defineConfig({
  plugins: [react(), suitableApiPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});

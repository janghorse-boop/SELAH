/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/SELAH/",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["src/**/*.{js,jsx}"],
      exclude: [
        "src/tests/**",
        "src/main.jsx",
        "src/App.jsx",
        "schemaClient.js",
      ],
    },
  },
});

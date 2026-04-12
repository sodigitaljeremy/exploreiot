import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules",
        ".next",
        "**/*.test.{ts,tsx}",
      ],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
})

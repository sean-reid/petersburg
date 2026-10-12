import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/petersburg/",
  build: {
    target: "es2022",
    sourcemap: false,
    modulePreload: { polyfill: false },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});

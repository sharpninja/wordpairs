import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/*.integration.ts"],
    environment: "node",
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/*.integration.ts"],
    exclude: ["tests/integration/*.realtime.integration.ts"],
    environment: "node",
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
  },
});

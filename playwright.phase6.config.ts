import { defineConfig } from "@playwright/test";
import phase5 from "./playwright.phase5.config";
export default defineConfig({
  ...phase5,
  testMatch: [
    "*.phase2.spec.ts",
    "*.phase3.spec.ts",
    "*.phase4.spec.ts",
    "*.phase5.spec.ts",
    "*.phase6.spec.ts",
  ],
});

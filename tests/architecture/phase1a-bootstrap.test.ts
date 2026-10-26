import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
) as {
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.(ts|tsx|js|jsx)$/.test(path)
        ? [path]
        : [];
  });
}

describe("Phase 1A application skeleton and module boundaries", () => {
  it("exposes explicit development, production, lint, type, and test commands", () => {
    expect(packageJson.scripts).toMatchObject({
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "biome check src tests/architecture",
      typecheck: "tsc --noEmit",
      test: "vitest run",
    });
  });

  it("declares Next.js and React as runtime dependencies", () => {
    expect(packageJson.dependencies).toEqual(
      expect.objectContaining({
        next: expect.any(String),
        react: expect.any(String),
        "react-dom": expect.any(String),
      }),
    );
  });

  it("provides a minimal App Router page and root layout", () => {
    const page = resolve(root, "src/app/page.tsx");
    const layout = resolve(root, "src/app/layout.tsx");
    expect(existsSync(page)).toBe(true);
    expect(existsSync(layout)).toBe(true);
    expect(readFileSync(page, "utf8")).toContain("Wordpairs");
    expect(readFileSync(layout, "utf8")).toContain("<html");
  });

  it("has explicit domain, application, and infrastructure module roots", () => {
    for (const moduleRoot of [
      "src/domain",
      "src/application",
      "src/infrastructure",
    ]) {
      expect(
        sourceFiles(resolve(root, moduleRoot)).length,
        `${moduleRoot} has no source module`,
      ).toBeGreaterThan(0);
    }
  });

  it("keeps domain modules free of UI, framework, and infrastructure imports", () => {
    const forbidden =
      /(?:from\s+|import\s*(?:\(\s*)?)['"](?:next(?:\/[^'"]*)?|react(?:-dom)?(?:\/[^'"]*)?|@supabase\/[^'"]+|openid-client|node:fs)['"]/;
    const domainFiles = sourceFiles(resolve(root, "src/domain"));
    expect(domainFiles.length).toBeGreaterThan(0);
    for (const file of domainFiles)
      expect(readFileSync(file, "utf8"), file).not.toMatch(forbidden);
  });
});

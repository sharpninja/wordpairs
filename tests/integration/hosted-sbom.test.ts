import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("hosted build inventory, isolated fixture only", () => {
  it("includes scoped, nested, development and optional packages with dependency edges", () => {
    const dir = mkdtempSync(join(tmpdir(), "wordpairs-sbom-"));
    try {
      const lock = join(dir, "package-lock.json");
      const out = join(dir, "report.json");
      writeFileSync(lock, JSON.stringify({ lockfileVersion: 3, packages: {
        "": { name: "wordpairs", version: "1.0.0", dependencies: { a: "1" }, devDependencies: { "@tools/b": "2" } },
        "node_modules/a": { version: "1.0.0", license: "MIT", dependencies: { c: "1" }, optionalDependencies: { absent: "1" } },
        "node_modules/a/node_modules/c": { version: "1.0.0", license: "ISC", optional: true },
        "node_modules/@tools/b": { version: "2.0.0", license: "Apache-2.0", dev: true, peerDependencies: { a: "1", "absent-peer": "2" }, peerDependenciesMeta: { "absent-peer": { optional: true } } },
      } }));
      const sha = "a".repeat(40);
      execFileSync(process.execPath, [resolve("scripts/generate-sbom.mjs"), "--lockfile", lock, "--output", out, "--sha", sha, "--branch", "main", "--target", "production", "--url", "fixture.vercel.app"], { env: { ...process.env, WORDPAIRS_INVITE_SECRET: "fixture-secret-never-copy" } });
      const text = readFileSync(out, "utf8");
      const bom = JSON.parse(text);
      expect(bom.specVersion).toBe("1.6");
      expect(bom.metadata.component.version).toBe(sha);
      expect(bom.components).toHaveLength(3);
      expect(bom.components.find((c: { name: string }) => c.name === "@tools/b").properties).toContainEqual({ name: "wordpairs:development", value: "true" });
      expect(bom.dependencies.find((d: { ref: string }) => d.ref === "node_modules/a").dependsOn).toContain("node_modules/a/node_modules/c");
      expect(bom.dependencies.find((d: { ref: string }) => d.ref === "node_modules/@tools/b").dependsOn).toEqual(["node_modules/a"]);
      expect(bom.dependencies.find((d: { ref: string }) => d.ref === "wordpairs").dependsOn).toHaveLength(2);
      expect(text).not.toContain("fixture-secret-never-copy");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it.each([["--sha", "bad"], ["--url", "https://user:password@fixture.vercel.app"], ["--url", "https://fixture.vercel.app/?token=secret"]])("fails closed for unsafe metadata %s", (flag, value) => {
    const args = [resolve("scripts/generate-sbom.mjs"), "--sha", "a".repeat(40), "--branch", "main", "--target", "production", "--url", "fixture.vercel.app", flag, value];
    expect(spawnSync(process.execPath, args, { encoding: "utf8" }).status).not.toBe(0);
  });
});

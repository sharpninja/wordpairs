import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("hosting schema planner reruns, isolated history fixtures", () => {
  it.each(["matching", "changed-source", "missing-earlier", "unknown"])("handles %s history without a live connection", (kind) => {
    const directory = mkdtempSync(join(tmpdir(), "wordpairs-history-"));
    try {
      const history = join(directory, "history.json");
      const source = readFileSync("src/infrastructure/migrations/001_foundation.sql", "utf8");
      const record = { version: "20261028000000", name: "wordpairs_001_foundation", statements: [source] };
      if (kind === "changed-source") record.statements = ["select 1;"];
      if (kind === "missing-earlier") record.name = "wordpairs_002_public_reads";
      if (kind === "unknown") record.name = "unexpected_schema_change";
      writeFileSync(history, JSON.stringify([record]));
      const result = spawnSync(process.execPath, [resolve("scripts/hosting-schema.mjs"), "--environment", "staging", "--mode", "plan", "--history", history], { encoding: "utf8" });
      if (kind === "matching") {
        expect(result.status).toBe(0);
        const plan = JSON.parse(result.stdout);
        expect(plan.ref).toBe("jshjkaigwbxsbnnogfxs");
        expect(plan.migrations[0].name).toBe("wordpairs_002_public_reads");
        expect(plan.migrations).toHaveLength(12);
      } else expect(result.status).not.toBe(0);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  it("rejects an unknown target before any connection", () => {
    expect(spawnSync(process.execPath, [resolve("scripts/hosting-schema.mjs"), "--environment", "unknown", "--mode", "apply"]).status).not.toBe(0);
  });
});

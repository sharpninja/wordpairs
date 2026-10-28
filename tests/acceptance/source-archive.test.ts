import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonStrictValidator } from "@cyclonedx/cyclonedx-library/Validation";
import { Version } from "@cyclonedx/cyclonedx-library/Spec";
import { expect, it } from "vitest";
import { sha256 } from "../ac-contracts/archive-fixture-validator";

// Acceptance fixture only: no publication, deployment inventory or release command.
it("AC-41/42 exact Git snapshot tar.gz, matching fixture BOM, complete notices and SHA256 sidecar reject tampering", async () => {
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const paths = execFileSync("git", ["ls-tree", "-r", "--name-only", commit], {
    encoding: "utf8",
  })
    .trim()
    .split("\n");
  const manifest = new Map(
    paths.map((path) => [
      path,
      sha256(
        execFileSync("git", ["show", `${commit}:${path}`], {
          maxBuffer: 32 * 1024 * 1024,
        }),
      ),
    ]),
  );
  const directory = mkdtempSync(join(tmpdir(), "wordpairs-source-acceptance-"));
  const source = join(directory, "source");
  mkdirSync(source);
  const archive = join(directory, "candidate.tar.gz");
  try {
    execFileSync("tar", ["-xf", "-", "-C", source], {
      input: execFileSync("git", ["archive", "--format=tar", commit], {
        maxBuffer: 32 * 1024 * 1024,
      }),
    });
    mkdirSync(join(source, "sbom"), { recursive: true });
    const report = `sbom/${commit}.cdx.json`;
    const bom = {
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      version: 1,
      metadata: {
        component: { type: "application", name: "wordpairs", version: commit },
      },
      components: [],
    };
    const validator = new JsonStrictValidator(Version.v1dot6);
    const pack = () => {
      execFileSync("tar", ["-czf", archive, "-C", source, "."]);
      writeFileSync(
        `${archive}.sha256`,
        `${sha256(readFileSync(archive))}  candidate.tar.gz\n`,
      );
    };
    const inspect = async () => {
      if (
        readFileSync(`${archive}.sha256`, "utf8").split(" ")[0] !==
        sha256(readFileSync(archive))
      )
        return "checksum";
      const extracted = mkdtempSync(join(directory, "inspect-"));
      try {
        execFileSync("tar", ["-xzf", archive, "-C", extracted]);
        const entries = new Set(
          execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
            .trim()
            .split("\n"),
        );
        for (const [path, hash] of manifest) {
          if (!entries.has(`./${path}`)) return "missing-source";
          if (sha256(readFileSync(join(extracted, path))) !== hash)
            return "altered-source";
        }
        if (!entries.has(`./${report}`)) return "missing-sbom";
        const text = readFileSync(join(extracted, report), "utf8");
        if ((await validator.validate(text)) !== null) return "invalid-sbom";
        if (JSON.parse(text).metadata?.component?.version !== commit)
          return "commit-mismatch";
        return "accepted";
      } finally {
        rmSync(extracted, { recursive: true, force: true });
      }
    };
    writeFileSync(join(source, report), JSON.stringify(bom));
    pack();
    expect(await inspect()).toBe("accepted");
    expect(manifest.has("LICENSE")).toBe(true);
    expect(manifest.has("docs/ATTRIBUTIONS.md")).toBe(true);
    expect(manifest.has("docs/word_association_round_flow.svg")).toBe(true);
    expect(sha256(readFileSync(join(source, "LICENSE")))).toBe(
      "aaf135472f81c5b4a0dca9367e5bb5e9750032b5bebe5442b36e4c0a47430df3",
    );
    const svg = readFileSync(
      join(source, "docs/word_association_round_flow.svg"),
      "utf8",
    );
    for (const notice of [
      "Copyright 2019 The Recursive Project Authors",
      "SIL OPEN FONT LICENSE Version 1.1",
      "PERMISSION &amp; CONDITIONS",
      "TERMINATION",
    ])
      expect(svg).toContain(notice);
    writeFileSync(`${archive}.sha256`, "0".repeat(64));
    expect(await inspect()).toBe("checksum");
    writeFileSync(
      join(source, report),
      JSON.stringify({
        ...bom,
        metadata: {
          component: { ...bom.metadata.component, version: "wrong" },
        },
      }),
    );
    pack();
    expect(await inspect()).toBe("commit-mismatch");
    writeFileSync(join(source, report), '{"invalid":true}');
    pack();
    expect(await inspect()).toBe("invalid-sbom");
    rmSync(join(source, report));
    pack();
    expect(await inspect()).toBe("missing-sbom");
    writeFileSync(join(source, report), JSON.stringify(bom));
    writeFileSync(join(source, "LICENSE"), "truncated");
    pack();
    expect(await inspect()).toBe("altered-source");
    rmSync(join(source, "LICENSE"));
    pack();
    expect(await inspect()).toBe("missing-source");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  // Extract each candidate once, then verify every source hash and tamper control.
  // Keep a bounded I/O budget for large repository snapshots on shared hosts.
}, 240000);

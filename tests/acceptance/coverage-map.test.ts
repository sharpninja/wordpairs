import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import ts from "typescript";
import { expect, it } from "vitest";
import { coverageProofs } from "./coverage-map";
import {
  primaryBindings,
  supplementalBindings,
  type AssertionBinding,
} from "./assertion-bindings";
import { acOracleScenarios } from "../ac-contracts/oracle-scenarios";
import { supplementalScenarios } from "../ac-contracts/oracle-supplemental-scenarios";
import { supplementalContractExpectations } from "../ac-contracts/oracle-supplemental-contracts";
const sha = (text: string | Buffer) =>
  createHash("sha256").update(text).digest("hex");
function relevantSources() {
  function walk(directory: string): string[] {
    return readdirSync(directory).flatMap((name) => {
      const path = `${directory}/${name}`;
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  }
  return [
    ...["src", "tests", "public", "third_party"].flatMap(walk),
    ...readdirSync(".").filter((name) =>
      /^(?:package(?:-lock)?\.json|tsconfig\.json|.*config\.(?:ts|json)|biome\.json)$/.test(
        name,
      ),
    ),
  ].sort();
}
const normal = (text: string) => text.replace(/[\s"']/g, "");
function leaves(value: unknown, path = ""): string[] {
  if (value && typeof value === "object" && Object.keys(value).length)
    return Object.entries(value).flatMap(([k, v]) =>
      leaves(v, path ? `${path}.${k}` : k),
    );
  return [path];
}
function resolveBinding(binding: AssertionBinding) {
  const source = readFileSync(binding.file, "utf8");
  const tree = ts.createSourceFile(
    binding.file,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const found: {
    line: number;
    name: string;
    assertions: { line: number; expression: string }[];
  }[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      node.arguments.length > 1 &&
      /^(?:it|test)(?:\b|\.)/.test(node.expression.getText(tree))
    ) {
      const title = node.arguments[0];
      const name =
        ts.isStringLiteral(title) || ts.isNoSubstitutionTemplateLiteral(title)
          ? title.text
          : ts.isTemplateExpression(title)
            ? title.getText(tree)
            : null;
      const needle = binding.title.replace(/^AC-\d{2}-T\d{2} /, "");
      if (
        name &&
        (name.includes(binding.title) ||
          (name.includes("${id}") && name.includes(needle)))
      ) {
        const assertions: { line: number; expression: string }[] = [];
        function inspect(child: ts.Node) {
          if (ts.isCallExpression(child)) {
            const expression = child.getText(tree);
            if (
              /^expect\(/.test(expression) ||
              child.expression.getText(tree).includes("assertObservation")
            )
              assertions.push({
                line:
                  tree.getLineAndCharacterOfPosition(child.getStart()).line + 1,
                expression,
              });
          }
          ts.forEachChild(child, inspect);
        }
        const callback = node.arguments.find(
          (arg) => ts.isArrowFunction(arg) || ts.isFunctionExpression(arg),
        );
        if (!callback) throw new Error("Missing test callback");
        inspect(callback);
        found.push({
          line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          name,
          assertions,
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  expect(found.length, `${binding.file}: ${binding.title}`).toBe(1);
  const scoped = found[0];
  const guards = binding.observations.map((observation) => {
    const statements = scoped.assertions.filter((s) =>
      normal(s.expression).includes(normal(observation)),
    );
    expect(
      statements.length,
      `${binding.title}: missing scoped assertion for ${observation}`,
    ).toBeGreaterThan(0);
    return { observation, statements };
  });
  return {
    file: binding.file,
    title: binding.title,
    sourceTest: scoped.name,
    line: scoped.line,
    sourceHash: sha(source),
    assertedObservations: guards,
  };
}
type UnitReport = {
  numFailedTests: number;
  numPendingTests: number;
  testResults: {
    name: string;
    assertionResults: { title: string; fullName: string; status: string }[];
  }[];
};
type BrowserSuite = {
  file?: string;
  specs?: {
    file: string;
    title: string;
    tests: { results: { status: string }[] }[];
  }[];
  suites?: BrowserSuite[];
};
function passingResults(
  binding: ReturnType<typeof resolveBinding>,
  unit: UnitReport,
  browser: BrowserSuite,
) {
  if (binding.file.includes("/browser/")) {
    const specs: {
      file: string;
      title: string;
      tests: { results: { status: string }[] }[];
    }[] = [];
    function walk(s: BrowserSuite) {
      specs.push(...(s.specs ?? []));
      for (const nested of s.suites ?? []) walk(nested);
    }
    walk(browser);
    const matches = specs
      .filter(
        (s) => s.file.endsWith(binding.file) || binding.file.endsWith(s.file),
      )
      .filter((s) => s.title.includes(binding.title));
    expect(
      matches.length,
      `missing browser execution ${binding.title}`,
    ).toBeGreaterThan(0);
    for (const spec of matches)
      for (const test of spec.tests) {
        expect(test.results.length).toBeGreaterThan(0);
        expect(test.results.every((r) => r.status === "passed")).toBe(true);
      }
    return matches.map((s) => ({
      title: s.title,
      status: "passed",
      artifact: "docs/evidence/phase6/browser.json",
    }));
  }
  const files = unit.testResults.filter((r) => r.name.endsWith(binding.file));
  const matches = files
    .flatMap((f) => f.assertionResults)
    .filter((r) => r.title.includes(binding.title));
  expect(
    matches.length,
    `missing unit execution ${binding.title}`,
  ).toBeGreaterThan(0);
  for (const result of matches)
    expect(result.status, result.fullName).toBe("passed");
  return matches.map((r) => ({
    title: r.fullName,
    status: r.status,
    artifact: "docs/evidence/phase6/unit.json",
  }));
}
const notes: Record<string, string> = {
  "AC-10-T01":
    "Icon in the direct driver comes from roomProjection; the selected-icon browser case separately observes actual scorecard rendering. Server elapsed/current/cumulative values are actual accepted commands.",
  "AC-12-T01":
    "Historical unsolved elapsed=null is derived from no solve. Actual standings independently apply the 80000ms unsolved penalty.",
  "AC-13-T01":
    "Original configuredRounds=3 fixture remains untouched. Actual commands prove unfinished after rounds 3 and 7 and finished after 8; original final-row ordering oracle is reused.",
  "AC-14-T01":
    "Original aggregated-score fixture is isolated standings arithmetic, not valid per-round awards. Valid per-round scoring, time, unsolved penalty and exact-tie lifecycle counterparts remain separately cited.",
  "AC-45-T02":
    "emittedEvents=[] means incorrect-guess broadcasts. A real MatchChanged invalidation is emitted; it contains no guess and is checked/filtered explicitly.",
};
it("binds every primary/supplemental oracle leaf group to scoped production assertions and, when generating, matching passing executions", () => {
  expect(Object.keys(primaryBindings).sort()).toEqual(
    acOracleScenarios.map((s) => s.id).sort(),
  );
  expect(Object.keys(supplementalBindings).sort()).toEqual(
    supplementalScenarios.map((s) => s.id).sort(),
  );
  const generating = Boolean(process.env.WORDPAIRS_ACCEPTANCE_MANIFEST);
  const unit: UnitReport | undefined = generating
    ? JSON.parse(
        readFileSync(
          process.env.WORDPAIRS_UNIT_REPORT ??
            "/tmp/wordpairs-phase6-unit.json",
          "utf8",
        ),
      )
    : undefined;
  const browser: BrowserSuite | undefined = generating
    ? JSON.parse(
        readFileSync(
          process.env.WORDPAIRS_BROWSER_REPORT ??
            "/tmp/wordpairs-phase6-browser.json",
          "utf8",
        ),
      )
    : undefined;
  const sourceHashes: Record<string, string> | undefined = generating
    ? JSON.parse(
        readFileSync(
          process.env.WORDPAIRS_SOURCE_HASHES ??
            "/tmp/wordpairs-phase6-source-hashes.json",
          "utf8",
        ),
      )
    : undefined;
  if (unit) {
    expect(unit.numFailedTests).toBe(0);
    expect(unit.numPendingTests).toBe(0);
  }
  if (sourceHashes) {
    const current = relevantSources();
    expect(
      Object.keys(sourceHashes).sort(),
      "complete run source inventory",
    ).toEqual(current);
    for (const file of current)
      expect(sha(readFileSync(file)), `complete run hash ${file}`).toBe(
        sourceHashes[file],
      );
  }
  const records = [];
  for (const [tier, scenarios] of [
    ["primary", acOracleScenarios],
    ["supplemental", supplementalScenarios],
  ] as const)
    for (const scenario of scenarios) {
      const proof = coverageProofs[scenario.id.slice(0, 5)];
      const bindings = (
        tier === "primary" ? primaryBindings : supplementalBindings
      )[scenario.id];
      const contract =
        tier === "primary"
          ? acOracleScenarios.find((s) => s.id === scenario.id)!
              .contractExpected
          : supplementalContractExpectations[scenario.id];
      for (const file of proof.entrypoints)
        expect(existsSync(file), file).toBe(true);
      const resolved = bindings.map(resolveBinding).map((binding) => {
        if (sourceHashes)
          expect(
            sourceHashes[binding.file],
            `run source hash ${binding.file}`,
          ).toBe(binding.sourceHash);
        return {
          ...binding,
          executions:
            unit && browser ? passingResults(binding, unit, browser) : [],
        };
      });
      records.push({
        tier,
        id: scenario.id,
        originalSource:
          tier === "primary"
            ? "tests/ac-contracts/oracle-scenarios.ts"
            : "tests/ac-contracts/oracle-supplemental-scenarios.ts",
        originalRequest: scenario.request,
        assertionGroups: [
          {
            oraclePaths: leaves(contract),
            relationship:
              "Related leaf group: the scoped statements below jointly prove this case; DTO/fixture differences are explicit.",
            counterpartMeaning: proof.assertions,
            bindings: resolved,
          },
        ],
        productionEntryPoints: proof.entrypoints,
        fixtureDiscrepancy: [
          proof.difference ??
            "Fixture names and DTO labels may differ; assertions bind the approved behavior rather than copied conforming output.",
          notes[scenario.id],
        ].filter(Boolean),
        evidenceTier: resolved.some((r) => r.file.includes("/browser/"))
          ? "Actual production decisions and Chromium UI, injected external ports"
          : "Actual domain/application decisions with port fakes or local process contract; no database durability claim",
        rawObservations: resolved.some((r) => r.file.includes("real-gameplay"))
          ? "docs/evidence/phase6/gameplay-observations.json"
          : "Specific production observations are evaluated live by the scoped asserted statements; transaction histories and browser metric JSON are retained in docs/evidence/phase6 where produced.",
        command:
          "npm test; WORDPAIRS_BROWSER_PATH=/usr/bin/chromium npm exec playwright -- test --config playwright.phase6.config.ts; generate mapping with WORDPAIRS_ACCEPTANCE_MANIFEST and matching run/source-hash files",
      });
    }
  expect(records.filter((r) => r.tier === "primary")).toHaveLength(67);
  expect(records.filter((r) => r.tier === "supplemental")).toHaveLength(27);
  expect(Object.keys(coverageProofs)).toHaveLength(45);
  if (generating)
    writeFileSync(
      process.env.WORDPAIRS_ACCEPTANCE_MANIFEST!,
      JSON.stringify(
        {
          status:
            "All bindings joined to passing unit/browser runs and matching source hashes; independent Phase6/human gate separate",
          records,
        },
        null,
        2,
      ),
    );
});

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach } from "vitest";
import { acceptanceTraces } from "./fixtures";
afterEach((context) => {
  const observed = acceptanceTraces.splice(0);
  const directory = process.env.WORDPAIRS_ACCEPTANCE_TRACE_DIR;
  if (directory && observed.length) {
    mkdirSync(directory, { recursive: true });
    const name = createHash("sha256")
      .update(context.task.name)
      .digest("hex")
      .slice(0, 16);
    writeFileSync(
      join(directory, `${name}.json`),
      JSON.stringify(
        {
          test: context.task.name,
          evidence:
            "Actual production decisions returned through TransactionFake; no database durability claim",
          observed,
        },
        null,
        2,
      ),
    );
  }
});

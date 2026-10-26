# Phase 1 foundation execution

Status: local technical review approved at 99/99 on commit `7e46694adf733ee70c272f0d23e7e8fefe22dc9b`; formal exact-GitHub-commit gate pending upload approval. Requirements remain v2.6. Phase 2 has not started. The complete final review is recorded in [`phase1_review_receipt.jsonl`](phase1_review_receipt.jsonl).

The recovered baseline is `706e854fc07e43fb23ace2114ca2451e4a072c82`, which contains the approved global mock gate and Phase 1A shell. This execution adds Phase 1B typed domain/application ports and Phase 1C persistence foundations. The current user instruction selects **GPT-6 Astra, high reasoning**, for every phase exit, overriding the older goal document's xhigh reviewer setting. The exit threshold remains 98% accuracy and 98% completeness with no unresolved material findings.

## Scope and evidence

| Scope | Implementation and evidence | Limits |
|---|---|---|
| AC-37 | `executeCommand` returns recoverable SERVICE_LIMIT and the original command ID on preflight rejection. PostgreSQL SQLSTATE 53300/53400 is classified identically, with rollback and no automatic retry. Actual command observations feed the unchanged AC-37-T01 oracle. | Provider/resource faults are scripted in adapter tests; no real Supabase Free-plan quota is claimed. |
| AC-39 | pg and @types/pg are pinned to 8.23.1, reviewed MIT, attributed, and included in the lockfile. Existing installed-package/license/attribution checks pass. | Planned, uninstalled dependencies remain separately listed in ATTRIBUTIONS. The AC-42 reviewed-inventory hash was refreshed for the two new rows; license/SVG hashes and rejection assertions remain unchanged. |
| AC-51 | Typed room/match/content/profile/identity/clock/random/deadline/quota/outbox ports; a pure decision callback inside an idempotent transaction. AST checks scan both domain and application, reject framework/external packages and relative/alias infrastructure paths, and exercise negative fixtures. Canonical conflict/full responses do not invoke decisions. Unchanged AC-51-T03/T04 assertions consume actual command observations through a fake repository. | Product JoinRoom and its final-seat oracle are Phase 2 work; fake ports do not prove database properties. |
| TR-31 persistence | `SupabasePostgresStore` holds one checked-out connection and aggregate row lock through decision and SQL RPC commit. A versioned migration adds private/RLS tables, idempotency, one schema-versioned outbox event per transition, deadlines and independent audit intents. | SQL capacity tests exercise relational membership constraints; adapter tests exercise generic aggregate transactions. They do not yet prove that a product JoinRoom updates both structures. |
| TR security | Anonymous/authenticated direct reads are denied; private RPCs are service-only. Server pool config requires verified TLS and rejects URL overrides; an offline actual-driver test checks the effective TLS configuration. | Real Supabase grants, TLS and provider entitlements are later integration/Phase 7 evidence. |
| Retention/content | Audit retention is one year; published outbox seven days; room/match command records use the room's close time plus 30 days. Non-room profile/moderation keys retain 30 days from creation. Round content references a specific pair version. Empty/null/blank/wrong-count hint arrays are rejected. | No production cleanup scheduler or deployment configuration has been installed. |

`phase0_interface_and_data_contracts.md` records the non-room retention refinement. The SQL schema denies browser table access; later phases must add actor/public projections and complete product repositories/use cases. Raw incorrect guesses have no relational storage column and must also stay out of aggregate state in Phase 4.

## Red–green verification

New command tests failed on missing modules before implementation. Adapter tests likewise failed before the SQL adapter existed. The TLS override and SQLSTATE quota regressions were observed red before their fixes. The database contract failed before migration, then passed on disposable PostgreSQL. The original global mock-oracle expectations were retained; the sole golden-file update is the independently pinned hash of the intentionally changed attribution inventory.

Current candidate checks:

- `npm test`: 8 files, 352 tests passed, zero failures/skips.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: local Next.js build; final result recorded in the review receipt.
- `pwsh -File tests/integration/run-phase1.ps1`: SQL migration, actual role denial, canonical retry/digest conflicts, rollback fault injection, outbox durability, retention boundaries, invalid content fixtures and concurrent final-seat checks passed; 3 real TypeScript adapter/Postgres integration tests passed. Each run creates its own container, binds only a random loopback port, and removes only the container it created.

The database runner uses pinned `postgres:17-alpine@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b`. Its separate Vitest configuration keeps real DB evidence out of ordinary mock/AC counts. No tests are conditionally skipped. The [node-postgres transaction contract](https://node-postgres.com/features/transactions) requires one client for all statements; the adapter follows that contract.

## Hostile review corrections

The independent Astra reviewer identified and the candidate corrected: the application import guard gap; zero/multiple outbox events; missing event schema/type and atomic audit intents; mutable live content references; canned quota metadata and incomplete rollback observations; URL TLS overrides; empty-hint SQL NULL semantics; cleanup ownership on container-name collision; persistence resource-limit classification; and match command retention anchored to room closure.

The independent GPT-6 Astra high reviewer reran 352 tests, lint, typecheck, local build and the full disposable database suite, approving local technical readiness at 99% accuracy and 99% completeness with zero remaining actionable findings. Automatic approval review rejected creation of the remote GitHub source tree as insufficiently authorized; it was not uploaded or retried. Phase 1 is not formally exited until the exact-GitHub-commit gate passes. Human phone validation, gameplay acceptance, observer authorization, moderation and full end-to-end tests remain in their planned later phases. No Vercel provisioning, preview, deployment or release work occurred.

## Local environment recovery

The supplied workspace was empty and its root `.git` was read-only. The authoritative `sharpninja/wordpairs` repository was recovered into `.mcpServer/wordpairs` within the writable workspace. MCP session bootstrap reports `no-session`, `recoveryStatus: health-failed`, `healthStatus: failed`, no failsafe path, and a missing root marker; its edit hooks return succeeded. Repository evidence is recorded here while MCP continuity is unavailable. No Phase 0 product decisions were reopened.

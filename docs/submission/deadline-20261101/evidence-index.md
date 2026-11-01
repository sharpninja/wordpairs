# Deadline report supporting evidence

This package supports the [November 1 deadline report](report.md). It preserves failed reviews, earlier failed chains, qualifications, unknowns and the distinction between local checks and actual hosted delivery. No tests or reviewers were rerun for publication.

- [Evidence manifest, original hashes and withheld-artifact register](evidence-manifest.json).
- [Detailed timeline and earlier Claude finding analysis](evidence-analysis.md), with [original source pins and structured findings](evidence-analysis/entry-evidence.json).
- [Exact-source local chain](evidence/local-gate/chain-completion.json), [core native/TRX index](evidence/local-gate/core-index/evidence-index.json), [supplemental index](evidence/local-gate/supplemental-index/supplemental-evidence-index.json) and all retained native/XML/TRX reports in that evidence directory. The 1,309 figure counts case executions, not unique cases; negative controls and duplicate conversions are separate artifacts.
- [Operational schema-planner fix suite](evidence/status-fix/evidence.json) and its native/XML/TRX reports.
- [Prepared, unexecuted hosted UI command contract](evidence/hosted-command-preparation.md).
- [Codex usage totals, model/day/window breakdowns and method](token-accounting/accounting.json), [scope/counter verification](token-accounting/verification.json), [numeric usage-event metadata](token-accounting/usage-events.jsonl) and [native scope](token-accounting/scope.json).
- [Claude usage totals and deduplication](token-accounting/claude-usage-summary.json), [per-message numeric metadata](token-accounting/claude-usage-messages.csv), [price arithmetic and official sources](token-accounting/price-comparison.json).
- [Original-user timestamp extracts](token-accounting/user-timestamps.json), including the Central/Pacific deadline ambiguity. Transcript bodies and model reasoning are not published.
- [Public stopped-work handoff](handoff.md). Product development, deployments and the deleted timer remain stopped.

Redacted copies of 69 specifically referenced reviewer-stream, transport and canonical-history files are now published as 57 distinct artifacts. See the [redaction guide](redacted-artifacts/README.md), [original-to-redacted hash manifest](redacted-artifacts/manifest.json), [redaction ledger](redacted-artifacts/redactions.jsonl), [independent privacy/coverage checks](redacted-artifacts/privacy-validation.json) and [downloadable archive](redacted-artifacts/review-artifacts-redacted.zip). Private originals remain unchanged. Explicit markers replace credentials, private prompts/profile/bootstrap context, internal reasoning and personal/environment identifiers. JSONL record order and counts are retained; YAML histories and query inputs are represented as JSON and labeled by kind. These are transformed derivatives, not byte-identical originals or new review acceptance.

The existing complete structured historical verdicts remain available. Numeric token metadata is repeated-context processing, not billions of unique words or a billing invoice. Missing provider usage remains unknown. The new manifest maps original hashes and duplicate aliases to their public derivatives; it does not export unrelated histories or runtime configurations.

- [Operational timeline excerpts](evidence/operational-timeline.json) preserve original event timestamps and line hashes for migration, authentication, commit and timer markers. [Review transport projections](evidence/review-operational-projections.json) identify withheld private originals and preserve the complete late verdict text. Isolated markers are not deployment proof.

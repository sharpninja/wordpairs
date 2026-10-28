# Word Pairs contest readiness

Audit date: 28 October 2026 UTC (27 October Central). **Not yet cleared for submission.** This is a release checklist linked to QBrain requirements, not an assertion of entrant eligibility or acceptance of legal terms. No entry has been submitted. Preserve this audit and append later decisions rather than erasing earlier failures.

Canonical scope: Word Pairs / `PROD-WORDPAIRS`, current workspace, `layer-1`. QBrain `TR-CONTEST-READINESS-041#CONTEST-01..05` and `TEST-CONTESTREADINESS-147` are persisted with all ten criterion entries unsatisfied. [Readback receipt](requirements-receipt.json) verifies both records and native mappings; this document is their linked checklist.

## Official-rule register

[Official rules, all seven pages](https://go.joinhandshake.com/rs/390-ZTF-353/images/%5BAI_Skills_Studio_Challenge%5D_Contest_Official_Rules.pdf?version=0); [retained source PDF](sources/handshake-multiplayer-official-rules.pdf). This compact register is a navigation aid; the complete source governs.

| Reference | Obligation / notice | Disposition |
| --- | --- | --- |
| p1 Eligibility, Appendix A | Adult eligible-country resident, present there at entry; active Handshake account/entry email; excluded affiliations and households cannot enter. | Entrant attested all conditions; record in rules-receipt.json. |
| p1 How to Enter | Mission entry includes title, cover, description, URL; September22–October30,2026,23:59 Pacific. | Materials and manual entry pending. |
| p2 Rules of Entry | Multiple entries permitted; applicable law applies; eligibility/fraud information may be requested. | No automated entry planned. |
| p2–3 Selection | Execution, creativity, value, polish:25% each; top20 advance; top3 receive$1,000 each. | Evidence assessment below. |
| p3 Prizes | Valid notification email; possible eligibility proof, acceptance/release; taxes/costs belong to winner; claim conditions apply. | Entrant obligations, not verified. |
| p3–4 Information / Terms | Entry grants promotional submission/persona licenses and email contact; conduct code and OpenAI terms apply. | Entrant review pending; conduct text unavailable. |
| p4 Entry integrity | No tampering, harassment, mass/script/macro/automated entries; account holder is entrant. | Prepare locally; entrant submits manually. |
| p4–5 Legal / Privacy | Liability release, California individual disputes and damage limits, privacy policy; sponsor cancellation/disqualification rights. | Entrant review required. |
| p1–2 Purchase | Free entry; purchasing does not improve chances. | No entry payment requested. |

Deadline conflicts: the [public brief](https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/) says October31. Use the earlier PDF cutoff: **2026-10-31T06:59:00Z**, **October31 at01:59 Central**, **October30 at23:59 Pacific**. The [generic submission guide](https://support.joinhandshake.com/hc/en-us/articles/43389244796823-Submit-Your-Project-from-a-Mission) calls preview images optional; the contest requires a cover, so include one. This conflict policy is a project decision, not sponsor clarification.

## Handshake account terms and submission flow

User-supplied [Terms of Service](https://joinhandshake.com/legal/tos/), displayed update July22,2025; [retained HTML](sources/handshake-tos-20261028.html). Applicable account/content sections require truthful identity; lawful, non-abusive, non-infringing content; necessary rights/permissions; recording consent; secure credentials; no unauthorized accounts, scraping, spam or misleading affiliation. Uploaded content is nonconfidential and licensed for service/promotional use. Machine-learning input excludes personal identifiers; generated output requires accuracy evaluation. Competitive misuse is prohibited. Enforcement, disclaimers, liability/indemnity, California law, arbitration/class-waiver/claim deadlines and entire-agreement provisions require entrant awareness. Employer/recruiter/paid-service clauses are conditional, not newly imposed game features. Special additional terms can control conflicts. This page does not identify itself as the Challenge Code of Conduct.

Project checks: keep generated guest aliases and optional account data separate; exclude tokens/private logs/third-party recordings from entry evidence; audit asset licenses and content; never scrape Handshake profiles or automate account/entry creation. No account settings, terms acceptance or publication occurred. Existing moderation/ACL tests support game controls but do not prove every future user submission lawful. Entrant has attested eligibility. Licenses and final package review remain open.

The [submission guide](https://support.joinhandshake.com/hc/en-us/articles/43389244796823-Submit-Your-Project-from-a-Mission) requires completing the Build steps before submission is enabled and using desktop. It distinguishes profile-only from AI Showcase submission. Verify the contest-specific path and required checkbox in the authenticated mission; a generic profile tile/badge is insufficient evidence of contest receipt. Retain the actual contest confirmation and timestamp. The [Showcase overview](https://support.joinhandshake.com/hc/en-us/articles/39163147630487-AI-Showcase-in-Handshake) describes truthful project/tool attribution and excluding confidential information; it does not replace this contest's entry instructions.

## Incorporated OpenAI and privacy references

[OpenAI Terms of Use](https://openai.com/policies/terms-of-use/) displayed effective January1,2026: accurate account information, protected credentials, lawful inputs/outputs and input rights; evaluate accuracy, disclose AI involvement, respect intellectual property and service safeguards. Content ownership does not clear third-party rights. Regional or business terms may apply depending on the entrant account; billing, suspension, liability and dispute provisions remain account obligations. Account/region/contract applicability is unverified.

The [sharing policy](https://openai.com/policies/sharing-publication-policy/) calls for review before sharing and clear AI attribution. Preserve accurate tool/author attribution in the description and release materials. The [service terms](https://openai.com/policies/service-terms/) describe feature-specific obligations and preview/beta limitations; do not promise permanent Work availability or infer indemnity.

For [usage policies](https://openai.com/policies/usage-policies/revisions/2025-10-29/), use the October29,2025 revision effective on this audit date. The current landing page displays a November20,2026 effective revision, after the contest cutoff. Applicable safeguards address harmful/illegal activity, privacy, minors, deception, and sensitive decisions. No rule bypass or unsupported safety certification is claimed.

[Handshake privacy policy](https://joinhandshake.com/privacy-policy/) displayed July3,2026: account/content/usage data, sharing and privacy choices belong to Handshake's service. It does not replace the game's own data practices. Use isolated guest evidence and inspect the final publication package for personal data. Public sources were read through the web tool; direct OpenAI HTML downloads failed and no retained-byte hash is claimed for them.

The operator confirms no other conduct links are available. The PDF's conduct and integrity provisions and Handshake account/content rules remain recorded. The separately named Challenge Code of Conduct and authenticated mission are still unavailable, with no missing-text compliance assertion and no repeated request to the operator.

## Product and evidence matrix

The [public brief](https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/) calls for a reusable multiplayer game at a public URL, room-code entry, synchronized screens and repeat play on phone/laptop without mandatory login or installation. It names ChatGPT Work. Optional account sign-in and PWA installation are compatible with that guest flow; Codex usage alone does not prove the named Work workflow.

| Check | Current evidence | Remaining action |
| --- | --- | --- |
| Guest room-code play | [Identity and room cases](../testing/ui/index.md), prior browser evidence; user previously confirmed local guest flow works. | Repeat in two clean external browser sessions at the final URL. |
| Synchronized complete games | [Live recovery design](../room_sync_fix.md), [UI implementation](../testing/ui/implementation.md). Unit/SQL and HTTP-fixture browser lanes establish their stated layers only. | Complete TEST-ROOMSYNC-139 / TR-ROOM-SYNCRECOVERY-038#LIVE-07 real private-push2..25UI matrix; do not substitute polling/fixtures. |
| Stable public address and replay | [Deployment plan](../deployment_plan.md). Temporary tunnel history is development evidence. | Publish an authorized release; verify clean guest join, eight-round finish, rematch/new room, mobile/laptop and service restart persistence at that URL. |
| Work provenance / mission checklist | Original conversation references a Work-chat import; no verified content from that shared link retained in this audit. | Retain actual Work design/build evidence and check authenticated mission steps. |
| Phone usability | [PWA design](../pwa_design.md), responsive/keyboard browser fixtures and optional install support. | Final public HTTPS mobile check; native installation remains separate evidence. Never require installation to play. |
| Release integrity | GPL-2.0-only package, [attributions](../ATTRIBUTIONS.md), source-archive/SWBOM requirements. | Generate final release source/SWBOM; inspect cover/artwork rights and ensure public evidence contains no tokens or private profile data. These are project safeguards, not invented contest clauses. |
| Submission materials | Working title **Word Pairs**; this audit plus [HV archive](hv-evidence.md). | Prepare approved cover, accurate description and durable playable URL; entrant manually completes actual mission submission. |
| Unknown incorporated requirements | PDF references Challenge Code of Conduct. Authenticated mission URL hit access/security boundaries; public searches found no conduct document. | Obtain exact text/link; audit it before claiming full compliance. Do not substitute generic Showcase terms. |

## Judging preparation

Execution evidence must show a complete stable group game. Creativity/value evidence should demonstrate the relationship-pair mechanic and intended social experience. Polish evidence should show clear onboarding, accessible feedback, responsive layouts, recovery, and safe moderation. These are recommendations against the published rubric; no winning score is claimed.

## Evidence retention and final check

Keep all historical hostile-validation receipts, including rejected and superseded rounds, linked with hashes in [hv-index.json](hv-index.json). A historical approval covers its recorded candidate only. Preserve current failures until a later independent review explicitly verifies repairs. At release, freeze commit/tree, source manifest, dependency/SWBOM, run logs, original rules hash, cover and description hashes, final URL and manual submission confirmation/time. HV is supporting evidence; inspected public rules do not list it as a required upload.

Run this checklist again immediately before manual entry. Record changes to sponsor rules, resolve unknown mission/conduct text, reconfirm eligibility at entry, final origin and latest source evidence. Do not auto-check Handshake progress or automate entry; no rule acceptance or submission is authorized by preparing this package.

Eligibility update: operator answered **"I meet all eligibility conditions"** on28October2026UTC. This resolves the requested attestation; no independent identity proof or legal eligibility adjudication is claimed. Keep the entry account/email accurate and reconfirm residence/presence at actual entry.

Wiki publication is tracked separately by `TR-DOCS-WIKIPUBLISH-042#WIKI-01..03` / `TEST-WIKIPUBLISH-148`. [The publication receipt](wiki-publication.json) binds the canonical export to its published wiki pages, assets, link transforms and verified remote commit. This publication does not submit the contest entry.


Category artwork update: the [prompt/provenance manifest](../category-artwork-prompts.json) records the approved comic concepts and all twelve recomposed 9:16/16:9 assets, their hashes and generation prompts. [Artwork validation](../category_artwork.md) and [scoped hostile review](../evidence/category-artwork/hostile-review.json) retain the corrected full-page-background design and superseded review findings. This is artwork provenance and bounded UI evidence, not a contest submission or legal-rights certification.

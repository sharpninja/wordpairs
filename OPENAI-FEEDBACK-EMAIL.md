Subject: Codex missed the Word Pairs contest delivery window; public evidence and retrospective

OpenAI team,

I am asking you to investigate a documented Codex execution failure while building Word Pairs for Handshake's AI Skills Studio "Create a Multiplayer Game with OpenAI" challenge. This was a real contest project, with a delivery deadline and a working multiplayer game to finish, deploy and prepare for submission.

Contest brief: https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/

I told Codex to use October 31, 2026 as the working deadline, continue while I was away, and not block on my phone check-ins. I later explicitly told it: "I need you to get it wrapped up with the bugs. As long as it's not breaking the UI, just push it."

The final candidate did not complete the required hosted staging-to-production sequence. Earlier versions had been deployed, and substantial local testing passed. Those facts did not establish that the final candidate was deployed and working in the hosted environments. There is no verified contest submission receipt in the retained evidence. The report preserves the ambiguity in the official contest cutoff and the unspecified timezone of my working deadline; it does not claim the sponsor accepted or rejected an entry.

Codex's own retrospective identifies the central failure: it kept fixing the specific artifact or review finding in front of it instead of managing the complete delivery path. I had already called out this pattern. Independent reviews repeatedly exposed weak test boundaries, incomplete evidence provenance, inconsistent documentation and unfinished hosted validation. Codex treated these as individual corrections without consistently applying the underlying lesson across the system.

On October 31, the exact-source local validation chain finished at 5:55:47 p.m. Central. It recorded 1,309 case executions, including complete eight-round browser games at player counts 2 through 10. The final hosted rollout remained unfinished. Work on review adapters, command batching, cross-session locking and evidence delivery continued into midnight without producing an accepted final review or a completed deployment. A recorded staging redeployment attempt later encountered Vercel reauthentication. That access dependency should have been exercised early; it does not explain the earlier hours or excuse the failure to manage delivery.

I required careful testing and independent hostile validation. Those requirements were known. The failure was Codex's inability to integrate them into a release path that converged, verify its chosen tools early, and communicate the actual delivery risk. Repeated progress updates described activity while the user outcome remained unfinished.

The usage also warrants investigation. Recoverable native counters through my stop instruction total approximately 4.96 billion reported tokens across Codex and retained Claude review sessions, mostly repeated cached input. This is not generated-output volume or an invoice. The evidence separates ordinary input, cache reads, cache writes and output, documents deduplication, and identifies missing provider usage as unknown. Any API list-rate comparison in the report is explicitly not my actual bill.

I have published the retrospective and supporting evidence:

- Deadline report: https://github.com/sharpninja/wordpairs/wiki/Deadline-Report-2026-11-01
- Evidence index and retained limitations: https://github.com/sharpninja/wordpairs/wiki/Deadline-Evidence-2026-11-01
- Detailed causal analysis: https://github.com/sharpninja/wordpairs/wiki/Deadline-Evidence-Analysis-2026-11-01
- Stopped-work handoff: https://github.com/sharpninja/wordpairs/wiki/Stopped-Work-Handoff-2026-11-01
- Pinned evidence directory: https://github.com/sharpninja/wordpairs/tree/b0f5a5c30b4b1e128d35d3a50e769ab2246bbc70/docs/submission/deadline-20261101
- Game repository: https://github.com/sharpninja/wordpairs

The public evidence includes sanitized native test results, review verdicts, operational chronology and token-accounting artifacts. Credentials, private profiles and raw private session histories were withheld; the evidence index identifies those limits.

Please have the Codex team review this as an end-to-end agent reliability failure. I would like an explanation of why explicit delivery instructions did not control execution, why repeated non-converging tooling and review loops did not trigger an effective recovery, and how Codex will distinguish local tests, committed code, accepted review and verified deployment when reporting progress. Please also explain how a user can audit usage for a long-running task without reconstructing it from local logs.

I need findings and corrective actions tied to this evidence. A general explanation that AI can make mistakes would not address what happened here.

Payton Byrd

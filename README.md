# Wordpairs

Wordpairs is a real-time word-association game. Its [requirements](docs/word_association_game_requirements.md), [AC gap analysis](docs/ac_gap_analysis.md), [planned AC test inventory](docs/ac_test_inventory.md), [repo review receipt](docs/repo_review_receipt.jsonl), [implementation plan](docs/implementation_plan.md), [Phase 0–6 hostile-validation goal](docs/goal_hv_agreement_through_phase_6.md), [Phase 0 execution tracker](docs/implementation_phase0_execution.md), [Phase 0 interface and data contracts](docs/phase0_interface_and_data_contracts.md), [Phase 0 approval receipt](docs/phase0_approval_receipt.jsonl), [Phase 0 refresh review receipt](docs/phase0_refresh_hostile_review_receipt.jsonl), [implementation kickoff review receipt](docs/implementation_kickoff_receipt.jsonl), [approved architecture decision record](docs/architecture_decision_record.md), [architecture design and FR/TR traceability](docs/architecture_design.md), [architecture patterns](docs/architecture_patterns.md), [deployment plan](docs/deployment_plan.md), [moderation plan](docs/moderation_plan.md), and rendered diagrams are in `docs/`.

## Project status

Phase 0 was approved on 26 October 2026. The next step is test-harness bootstrap and the global mock-validation gate for all 45 active acceptance criteria; it must pass before any production implementation code. No application code or executable test suite has been written. Deployment is scheduled after coding Phases 1–6, in Phase 7; deployed artifacts do not count toward AC coverage. External configuration, account, integration, deployment, and human evidence is tracked separately under TRs or operational release policy; deployed artifacts never count toward AC coverage.

## License

The game is intended to use GNU GPL version 2 only (`GPL-2.0-only`). See [`LICENSE`](LICENSE).

## Deployment target

The application target is Vercel from `sharpninja/wordpairs`. Coding Phases 1–6 precede all Phase 7 deployment and release work.

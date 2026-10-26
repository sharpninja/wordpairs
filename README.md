# Wordpairs

Wordpairs is a real-time word-association game. Its [requirements](docs/word_association_game_requirements.md), [AC gap analysis](docs/ac_gap_analysis.md), [planned AC test inventory](docs/ac_test_inventory.md), [repo review receipt](docs/repo_review_receipt.jsonl), [implementation plan](docs/implementation_plan.md), [Phase 0 execution tracker](docs/implementation_phase0_execution.md), [Phase 0 interface and data contracts](docs/phase0_interface_and_data_contracts.md), [Phase 0 refresh review receipt](docs/phase0_refresh_hostile_review_receipt.jsonl), [implementation kickoff review receipt](docs/implementation_kickoff_receipt.jsonl), [architecture design and FR/TR traceability](docs/architecture_design.md), [architecture patterns](docs/architecture_patterns.md), [deployment plan](docs/deployment_plan.md), [moderation plan](docs/moderation_plan.md), and rendered diagrams are in `docs/`.

## Project status

Phase 0 planning closure has started. No application code or executable tests have been written. Phase 0 is planning-only; after it passes, tests for all active acceptance criteria must be authored and validated against mocks before any project implementation code is written. External configuration, account, integration, deployment, and human evidence is tracked separately under TRs or operational release policy; deployed artifacts never count toward AC coverage.

## License

The game is intended to use GNU GPL version 2 only (`GPL-2.0-only`). See [`LICENSE`](LICENSE).

## Deployment target

The intended deployment target is Vercel, with the GitHub repository `sharpninja/wordpairs` as the source. Vercel configuration and application implementation remain pending.

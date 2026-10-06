# Current contract foundation

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-6
- verified_by_agent_family: sol
- attribution_basis: live

## Scope and status

- 2026-10-06: approved CRITICAL root-only program. No dependencies, staging, commits or pushes.
- Gate kind: backend. Foundation verified in isolation; producer/UI migration and storage reset are separate and remain incomplete.
- Baseline: ac73a137 on main. Preserve unrelated untracked e2e/zz-user.spec.ts.
- Design: docs/architecture/result-contract/consolidation-spec.md and consolidation-inventory.md.
- Evidence: 26 current contract tests and 64 affected existing validator/adapter tests pass (90 total, two workers). Application TypeScript and scoped lint pass. Frozen-source enforcement, display ratchet (two reviewed authority calls), OOE/compartments, memory/file-size and diff checks pass. Whole-project TypeScript has an unrelated unused realPoint in e2e/zz-user.spec.ts; preserve that Graphing file.
- Foundation was tested isolated before migration. New Equation/New Integration migration now proceeds in its own dossier. Existing mathematical capabilities and persistence are unchanged.
- Pre-v0.5.0 compatibility policy supersedes prior historical-result compatibility promises; no old-data conversion layer authorized.

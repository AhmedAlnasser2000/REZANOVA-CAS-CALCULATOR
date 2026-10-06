# Inventory and ordered migration design

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
- Gate kind: backend. Design inventory recorded; detailed capability evidence is required in every producer migration gate.
- Baseline: ac73a137 on main. Preserve unrelated untracked e2e/zz-user.spec.ts.
- Design: docs/architecture/result-contract/consolidation-spec.md and consolidation-inventory.md.
- Evidence: initial current contract tests 25/25 pass with two workers; incremental TypeScript and scoped lint pass. Further foundation regressions, boundaries and memory/size checks pending.
- Inventory identifies legacy missing native leaves and browser/Tauri reset boundaries; it does not claim route migration. Existing mathematical capabilities and persistence are unchanged.
- Pre-v0.5.0 compatibility policy supersedes prior historical-result compatibility promises; no old-data conversion layer authorized.

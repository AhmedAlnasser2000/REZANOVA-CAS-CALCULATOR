# INTEGRATION-RATIONAL-DECISION1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

## Outcome and status

Backend, CRITICAL root-only, implemented under the user's explicit plan. Backend verification and durable-memory gates complete. Outcome: **verified automatic rational integration over normalized Q(x) with replayable derivations**.

- Added deterministic Bézout Hermite reduction, residue resultants, factor-first specialization partitions, exact indexed LRT selection, checked monic ring division, primitive assembly and mandatory derivative verification.
- Added version-1 `rational-integration-decision` artifacts containing the complete Hermite/LRT/norm/inverse/trace derivation, replayed against an explicit owner and expected input. Existing scalar/polynomial and primitive formats remain unchanged.
- Retained normalized input denominator, rational primitive denominator and every norm condition. No pre-normalization exclusions are inferred.
- Private arithmetic shortcuts reduce redundant nested Euclidean work without relaxing ownership or proof checks.
- 122 core tests pass; see verification-summary.md for complete evidence and performance. A generic quintic fixture still takes about 42 seconds synchronously.
- All production edits remain inside the integration core. Concurrent Graphing/Matrix changes were preserved. No dependencies, routing, OOE, public result contracts, app output, staging, commit or push.

## Handoff and durable memory

Next: separately review rational adoption, including input lowering/original exclusions, result authority, branch/display semantics and execution/cancellation policy. Roadmap remains subject to change when necessary.

Updated durable memory: `.memory/current-state.md`, `.memory/decisions.md`, `.memory/open-questions.md`, `.memory/journal/2026-09/2026-09-27.md`, `.memory/journal/2026-09/2026-09-28.md`, and this dossier's completion-report.md, verification-summary.md and commit-log.md. Specification and reconstruction roadmap are in `docs/architecture/calculus/`.

## 2026-09-28 commit and performance discussion

The user authorized a separate integration-only commit, with no push. A temporary stage profile localized the generic-quintic cost to derivative evidence construction/checking (~33.17 s) and final replay (~8.21 s); Hermite/LRT took ~0.21 s combined. The next optimization investigation is a recommendation, not a new approved implementation. The current roadmap has three verified backend stages and seven remaining stages, whose difficulty is not uniform; rational product adoption is much nearer than the full transcendental/algebraic/mixed program. See verification-summary.md for commit checks.

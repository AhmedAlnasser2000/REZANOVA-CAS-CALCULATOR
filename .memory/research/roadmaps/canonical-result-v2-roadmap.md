# Canonical Result V2 Program

Date: 2026-07-14
Status: active; first six named gates committed, Linear Algebra verified, Closeout pending; standing approval remains; no push authorized

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Objective

Introduce a clean typed `CanonicalResultDocumentV2`, migrate only the producers responsible for the 23 V1 residual leaves, preserve V1 History and untouched V1 producers, and close the executable MathJSON corpus with zero exemptions and zero missing classifications.

The detailed schema laws, residual list, producer-version inventory, consumer matrix, parity baseline, and stop rules live in `.memory/research/audits/canonical-result-v2-audit0.md` and are part of this roadmap contract.

## Sequence

1. `CANONICAL-RESULT-V2-AUDIT0` (`backend`): persist the audit, migration map, frozen V1 inventory, acceptance checklist, and standing approval.
2. `CANONICAL-RESULT-V2-CONTRACT1` (`backend`): add V2 types, strict validators, builders, proof requirements, active-version routing, version-paired actions, and producer-version ratchets without enabling a production V2 route.
3. `CANONICAL-RESULT-V2-CONSUMER-HISTORY1` (`backend`): add the normalized read authority, migrate semantic consumers, and make V2 a current visible History version while preserving V1 and future-version rules.
4. `CANONICAL-RESULT-V2-REQUEST-EVIDENCE1` (`ui`): migrate derivative-at-point, angle conversion, and right triangle; remove four residual leaves.
5. `CANONICAL-RESULT-V2-SUPPLEMENT-TABLE1` (`ui`): migrate typed Equation supplements and Table undefined cells; remove eight residual leaves.
6. `CANONICAL-RESULT-V2-TRIGONOMETRY1` (`ui`): migrate Period and Phase compound primary; remove one residual leaf.
7. `CANONICAL-RESULT-V2-LINEAR-ALGEBRA1` (`ui`): migrate Matrix row operations/profiles and Vector independence; remove ten residual leaves.
8. `CANONICAL-RESULT-V2-CLOSEOUT0` (`backend`): retain an empty anti-regression exemption registry, rebaseline the 143-case executable corpus at zero exemptions/missing, run the announced closeout gate, and publish the final handoff.

## Gate Contract

- One named commit per verified gate under the user's standing approval; a scope change or additional visible output change requires fresh approval.
- No push. Stage only V2-owned files and required durable memory after inspecting the staged diff.
- Each gate records focused tests, incremental TypeScript, memory protocol, file-size, and diff hygiene. UI gates also require real-app Playwright inspection of answer/error cards, details, History, readability, and overflow.
- The closeout aggregate runs alone, with at most four Vitest workers, after being announced. Gate-owned processes must be stopped after evidence collection.
- Untracked `test-results/` remains protected throughout the program.

## Completion Criteria

- V1 and V2 validate strictly and resolve through one presentation/semantics authority.
- Stored V1 remains unchanged; stored V2 is visible; future versions remain opaque and retained.
- Migrated V2 producers carry required standard MathJSON for every actual math leaf and typed non-math semantics for the 23 former residuals.
- The 143-case coverage report has zero exemption identifiers and zero missing classifications.
- All app-visible output matches the frozen baseline except the approved derivative-at-point correction.

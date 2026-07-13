# CANONICAL-OUTCOME-CALCULATE-EQUATION1 Gate

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

## Gate

- kind: backend
- result: verified
- Calculate and Equation main workers now emit validated `CanonicalRuntimeOutcome` payloads.
- The Equation direct-symbolic helper uses the same worker contract.
- Calculate and Equation OOE jobs carry canonical payloads; current public callers receive a single canonical-derived Display read model.
- Existing worker host IDs, fallback timing, cancellation, OOE authority, capability identity, Surface DTOs, mathematics, and wording are unchanged.

## Evidence

- focused worker/OOE tests: 23 passed
- result-contract tests: 73 passed
- display-inversion ratchet: 22 passed; 647 producers, 613 consumers, 174 native documents, one compatibility projection, 411 legacy reads, zero violations
- incremental TypeScript, lint, production build, file-size, OOE boundaries, compartments, seam plan, and diff hygiene: pass
- post-build Chromium: RAD `arcsin(1)` and Equation quadratic cases pass with one worker and zero retries
- visual inspection: Calculate answer and approximation both show `14`; Equation shows `x=2`, `x=3`, selected target `x`, and no overflow
- discarded evidence: the first browser preview used the prior `dist`; it was not counted and was rerun after `npm run build`
- ignored evidence: `.task_tmp/canonical-mathjson-legacy-program/move-13-*`

## Handoff

- Next gate: `CANONICAL-OUTCOME-SYMBOLIC-CALCULUS1`.
- Protected: concurrent Notebook work and untracked `test-results/`.
- Push: not authorized.

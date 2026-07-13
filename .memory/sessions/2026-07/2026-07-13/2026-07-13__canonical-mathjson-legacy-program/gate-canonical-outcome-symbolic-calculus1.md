# CANONICAL-OUTCOME-SYMBOLIC-CALCULUS1 Gate

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
- The existing Calculus worker, fallback, cancellation, and OOE boundaries now carry validated `CanonicalRuntimeOutcome`.
- Derivative, integration, limit, series, Laplace, partial, ODE, and IVP native representations remain private to their established solver districts.
- The public mode wrapper derives the current Display read model only after OOE completion.
- Canonical-only results retain `exactLatex`; `canonicalMath` remains absent without proven MathJSON.

## Evidence

- focused tests: 31 Calculus/result tests and 12 Calculus UI runtime tests pass
- runtime boundaries: 19 probes and 77 workspace runtime-contract tests pass
- display inversion: 22 tests pass; 645 producers, 613 consumers, 174 native documents, one compatibility projection, 411 legacy reads, zero violations
- incremental TypeScript, lint, production build, file-size, OOE boundaries, compartments, seam plan, memory protocol, and diff hygiene: pass
- Chromium: derivative and integral canaries pass with one worker and zero retries; final current-build checks also pass derivative plus Calculate cancel-factors
- visual inspection: derivative `2x`, integral `x^2/2+C`, cancel-factors `(x+1)/x`, two validity facts, and no obvious overflow
- startup note: the first two-canary attempt had one pre-computation Settings-panel miss; the single zero-retry reproduction and final evidence passed
- ignored evidence: `.task_tmp/canonical-mathjson-legacy-program/move-14-*`

## Handoff

- Next gate: `CANONICAL-OUTCOME-GUIDED-DOMAINS1`.
- Protected: concurrent Notebook work and untracked `test-results/`.
- Push: not authorized.

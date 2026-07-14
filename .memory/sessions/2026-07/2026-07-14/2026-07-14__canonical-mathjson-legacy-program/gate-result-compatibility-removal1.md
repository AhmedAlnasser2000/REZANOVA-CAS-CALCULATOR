# RESULT-COMPATIBILITY-REMOVAL1

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

- labels: backend, ui
- result: pass for milestone-owned scope
- authority: canonical documents are the only runtime and semantic-consumer result truth
- output contract: no intentional mathematics, wording, formatting, worker-topology, capability, OOE, or Surface DTO change
- protected lane: concurrent Notebook source, styles, tests, and untracked `test-results/` were not edited or staged

## Removal

- Removed `DisplayOutcome`, `DisplayMathPayloadV1`, reverse/runtime/storage projections, legacy result resolvers, and old Display test bridges.
- Kept domain-local `ResultProducerDraft` only as typed workspace-owned adapter input; it is not runtime or consumer authority.
- Removed the separate Table-response authority option from `requireCanonicalResultAuthority`; canonical Table structure is already inside the validated document.
- Preserved approximation-only Copy Result through the canonical document's visible approximation while exact copy remains primary-math-first.

## Verification

- result contract: 63 tests pass across all 43 golden and 100 replay executions; targeted native/Table delta is 10 tests
- inventories: inversion 401 producers, 57 canonical reads, 149 native documents, zero compatibility and legacy reads; printer 527 paths and zero fallbacks; detail 449 declared and zero undeclared
- boundaries: OOE 8 tests and compartment 36 tests pass; Surface 45 tests and runtime probes 21 tests pass in retained focused evidence
- browser: nine Chromium History/replay journeys pass in 42.9 seconds with one worker; all screenshots were inspected and show readable answer cards, restored identities, exact Table rows, and no obvious overflow
- static: Vite production build, milestone-owned lint, file-size, and diff hygiene pass
- external blocker: incremental TypeScript reaches only two nullability errors in concurrent `NotebookPage.tsx`; global lint reaches only that file's effect/dependency findings after the milestone-owned lint repair

## Handoff

- Next gate: `CANONICAL-MATHJSON-LEGACY-CLOSEOUT0`.
- Run the one announced closeout-scale gate sequentially with at most four Vitest workers.
- Do not repeat broad suites after a bounded correction; use targeted invalidation evidence.
- Do not push.

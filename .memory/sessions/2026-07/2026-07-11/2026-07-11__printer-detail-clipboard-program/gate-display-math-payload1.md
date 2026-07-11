# DISPLAY-MATH-PAYLOAD1 Gate

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

- Kind: `backend` contract with `ui` parity evidence.
- Result: pass.
- Runtime behavior changed: additive canonical metadata only; visible rendering, computation, History replay, and Surface Protocol output are unchanged.

## Contract Evidence

- `DisplayMathPayloadV1` carries `version: 1`, canonical LaTeX, and optional validated plain MathJSON bounded by the printer contract.
- Calculate emits payloads only from retained exact answer nodes. It does not reuse `normalizedMathJson`, which may describe input or intermediate state.
- Direct exact inverse trig emits unit-specific answer nodes: `arcsin(1)` is `90` in DEG and `Pi/2` in RAD.
- Equation finite-root IR emits payloads only when every visible branch has a native node and the target is a safe single symbol. Target rewrites discard the payload instead of allowing canonical/exact drift.
- All 43 golden executions ratchet `canonicalMath.canonicalLatex === exactLatex`; nine current cases carry payloads.
- Invalid or oversized optional MathJSON is omitted while canonical LaTeX remains available.
- History display entries and Surface Protocol DTOs explicitly exclude `canonicalMath`.
- Print hygiene now collects 24 mathematical fragment kinds. The accepted baseline contains 185 fragments, including nine canonical-payload fragments, with no primary-output changes.

## Verification Evidence

- Focused payload, producer, worker, Equation finite-root, target-rewrite, History, Surface, and print-hygiene suite: 83 passed.
- `npm run test:printer-contract`: 12 passed.
- `npm run test:golden`: 44 passed across 43 executions.
- `npm run test:print-hygiene`: 7 passed after the explicit accepted update reason.
- `npm run test:history-replay`: 5 passed, including all 100 fixtures.
- `npm run test:feature-probes`: 124 native and 37 UI tests passed.
- `npm run test:workspace-runtime-contracts`: 74 passed; `npm run test:runtime-probes`: 19 passed.
- `npm run test:display-contracts`: 132 native and 21 UI tests passed; `npm run test:app-state-contracts`: 52 passed.
- `npm run test:unit`: 3,514 passed across 488 files; `npm run test:ui`: 441 passed across 59 files.
- TypeScript, production build, lint, Surface Protocol, OOE, compartment, seam-selector, file-size, memory-protocol, and diff-hygiene gates passed.
- `npm run test:canaries:browser`: 19 passed in 1.2 minutes.
- Playwright inspected Calculate `arcsin(1)` and Equation `x^2-5x+6=0` at 1440 by 1000. Answer/detail cards were readable, scroll/client dimensions matched, and no overlap or overflow was visible.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-11.md`
- `.memory/research/roadmaps/printer-detail-clipboard-roadmap.md`
- `.memory/sessions/2026-07/2026-07-11/2026-07-11__printer-detail-clipboard-program/`

# INTEGRATION-RATIONAL-PRESENTATION1 verification

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

## Status

Started 2026-09-29; resumed 2026-09-30. UI, CRITICAL, root-only. Implementation and focused verification complete. Memory/file-size/diff gates pass. No staging, commit or push.

## Evidence

- 170 focused core/printer/draft tests passed, including all 138 retained core tests.
- Presentation corpus initially passed 17 tests; final result-contract run includes the additive-formatting correction.
- Runtime UI: 3 passed, including unchanged job signal/revision and restoration.
- npm-dev Playwright: initial 4/5 passed; a condition-label selector was updated for grouped provenance, then the two affected scenarios passed (16.7 s). Three unaffected scenarios retain their passing evidence.
- Desktop compact/full, original conditions, quintic narrow/full screenshots inspected. Wide formulas scroll within the panel.
- Temporary evidence: `.task_tmp/integration-rational-presentation1/`.
- Largest supplied fixture exhausts the unchanged 2,048-bit default; explicit 8,192-bit test profile succeeds (other limits unchanged). This is a backend resource boundary, not a formatting restriction.

## Final verification, 2026-09-30

- Retained kernel + shared printer + draft tests: 170 passed (21 files, 6.78 s), including 138 unchanged core tests and isolation.
- Result-contract suite: 157 passed (20 files, 54.80 s), including 11 new integration presentation tests and all three supplied examples.
- Runtime UI: 3 passed, with tab-local preferences, restoration, active-job/revision stability and request-payload isolation.
- Final formatting deltas are targeted: emphasized line-leading plus signs use MathLive's bold font at 120%; unit logarithmic weights are omitted structurally. No proof or artifact changes.
- Playwright through `npm run dev` on localhost: six distinct scenarios covered across initial and targeted runs; affected exact/copy/artifact flow and quintic flow passed after correction; the added multi-term plus-sign scenario passed. Screenshots inspected for compact/full, original conditions, narrow quintic, bold continuation signs and controlled errors.
- Incremental TypeScript and scoped ESLint passed. Compartment and OOE boundary gates passed. Authority tooling: 7 passed; all 20 frozen producers pass enforcement. Display tooling: 25 passed; final inventory passes after moving exactly one canonical-reader entry from the page to the presentation module; zero compatibility and legacy-reader growth.
- Shared `printer.ts`, canonical serializers/schemas, producer result conversion, execution limits and exact-core production source remain unchanged. No staged files or commit.

- Final hygiene: memory protocol passed; file sizes passed (2,301 files, 5 baseline caps); `git diff --check` passed. No staging. Full repository lint/build deferred until separately authorized commit. Final seven-test formatting delta passed; the emphasized-additions Playwright rerun passed (4.0 s), with desktop/narrow screenshots inspected. V2 zero-answer conditions also collect their variable from native exclusions so `x-1` remains descending even when the primitive is constant.

- Zero-primitive condition-ordering delta: 2 tests passed; affected npm-dev artifact/copy/conditions scenario passed (8.5 s). Final TypeScript and scoped lint passed. Owned localhost:1421 server stopped; the existing localhost:1420 server is not owned and was left running.

## Authorized commit gate

2026-09-30: repository-wide `npm run lint` passed with zero errors and two existing Graphing ref-cleanup warnings; `npm run build` passed (TypeScript and Vite). Prior focused mathematical/UI/Playwright evidence remains applicable. Commit authorized; only owned milestone paths and durable memory staged. Agent Attention edits excluded; no push.

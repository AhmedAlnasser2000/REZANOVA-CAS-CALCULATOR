# Design investigation verification

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

## Backend gate: pass (design scope only)

- Existing focused tests: `vitest run src/lib/symbolic-engine/integration-transcendental-rde.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-second-kind-bounded-solve-attempt.test.ts src/lib/calculus/engine/antiderivative-expression.test.ts --maxWorkers=2`: 3 files / 17 tests passed, 13.98 seconds. No full suite.
- Probe command: `vite-node .task_tmp/integration-reconstruction-design1/probes.ts`. Number-backed scalar multiplication produces `27021597764222972` for `9007199254740991*3`; exact expected `27021597764222973`.
- Parser retains `{num:"9007199254740993"}`; legacy scalar reader rejects it. Standard MathJSON conversion/proof accepts the large rational node and preserves printed digits. This is conversion evidence, not an integration proof.
- JSON-compatible envelope inspection rejects raw bigint. `RootOf` is detected as a custom operator. Depth-three exponential tower reports a controlled depth cap.
- Source inventory: 194 direct production importers of shared polynomial facade; exact groups and consumer paths in direct-consumers.json. Existing primitive/exponential Risch analyzers are readiness/closure, not full decision engines.
- No future-core tests exist or are claimed passed. No new implementation was written; temporary probes call existing production functions.

## UI gate: selected current baseline observed

- Command: `node .task_tmp/integration-reconstruction-design1/visual.mjs`; Playwright with installed Chrome, fresh isolated browser context, local Vite on 127.0.0.1:1432, 1500x1100 viewport.
- `1/(x^2+1)`: arctan(x)+C answer and integration-presentation card inspected.
- `exp(x^2)`: erfi primitive and non-elementarity/proof-scope/input/branch/obligation cards inspected. The visible special-function answer has no +C in this baseline; this is a retained observation, not a new correction or general UI acceptance.
- `1/sqrt(x^3-x+1)`: EllipticF answer, real-branch condition, endpoint exclusions, root definitions, chart/proof and elementarity cards inspected. Expanded detail flow is long but no horizontal answer overflow observed; answer width/scroll width 1300/1300 for all three samples.
- Screenshots: `.task_tmp/integration-reconstruction-design1/{rational,non-elementary,algebraic}.png`; DOM/metric observations in visual-results.json. Browser and owned dev server closed after inspection.
- These are representative baseline observations, not full corpus validation, a new solver proof, or future-kernel verification. No app-visible output changed.

## Final documentation checks

- `npm run test:memory-protocol`: 22 tests and repository validation passed.
- `npm run test:file-sizes`: 10 tests and repository ratchet passed (2177 files).
- `git diff --check`: passed; all relative Markdown links in the five integration design documents resolve.
- Source status confirms this task changed no production/test/config files. Snapshot hashes show concurrent updates to existing Graphing `implicit.ts` and `implicit.test.ts`; this task did not edit or revert them. Other initially captured Graphing/source-mirror files retained their hashes.
- No implementation build/full regression suite run for documentation. No new capability is marked implemented. Files remain unstaged/uncommitted.

## Authorized design checkpoint

- 2026-09-26: explicit user commit instruction supersedes the earlier no-commit instruction for this prior gate only. Memory protocol (22 tests), file-size validator (10 tests), and diff hygiene pass again. Documentation-only checkpoint; no new runtime verification claim.

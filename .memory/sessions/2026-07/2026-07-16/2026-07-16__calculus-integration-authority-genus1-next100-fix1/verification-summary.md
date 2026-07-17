## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Verification Ledger

- Program verification is in progress.
- App-visible mathematical output gates require Playwright evidence before completion.
- Complete-suite commands are reserved for the final cross-cutting closeout; ordinary gates use focused tests and contract ratchets.

## CANONICAL-RESULT-V4-SPECIAL-FUNCTION-EXPRESSION1

- gate_type: backend
- status: verified
- `npx vitest run src/lib/result-contract/v4-special-function-expression.test.ts` - pass, 12 tests.
- Focused V2/V3/native/consumer/History compatibility run - pass, 38 tests.
- `npm run test:result-contract` - pass, 126 tests across 18 files.
- `npm run test:canonical-result-v2-enforcement` - pass after sandbox escalation was required only because the ratchet self-test creates a temporary Git repository; V2 frozen-file enforcement and display inversion pass.
- `npx tsc -b --pretty false` - pass.
- `npm run test:file-sizes` - pass.
- `npm run test:memory-protocol` - pass before the final gate note.
- `git diff --check` - pass.
- Playwright: not applicable because this contract-only gate has no live V4 producer and changes no app-visible output.

## CALCULUS-INTEGRATION-NATIVE-RESULT-IR1

- gate_type: backend
- status: verified
- Focused Vitest: `npx vitest run src/lib/calculus/engine/antiderivative-expression.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts --maxWorkers=2` - pass, 54 tests.
- `npm run build` - pass, including TypeScript project build and production Vite build.
- Focused Chromium Playwright: `CALCWIZ_CAPTURE_GATE_EVIDENCE=1 npx playwright test e2e/calculus-native-ir-gate.spec.ts --project=chromium` - pass, 1 test after rebuilding the preview bundle.
- Playwright checks: one visible antiderivative row, structural right-hand `+C`, Integration Presentation evidence, Copy Result, To Editor, History replay, and overflow readiness.
- Visual screenshot: `test-results/calculus-native-ir-gate-na-a0e3f-ritative-across-app-actions-chromium/calculus-native-ir.png`; inspected at original resolution with no overlap, clipping, or mixed-number ambiguity.
- Browser-led correction: the first current-source run exposed `3\\cdot\\frac{x^2}{2}`; structured scalar scaling now folds the coefficient into the quotient numerator and the final app renders `\\frac{3x^2}{2}`.
- Existing boundary: the frozen V1 runtime does not expose the core Trust section for this direct route. The core verification remains `verified-exact`; the approved V2 authority migration gate owns the runtime Trust handoff.
- `npm run test:file-sizes` - pass, 1,991 files checked against five baseline caps.
- `npm run test:memory-protocol` - pass.
- `git diff --check` - pass.

## CALCULUS-INTEGRATION-V2-AUTHORITY-MIGRATION1

- gate_type: backend/ui
- status: verified
- Focused Vitest: `npx vitest run src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/workspace/engine.test.ts src/lib/calculus/engine/antiderivative-expression.test.ts src/lib/result-contract/v2-contract.test.ts --maxWorkers=2` - pass, 62 tests.
- Incremental TypeScript: `npx tsc -b --pretty false` - pass.
- Canonical authority: `node tools/canonical-result-v2-enforcement.mjs` - pass for the frozen-producer enforcement inventory.
- Display inversion ratchet: `node tools/display-contract-inversion-ratchet.test.mjs` - pass, 24 subtests.
- Calculus corpus gate: `npm run test:calculus-integration-corpus` - pass, validating 950 unique source-backed indefinite integration cases, 50 duplicate records, 1373 run results, and 84 scan findings.
- File-size gate: `npm run test:file-sizes` - pass after extracting integration dispatch, scalar retry, retry details, and trig-power normalization helpers.
- Authority inventory: `env AUTHORITY_INVENTORY_START=0 AUTHORITY_INVENTORY_COUNT=120 ./node_modules/.bin/vite-node .task_tmp/calculus-integration-authority-genus1-next100-fix1/authority-inventory.ts` - pass, sampled ordinary successes as `indefiniteIntegral:standard` and controlled errors as `indefiniteIntegral:error`.
- Playwright visual verification: `npx playwright test --config .task_tmp/calculus-integration-authority-genus1-next100-fix1/playwright-v2-authority.config.ts --project=chromium` - pass.
- Playwright inspected `sqrt(4-x^2)`, `sqrt(x^2+4)`, `(2x^4+x^2+1)/(x^2+4x+1)`, and controlled error `(sec(x)+cot(x))^2` for answer/error cards, Valid When facts, integration detail cards, Trust/Detailed Facts, Copy Result `+C`, To Editor transfer, History replay, and overflow/readability.
- Known unrelated blocker: the broader `npm run test:result-contract` path is not used as this gate's evidence because unrelated dirty MathJSON coverage work in the shared tree changes `calculate.integrals` coverage totals. This gate instead ran the focused V2 contract tests plus frozen-producer and display-inversion ratchets.
- `git diff --check` - pass.

## CALCULUS-INTEGRATION-V4-SPECIAL-MIGRATION1

- gate_type: backend/ui
- status: verified
- Focused Vitest: `npx vitest run src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/engine.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-expression.test.ts src/lib/result-contract/v2-contract.test.ts src/lib/result-contract/v4-special-function-expression.test.ts src/lib/symbolic-engine/integration-transcendental-certificate-result-shape.test.ts --maxWorkers=2` - pass, 101 tests.
- Focused regression Vitest after dispatch line tightening: `npx vitest run src/lib/calculus/engine/core.test.ts -t "guards lazy Compute Engine fallback" --maxWorkers=1` - pass.
- Incremental TypeScript: `npx tsc -b --pretty false` - pass.
- Calculus corpus gate: `npm run test:calculus-integration-corpus` - pass, validating 950 unique source-backed indefinite integration cases, 50 duplicate records, 1373 run results, and 84 scan findings.
- Authority inventory: `AUTHORITY_INVENTORY_START=0 AUTHORITY_INVENTORY_COUNT=120 npx vite-node .task_tmp/calculus-integration-authority-genus1-next100-fix1/authority-inventory.ts` - pass across 68 representative corpus families with 65 `indefiniteIntegral:standard`, 3 `indefiniteIntegral:error`, and no V1 outcomes.
- Special authority probe: `npx vite-node .task_tmp/calculus-integration-authority-genus1-next100-fix1/special-authority-probe.ts` - pass. `1/ln(2x+1)`, `e^x/x`, `sin(e^x)`, and `e^{x^2}` select V4 typed special-function authority, while `e^{-x^2}` and `sin(x^2)` remain standard V2.
- Playwright visual verification: `npx playwright test --config .task_tmp/calculus-integration-authority-genus1-next100-fix1/playwright-v2-authority.config.ts --project=chromium` - pass, 2 Chromium tests after sandbox escalation was required only to bind the local preview server.
- Playwright inspected typed V4 `li(2x+1)` output, standard V2 `Erf` output, ordinary V2 answers, controlled boundary errors, facts/detail cards, Trust, Copy Result, To Editor, History replay, and overflow/readability. Screenshots include `test-results/v2-authority-visual-V4-spe-85f10-definite-integration-output-chromium/li-affine-v4.png` and `test-results/v2-authority-visual-V4-spe-85f10-definite-integration-output-chromium/erf-standard-v2.png`.
- Verification-caught fixes: cloned repeated affine condition leaves to avoid V4 duplicate-reference validation failure, kept Risch-Norman log/partial-fraction adoption on route-owned precomputed trust, preserved route-owned affine readback such as `2x+1` in V4 leaves while proving standard MathJSON, and rendered standard `Erf` with V2-compatible casing.
- File-size gate: `npm run test:file-sizes` - pass after keeping `src/lib/symbolic-engine/integration/dispatch.ts` at the committed 1000-line cap.
- `git diff --check` - pass.

## ALGEBRAIC-GENUS1-CUBIC-HERMITE-PRECONDITIONER1

- gate_type: backend
- status: verified
- Added `buildAlgebraicGenus1CubicHermitePreconditioner` as a backend-only exact reducer for polynomial-over-square-root cubic differentials.
- The reducer accepts exact squarefree cubic `y^2=P(x)` inputs, computes a correction `Q(x)y`, and leaves only the `dx/y` plus `x dx/y` residual basis for the following live second-kind gate.
- Radical-product normalization is intentionally bounded: the selected `sqrt(x^3)sqrt(x^2+1)` family normalizes to a polynomial-over-cubic-radical shape only with explicit real-branch facts `x\\ge0` and `x^2+1>0`; unproved radical products fail closed.
- Repeated-root cubics stop with `repeated-root-degeneration` so the existing genus-0 degeneration route remains the live owner.
- Focused Vitest: `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus1-cubic-hermite-preconditioner.test.ts --maxWorkers=1` - pass, 4 tests.
- Incremental TypeScript: `npx tsc -b --pretty false` - pass.
- File-size gate: `npm run test:file-sizes` - pass, 2003 files and 5 baseline caps.
- `git diff --check` - pass.
- Adjacent regression attempt: grouped `integration-algebraic-function-field-orchestrator`, `integration-algebraic-genus1-elementarity-certificate`, and `integration-algebraic-genus1-second-kind-solve-backcheck-surface` Vitest run was interrupted after the existing genus-1 surface became performance-bound; individual orchestrator and elementarity reruns were also interrupted after 60s with no completion. This gate is backend-only and the new focused reducer suite is the authoritative evidence for the new surface.
- Playwright: not applicable for this gate because no app-visible integration result or boundary output changed; live adoption and visual verification belong to `ALGEBRAIC-GENUS1-SECOND-KIND-LIVE1`.

## ALGEBRAIC-GENUS1-SECOND-KIND-LIVE1

- gate_type: backend/ui
- status: verified
- Added a live genus-1 cubic Hermite adoption route for exact cubic reductions whose residual is first-kind after the preconditioner.
- The selected radical-product regression `sqrt(x^3)sqrt(x^2+1)` now normalizes under real-branch facts to a correction plus typed V4 `EllipticF(2 arctan sqrt(x), 1/2)` residual, with structural `+C`, typed branch facts, and producer-proven standard MathJSON leaves.
- True second-kind residuals such as `sqrt(x^3-x)` still fail closed with a visible route-owned boundary and detail evidence; no partial antiderivative is adopted.
- Fixed V4 leaf proof/readability issues found by Playwright: additive coefficient products now render with explicit `\cdot`, the `x^3+x` residual prefers the cleaner lemniscatic chart over artificial `A_{\alpha_1}` root symbols, and Integration Presentation keeps its backcheck sentence visible as plain text in V4 details.
- Focused Vitest: `./node_modules/.bin/vitest run src/lib/symbolic-engine/integration-algebraic-genus1-second-kind-live.test.ts src/lib/calculus/workspace/integrals.test.ts --maxWorkers=1` - pass, 30 tests.
- Incremental TypeScript: `./node_modules/.bin/tsc -b --pretty false` - pass.
- Calculus corpus gate: `npm run test:calculus-integration-corpus` - pass, validating 950 unique source-backed cases, 50 duplicate records, 1373 run results, and 84 scan findings.
- Playwright visual verification: `./node_modules/.bin/playwright test --config .task_tmp/calculus-integration-authority-genus1-next100-fix1/playwright-genus1-second-kind-live.reuse.config.ts` - pass after escalation was required for Chromium sandbox launch. The managed webServer config failed to start against the existing dev server, so the reuse config targeted the already-running Vite server on port 1431.
- Playwright inspected the selected radical-product success and the unresolved true second-kind boundary for answer/error cards, Valid When facts, genus-1 detail cards, Integration Presentation backcheck wording, Copy Result, overflow/readability, and screenshots.
- File-size gate: `npm run test:file-sizes` - pass, 2008 files and 5 baseline caps.
- Memory protocol: `npm run test:memory-protocol` - pass.
- `git diff --check` - pass.

## CALCULUS-INTEGRATION-SUBSTITUTION-ROOT-GAPS2

- gate_type: backend/ui
- status: verified
- Added exact derivative-product substitution coverage for reciprocal trig-power equivalents, nested `tan(x)` carriers, and inverse-trig self-carrier products.
- Added a bounded square-root substitution route in `src/lib/symbolic-engine/integration/sqrt-substitution.ts` for supported `sqrt(x)` carriers with polynomial factors, avoiding the earlier scratch-style `gaps` source filename.
- Focused Vitest: `./node_modules/.bin/vitest run src/lib/calculus/workspace/integrals.test.ts --maxWorkers=1` - pass, 29 tests.
- Backend probe: `./node_modules/.bin/vite-node .task_tmp/calculus-integration-authority-genus1-next100-fix1/probe-next100-regressions.ts` - pass. New standard successes include `sin(x)/cos^3(x)`, `sin(tan(x))/cos^2(x)`, `arctan(2x)/(1+4x^2)`, `arctan(sqrt(x))`, and `sin(sqrt(x))`; `sec^2(x)csc^2(x)` and `x ln^2(x)` remain controlled Integration Boundary rows for the following gate.
- Calculus corpus gate: `npm run test:calculus-integration-corpus` - pass, validating 950 source-backed unique cases, 50 duplicate records, 1373 run results, and 84 scan findings.
- Playwright visual verification: `./node_modules/.bin/playwright test --config .task_tmp/calculus-integration-authority-genus1-next100-fix1/playwright-substitution-root-gaps.config.ts --project=chromium` - pass, 2 Chromium tests. The run inspected success and boundary answer/error cards, Integration Presentation, Trust, Copy Result, To Editor on the final success case, and overflow/readability screenshots.
- Incremental TypeScript: `./node_modules/.bin/tsc -b --pretty false` - pass.
- File-size gate: `npm run test:file-sizes` - pass, 2009 files and 5 baseline caps.

## CALCULUS-INTEGRATION-TRIG-IBP-FORMAL2

- gate_type: backend/ui
- status: verified
- Added bounded trig/IBP/formal coverage for `sec^2(x)csc^2(x)`, structured `x\ln(x)^2`, and formal `f(x)f'(x)`.
- Renamed the live production helper from milestone-style `ibp-gaps.ts` to `by-parts-textbook.ts`; the stale `root-substitution-gaps.ts` tab is not present in live source.
- Fixed the malformed pasted `x\ln^2(x)` runtime path by skipping invalid request MathJSON leaves on V2 controlled errors, so it renders as an Integration Boundary instead of a worker proof failure.
- Focused Vitest: `./node_modules/.bin/vitest run src/lib/symbolic-engine/integration-trig-ibp-formal.test.ts src/lib/calculus/engine/antiderivative-expression.test.ts --maxWorkers=1` - pass, 9 tests.
- Focused workspace/native-result Vitest: `./node_modules/.bin/vitest run src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/workspace/engine.test.ts --maxWorkers=1` - pass, 53 tests.
- Backend probe: `./node_modules/.bin/vite-node .task_tmp/calculus-integration-authority-genus1-next100-fix1/probe-next100-regressions.ts` - pass. `sec^2(x)csc^2(x)` returns `-2\cot(2x)+C`, structured `x\ln(x)^2` returns `\frac{1}{2}x^2\ln(x)^2-\frac{1}{2}x^2\ln(x)+\frac{1}{4}x^2+C`, malformed `x\ln^2(x)` remains a controlled Integration Boundary, and prior next100 successes remain intact.
- Calculus corpus gate: `npm run test:calculus-integration-corpus` - pass, validating 950 source-backed unique cases, 50 duplicate records, 1373 run results, and 84 scan findings.
- Playwright visual verification: `./node_modules/.bin/playwright test --config .task_tmp/calculus-integration-authority-genus1-next100-fix1/playwright-substitution-root-gaps.config.ts --project=chromium` - pass, 2 Chromium tests. The run inspected success and boundary answer/error cards, Integration Trig Identity, Integration By Parts, Integration Presentation, Trust, Copy Result, To Editor, and overflow/readability.
- Incremental TypeScript: `./node_modules/.bin/tsc -b --pretty false` - pass.
- File-size gate: `npm run test:file-sizes` - pass after extracting `dispatch-by-parts.ts`; `dispatch.ts` is 911 lines.
- `git diff --check` - pass.

# CI-REGRESSION-REPAIR1 verification summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live
- gate_type: backend
- date: 2026-07-18

## Verified repairs

- Canonical Result enforcement validates immutable historical baselines against their historical V2-default registry, including synthetic Git regression coverage.
- Result-intent and print-hygiene baselines accept the current 46-case corpus; zero printer compatibility fallbacks remain.
- Calculus integral and Statistics canaries use current presentation and workspace controls; side panels stack above their overlay backdrop.
- `tools/tsconfig.json` supplies Node types and is referenced by the root build, resolving `node:fs` and `process` diagnostics in `mathjson-coverage-ratchet.ts`.
- Final verification was re-grounded against the live V1-V4 repository state and recent commits; the V4 Calculus draft keeps its required action-free type without changing runtime output.

## Automated evidence

- Canonical Result V2 enforcement: 7/7 tool tests passed; 20 frozen files validated; focused V2/MathJSON/display inversion command completed.
- Printer migration: 10/10 tool tests; 607 result paths; 402 migrated dual writes; 194 forwarders; 0 compatibility fallbacks; baseline pass.
- Display contracts: 26 files / 157 tests and 5 UI files / 27 tests passed; SideSurfaceHost 4/4 passed.
- Equation delta: 7 files / 119 tests passed; Equation canaries 2/2 passed.
- Result intent 2/2, print hygiene 7/7, MathJSON coverage 4/4, CI alignment 9/9, seam selector 15/15, and file sizes 10/10 passed.
- `npx tsc -p tools/tsconfig.json --pretty false`, `npx tsc -b --pretty false`, repository-wide ESLint, build, and `git diff --check` passed.
- Workspace canaries: 19/19 passed with one worker.
- Focused Linear Algebra editor UI: 6/6 passed; focused Complex-domain regression: 30/30 passed.

## Post-commit enforcement correction

- GitHub exposed two remaining Display inversion assertions after `9a7a87bc`: Equation compatibility was `1` instead of `0`, and the producer floor was `441` instead of `440`.
- Root cause was the lint-motivated `delete` form in `moveTrailingComplexIntegerCondition`, which preserved runtime behavior but hid the canonical-field omission from the static inversion scanner.
- The correction restores a typed rest omission with explicit `void` uses. The full Canonical Result V2 enforcement command passes with 440 producers, 58 consumers, 0 compatibility projections, 40 owner assemblies, 92 producer-draft reads, 0 legacy reads, and 162 native documents.
- Focused Complex-domain tests pass 30/30; TypeScript, focused ESLint, and diff hygiene pass.
- Concurrent Graphing work was preserved and subsequently committed as `ac2572bf` before the final durable-memory update. The correction remains isolated to its Equation source and this CI gate's memory evidence.

## Playwright visual evidence

- At 1280 by 720, Settings rendered above its dimming backdrop and its controls were clickable.
- Calculus rendered `1/2 x^2 + C`; Statistics rendered `n = 6`, `(1,2)`, `(2,3)`, `(4,1)`, and the matching chart.
- Equation rendered the `e^x=-1` Range Guard as an empty-set answer with the no-real-solution reason, readable cards, and no overflow.
- Captures are ignored under `.task_tmp/ci-regression-repair1/`.

## Golden follow-up

- Updated `equation-range-impossibility-stop` to require successful typed `\\varnothing`, answer-row, warning, Range Guard badge, symbolic origin, and retained runtime stop advisory.
- Updated `trigonometry-periodic-sine-equation` to require both exact degree families, answer rows, branch readback, integer supplement, planner badge, and symbolic origin.
- Updated the matching Trigonometry core test to preserve the no-Equation-handoff rule while accepting the intentional successful empty-set result.
- `npm run test:golden` passes 47/47; the combined golden and Trigonometry core run passes 60/60.
- Fresh Playwright inspection passes 2/2 with `npx playwright test e2e/.tmp-golden-visual.spec.ts --project=chromium`. The Equation card visibly renders `\\varnothing`, the no-real-solution warning, and the Range Guard badge; the periodic-family card visibly renders both exact branches, `n\\in\\mathbb{Z}`, Solve Target, and Parameterized Trig Solve details without horizontal overflow. The temporary spec was removed; captures remain ignored under `.task_tmp/golden-ci-repair/`.

## Remaining posture

- The original repair is committed as `9a7a87bc`, the Graphing authority commit remains `ac2572bf`, and the published enforcement correction remains unchanged as `ef392095`.
- The golden expectation delta is verified and staged as a normal child commit after repairing the accidental local amend. No push is authorized.

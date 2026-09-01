# Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Focused Tests

- Proof session, direct proof, and runtime adapter: 22/22 passed.
- Guarded carrier primary proof, run contract, runtime V2 routes, and stage carriers: 22/22 passed.
- Shared radical/carrier routes: 25/25 passed.
- Guarded stage routing: 39/39 passed.
- `npm run test:result-contract`: 140/140 passed with no `Compilation fallback for` warning.
- `npm run test:canonical-result-v2-enforcement`: all 20 frozen files passed; coverage remains `506/506/0/0`; display inversion remains baseline-clean.
- `npm run build`: passed after correcting one test-only invalid foreign route literal to the registered `calculate.arithmetic` route.
- `npm run test:file-sizes`: passed for 2,172 files and the five existing caps.
- Frozen `src/lib/modes/equation/run.ts` diff: clean.
- `git diff --check`: passed before durable-memory finalization and is rerun on the staged gate.

## Isolated Warm Benchmark

| Equation | Before median | After median | Improvement |
| --- | ---: | ---: | ---: |
| `sqrt((x^2+x)^2-(x^2+x))=1` | 16,164 ms | 2,139 ms | 86.8% |
| `sqrt(x^2+sqrt(5-x^2))=2` | 16,227 ms | 1,217 ms | 92.5% |
| `sqrt((2x+1)^4-5(2x+1)^2+4)=1` | 5,349 ms | 1,452 ms | 72.9% |
| `ln(sqrt((x^2+x)^2-5(x^2+x)+4))=0` | 54,334 ms | 5,173 ms | 90.5% |

- Harness: one warm-up request followed by three isolated measured executions per case; medians are dossier evidence, not CI timing assertions.
- Every case retained byte-identical final canonical LaTeX before and after the repair.

## Real-App Playwright

- Repository Playwright CLI passed the four-equation visual probe in one Chromium worker after each case was isolated in fresh browser state.
- Fresh-state observed completion times were 2,965 ms, 2,990 ms, 2,967 ms, and 4,998 ms.
- Distinct exact answer rows, conditions/facts, candidate rejection evidence, detail sections, Copy Result, History replay, answer overflow, and page overflow passed.
- Screenshots were visually inspected and retained only under ignored `.task_tmp/equation-proof-performance/screenshots/`; the temporary spec was removed.
- The first visual run exposed a stale-result bug in the temporary probe, not production. It was discarded and rerun with fresh state before evidence was accepted.
- The in-app browser JavaScript control tool was unavailable in this session. Repository Playwright CLI supplied the required real-app visual evidence, leaving no unverified output risk.

## Resource Hygiene

- No full unit/UI/canary aggregate or `npm run test:gate` was run.
- Generated `test-results/` and benchmark/screenshot artifacts remain ignored.
- Verification processes are stopped before handoff.

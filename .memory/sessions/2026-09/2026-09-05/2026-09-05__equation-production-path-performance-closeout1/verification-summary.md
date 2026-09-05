# EQUATION-PRODUCTION-PATH-PERFORMANCE-CLOSEOUT1 Verification Summary

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

## Gate

- gate_type: backend and ui
- status: verified; selective commit approval pending

## Correctness Evidence

- Result-contract command: 19 files and 144 tests passed with one worker.
- Comparator coverage includes signed-imaginary equality/set aliases, nested formal trees, functions, subscripts, matrices, near-misses, cache behavior, Vector Gram determinant, Matrix underdetermined families, and unchanged non-formal equivalence.
- Candidate/composition/runtime focused run: 6 files and 34 tests passed, including repeated constraints, residual reuse, non-`x` targets, angle units, undefined substitutions, rejection, dedupe, one lazy proof engine, cache reuse, request isolation, clone safety, and worker completion.
- Required `npm run test:equation-solve-result` ran exactly once under an external 180-second timeout: 9 files and 55 tests passed in 9.23 seconds.
- Canonical V2 enforcement passed for all 20 frozen producer files; its 7 Node tests, 12 focused V2/coverage tests, and embedded 24-test display inversion passed with the baseline unchanged.
- MathJSON coverage tests passed; the inventory remains 506 canonical leaves, 506 proven, 0 exempt, and 0 missing.
- Printer migration passed with 0 compatibility fallbacks; detail migration passed with 496/496 declared and 0 undeclared.
- Incremental TypeScript and production build passed. `npm run test:gate` was not run.

## Performance Evidence

- Method: one warm-up plus three isolated warm public-runtime-adapter executions per required case.
- `sqrt((x^2+x)^2-(x^2+x))=1`: median 526.126 ms; below the 2,352.9 ms non-regression cap.
- `sqrt(x^2+sqrt(5-x^2))=2`: median 524.894 ms; below the 1,338.7 ms non-regression cap.
- `sqrt((2x+1)^4-5(2x+1)^2+4)=1`: median 1,144.706 ms; below the 1,597.2 ms non-regression cap.
- `ln(sqrt((x^2+x)^2-5(x^2+x)+4))=0`: median 1,927.759 ms; meets the hard 2,000 ms target.
- `ln(sqrt(x^4-5x^2+4))=0`: median 387.712 ms.
- Equation golden/replay and representative polynomial, rational, radical, nested, exponential, logarithmic, trigonometric, and absolute-value route families had no production route above two seconds; classification: none.

## Browser Evidence

- Chromium real-app performance cases: 5/5 passed; each checked exact answers/branch counts, facts or conditions where applicable, detail cards, Copy Result, History replay, and horizontal readability.
- Chromium signed-imaginary cases: 2/2 passed after correcting temporary probe selectors; visible `x=-i` and `x=i` cards remain distinct and include Complex Linear Route/domain evidence.
- Visual inspection of all seven captured 1440x940 full-page screenshots found no clipped answer rows, unreadable details, or result-card overflow.
- End-to-end browser test durations for the five performance cases were approximately 4.4-5.6 seconds; signed-imaginary solve measurements were 1.909 seconds each. Browser timing is regression evidence only, not the hard backend target.

## Process and Scope Hygiene

- No Vitest, Playwright, preview, or Equation worker process remained after evidence collection.
- Frozen V1 files and all proof/print/display baselines are unchanged.
- Generated profiles, screenshots, traces, and temporary probes remain outside the commit.

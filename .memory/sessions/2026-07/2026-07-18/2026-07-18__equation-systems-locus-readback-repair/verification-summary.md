# EQUATION-SYSTEMS-LOCUS-READBACK-REPAIR verification summary

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
- gate_type: ui
- date: 2026-07-18

## Verification state

- Gate status: in progress.
- Current compile check: `npx tsc -b --pretty false` passed on 2026-07-18 with only the known non-fatal color-environment warning.
- Current visual state: not passed. The user-provided screenshots demonstrate unresolved output and interaction issues, so this gate cannot be called complete.

## Required before completion

- Focused Equation unit/integration suites for linear systems, direct loci, absolute-value readback, log-base parsing, periodic units, rational-power parity, rational holes, and Polynomial 2x2 repairs.
- Equation-specific Playwright visual evidence for the reported 2x2 dependent/inconsistent systems, a unique 3x3 system, symbolic 2x2/3x3 determinant-conditioned systems, direct point/line/circle/ray loci, deferred composite locus, absolute-value normalization, exact log answers, RAD/DEG/GRAD periodic cards, Complex branch conditions, history replay, and overflow.
- Contract and hygiene gates: canonical-result enforcement, display-contract inversion, result-contract coverage, `git diff --check`, file-size validation, and memory protocol.
- Corpus reruns only for affected canonical rows and applicable Complex companions, preserving the 45-second per-case timeout and duplicate policy.

## Commit status

- No completion commit has been recorded for this repair.
- Do not stage unrelated Calculus, Notebook, Matrix, Vector, Statistics, or `test-results/` files with this Equation repair.

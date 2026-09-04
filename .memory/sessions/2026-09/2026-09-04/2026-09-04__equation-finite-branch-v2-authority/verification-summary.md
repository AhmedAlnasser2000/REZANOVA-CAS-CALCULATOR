# EQUATION-FINITE-BRANCH-V2-AUTHORITY1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- gate_type: backend

## Automated Evidence

- Focused finite-branch, public runtime-adapter, stage-routing, substitution, and supplement tests: 87/87 passed.
- Equation Complex-domain regression controls: 30/30 passed.
- Full result-contract command with one worker: 140/140 passed and emitted no `Compilation fallback for` warning.
- MathJSON coverage: 506 canonical leaves, 506 proven, 0 exempt, 0 missing; 47 golden and 100 replay executions retained.
- Canonical Result V2 enforcement: passed with the frozen 57-route V1 inventory unchanged.
- Display-contract inversion: 24/24 passed; 1454 source files, 440 producers, 58 consumers, 0 compatibility projections, 0 legacy reads, and baseline validation passed.
- `npx tsc -b --pretty false`: passed.
- `npm run build`: passed on Node 24.19.0 and npm 11.17.0.
- `npm run test:file-sizes`: passed for 2,173 files and the five existing caps.
- `npm run test:memory-protocol`: passed after validating all 21 synthetic protocol cases.
- `git diff --check`: passed.
- No proof, print, enforcement, or display baseline changed.

## Browser Evidence

- Chromium Playwright real-app probe: 1/1 passed.
- Verified four exact normalized branches for `ln(sqrt(x^4-5x^2+4))=0`, visible Domain Facts and Outer Inversion / Power Lift evidence, Copy Result, identical History replay, and no horizontal overflow.
- The local `NO_COLOR` plus `FORCE_COLOR` notice was tooling noise; it did not affect app output or verification.

## Process Hygiene

- No Vitest, Playwright, or preview process remained active after evidence collection.
- Generated screenshots and `test-results/` remain ignored and unstaged.

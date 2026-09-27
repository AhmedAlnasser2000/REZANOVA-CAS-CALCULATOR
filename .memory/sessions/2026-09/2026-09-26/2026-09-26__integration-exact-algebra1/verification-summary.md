# Exact algebra verification

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

## Backend gate: pass

- `npx vitest run src/lib/symbolic-engine/integration/core --maxWorkers=2`: 7 files / 60 tests pass; final run 1.61s. Isolation traverses TypeScript imports/exports and literal dynamic imports/requires, confirming no outside production consumer or production dependency of the new core.
- `npx tsc -b --pretty false`: pass.
- `npx eslint src/lib/symbolic-engine/integration/core`: pass.
- `npm run test:compartments-boundaries`: 36 tests plus validation pass.
- `npm run test:ooe-boundaries`: 8 tests plus validation pass.
- `npm run test:memory-protocol`: 22 tests plus validation pass.
- `npm run test:file-sizes`: 10 tests plus validation pass; no baseline edits.
- `git diff --check` and new-file whitespace/local-link checks: pass.
- Temporary command logs: `.task_tmp/integration-exact-algebra1/`.

## Evidence interpretation

- Beyond-2^53 regressions use known literal answers; 16 static rational fixtures were independently generated with Python `fractions.Fraction` seed 90173. Runtime/tests have no Python dependency or external CAS execution.
- Division/Bezout/square-free results reconstruct identities. Linear replay checks pivot/rank shape, solution residuals, nullspace completeness/independence, and left-nullspace contradictions. Tests mutate coefficients, multiplicities, operations, rank, pivot lists, particular vectors, nullspaces and witnesses.
- Tiny budgets fail nested computations and final verification; sufficient budgets return exact values. Resource errors are distinct from algebraic failures and sticky across further use of the same context.
- During review, conservative integer scratch charging exhausted the original test budget. Accounting was tightened using a magnitude-derived binary capacity bound; the heavier Q(t) square-free test has its own explicit larger finite profile. No application resource baseline was changed.
- No UI gate, app answer, general integration completeness, heap accounting precision, benchmark guarantee, full regression run is claimed.
- Prior design gate commit: `3c5a292a`. The user subsequently authorized this implementation checkpoint; see commit-log.md.

## 2026-09-27 commit checkpoint

- User explicitly authorized this milestone commit and then requested continuation after interruption. No push authorized.
- Focused pre-commit rerun: 7 files / 60 tests pass (1.28s), including isolation.
- `npm run lint`: completed with 0 errors and two existing react-hooks warnings in Graphing `useGraphWorkspaceController.ts` (865, 867); no core warning.
- `npm run build`: TypeScript and Vite production build completed successfully (`built in 36.44s`). Retained logs establish completion after the terminal sessions expired; no full rerun was needed.
- Refreshed memory/file-size validators and staged diff hygiene pass. Current-state date refreshed for September 27.
- Commit metadata is in commit-log.md in this checkpoint; the commit can be resolved by that path. Only integration-owned changes are included; unrelated working-tree changes remain untouched.

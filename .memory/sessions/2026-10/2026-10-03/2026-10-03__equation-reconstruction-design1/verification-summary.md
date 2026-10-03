# Design gate verification

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Backend gate: pass (design scope only)

- Environment: cloud container, Node v22.22.2 (the repository requires 24.x); dependencies installed with `npm ci --force --ignore-scripts` to bypass the engine check. Timings are indicative only.
- App-path probe: `node node_modules/vitest/vitest.mjs run --config .task_tmp/equation-reconstruction-design1/vitest.baseline.config.ts .task_tmp/equation-reconstruction-design1/apppath.test.ts`. It runs 50 equations through `runEquationMode` with the symbolic screen, target x, exact answers, real domain and radians. 1 test passed in 165.1 s. Results are in `apppath-results.json`.
- Guarded-path probe: `baseline.test.ts` runs the same corpus through `runGuardedEquationSolve`. 1 test passed in 40.5 s. Results are in `baseline-results.json`. A follow-up (`followup.test.ts`) confirmed that the parameter cases fail on this path even with `solveTarget: 'x'`; parameters use the separate app route.
- Recheck (`recheck.test.ts`): the nested absolute-value cases entered with `\left|…\right|` still return "No validated real numeric roots…". The expected roots are −4 and 6, and ±1, ±5, ±7. sin x = 0 on [0, 100] returns 32 numeric roots.
- Cap inventory: from source search (`grep` for cap constants in `src/lib/equation`, `src/lib/symbolic-engine/primitives` and `src/lib/kernel`) plus a read of `src/lib/symbolic-engine/primitives/symbolic-polynomial/resultant.ts:91-118` (cofactor-expansion determinant).
- Probes call existing production functions read-only. No source was modified.

## Documentation checks

- `npm run test:memory-protocol` (run as `node --test tools/validate-memory-protocol.test.mjs` plus `node tools/validate-memory-protocol.mjs`): 24 tests passed and repository validation passed.
- `npm run test:file-sizes` (same two-step form): 10 tests passed; 2,404 files are within caps.
- `git diff --check` passed. New untracked files were scanned for trailing whitespace: none.
- All relative Markdown links in the five new docs and in the completion report resolve (scripted check).
- `git status` shows only the intended docs and `.memory` files. `.task_tmp/` is ignored.
- No build, lint or full suite was run: this is a documentation-only gate.

## UI gate

Not applicable. The user does not want old-UI evidence, and no app-visible output changed.

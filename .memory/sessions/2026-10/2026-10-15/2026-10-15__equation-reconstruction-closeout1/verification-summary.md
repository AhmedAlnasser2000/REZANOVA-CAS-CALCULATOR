# Verification: EQUATION-RECONSTRUCTION-CLOSEOUT1 PR A

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

- The equation core and New Equation unit suites (`src/lib/symbolic-engine/equation`, `src/lib/new-equation`): 59 files, 916 tests pass.
- `tsc -p tsconfig.app.json`, ESLint on the core and the tools, and `git diff --check` are clean.
- Full corpus run (`node tools/equation-parity/run.mjs 4 --fresh`, 220 s, 60 s watchdog): 0 killed, 0 failed.
  - Median 6 ms per run; 14 runs take 10–60 s (listed in the capability ledger).

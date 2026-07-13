# MATHJSON-COVERAGE-CLOSEOUT1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- kind: backend aggregate MathJSON coverage closeout
- result: pass
- commit approval: standing approval for the named milestone
- push: not authorized
- protected paths: concurrent Notebook work and untracked `test-results/`

## Coverage Evidence

- The route registry now owns both executable corpora exactly: 100 replay fixtures and all 43 golden executions across 57 operation families.
- The aggregate document set contains 458 canonical math leaves: 394 carry producer-proven standard Compute Engine MathJSON, 64 are exact non-growing exemptions, and zero are missing classification.
- The golden layer contributes 196 leaves: 163 proven and 33 exempt. The replay layer remains 262 leaves: 231 proven and 31 exempt.
- Six golden-only operation families are explicit: Calculate derivatives, integrals, and limits; Trigonometry period/phase; Matrix profile; and Vector span/independence.
- New proofs come from evaluator-owned ASTs, exact route evidence, bounds, landmarks, branch values, and native Matrix/Vector analysis. Formatted result LaTeX and normalized input are not promoted into authority.
- Golden exemptions are fixture- and leaf-scoped compound presentation, custom labels, or absent Table values whose separately structured mathematical values remain proven.

## Performance Evidence

- The accepted aggregate payload baseline is 107,318 serialized bytes with a 2,753-byte maximum document.
- Forty-three golden documents measure 35,711 bytes without optional MathJSON and 45,244 bytes with current proven trees.
- Three comparisons each use five cold and fifty warm structured-clone passes. Current warm P95 is 0.377-0.381 ms per 43-document pass, and no metric crosses the accepted 20 percent plus 0.5 ms block threshold.
- Per-MathJSON and canonical-document bounds remain unchanged.

## Verification Evidence

- MathJSON coverage ratchet: four tests pass against the accepted version-2 baseline.
- Focused producer contracts: four files and 27 tests pass.
- Affected Calculate/Calculus tests: two files and 38 tests pass.
- Affected guided and Linear Algebra tests: six files and 80 tests pass.
- Golden output parity: 44 tests pass across all 43 executions, including branches, actions, warnings, details, and Table rows.
- TypeScript passed after implementation; the final incremental TypeScript, focused lint, file-size, memory-protocol, and diff-hygiene gates pass before commit.
- No display string, mathematical result, card structure, worker topology, capability, OOE contract, or History behavior changes. Existing per-workspace Playwright evidence from Moves 5-8 remains valid and was not redundantly rerun.

## Resource-Safe Evidence

- No full unit, UI, canary, build, or browser suite was run for this backend-only aggregate gate.
- The 143-execution coverage corpus ran once per required baseline validation; one failed deterministic-order assertion received only a targeted rerun.
- The golden runner and clone benchmark were distinct required evidence, not automatic broad-suite repetition.
- No test or benchmark process remains running. The existing user-owned Vite server on port 1420 was preserved.

## Recovery Evidence

- Ignored audit and benchmark evidence is under `.task_tmp/canonical-mathjson-legacy-program/move-9-*`.
- The next approved gate is `EQUATION-STAGE-CARRIER-GUARDED1`.

# MATHJSON-COVERAGE-LINEAR-ALGEBRA1 Gate

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

- kind: backend producer coverage with app-visible parity verification
- result: pass
- commit approval: standing approval for the named milestone
- push: not authorized
- protected paths: concurrent Notebook work and untracked `test-results/`

## Authority Evidence

- Matrix and Vector retain native exact scalar, vector, matrix, rational, set, equation, and angle evidence until their independent workspace-owned final adapters.
- The adapters attach only branded, proven standard Compute Engine MathJSON; they do not parse formatted output, promote normalized input, or introduce a universal solver AST.
- DEG and RAD Vector angles attach proven trees. GRAD remains canonical-only because standard MathJSON has no accepted gradian-unit encoding with matching canonical printer output; an exponent-shaped `g` tree is explicitly rejected by test.
- Worker, host, capability, request, fallback, OOE, History, replay-seed, and solver-core ownership is unchanged.
- Coverage closes at 262 leaves: 231 proven, 31 bounded exemptions, and zero missing.
- Seven Matrix linear-system narration leaves are exempt because augmented-rank, augmented-RREF, and row-operation strings are not valid standalone trees; structured solution, rank, and count values remain proven.

## Performance Evidence

- Ten Matrix/Vector replay documents measure 3,843 compatibility bytes and 5,116 current bytes.
- Three structured-clone reruns each use five cold and fifty warm passes.
- Current warm P95 is 0.040-0.042 ms per ten-document pass; no accepted median or P95 threshold blocks the gate.
- Per-document MathJSON and canonical-document bounds remain unchanged.

## Verification Evidence

- Full unit: 535 files, 3,718 tests.
- Full UI: 67 files, 485 tests.
- Browser: 19/19 workspace canaries, nine History replay journeys, and three Linear Algebra trust flows.
- Focused visual inspection: Matrix add, determinant, inverse, rank, and linear system; Vector dot, cross, norm, angle, and Gram-Schmidt. Exact output and detail counts are preserved with no card or page horizontal overflow.
- Contracts: MathJSON coverage, result, golden, print hygiene, History replay, runtime probes/contracts, printer, detail, clipboard, display inversion, Surface Protocol, seam selector, OOE, compartments, CI alignment, and app identity pass.
- Static/native: TypeScript, lint, production build, `cargo check`, file-size ratchet, memory protocol, and diff hygiene pass.
- The exhaustive 100-probe test timeout is 120 seconds after the previous 30-second limit timed out only under full-suite contention. Focused probe execution remains about 15 seconds; no correctness or performance acceptance threshold changed.

## Recovery Evidence

- Ignored benchmark and screenshot evidence is under `.task_tmp/canonical-mathjson-legacy-program/`.
- The next approved gate is `MATHJSON-COVERAGE-CLOSEOUT1`.

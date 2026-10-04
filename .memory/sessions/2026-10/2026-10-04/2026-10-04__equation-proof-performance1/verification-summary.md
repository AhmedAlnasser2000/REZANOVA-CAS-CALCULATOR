# Performance gate verification

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

## Part A backend gate: pass

- **Environment**: cloud container, Node v22.22.2 (the repository requires 24.x); tools invoked directly with `node`.
- **Tests**: `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2` passed 38 files / 585 tests (1 skipped: the opt-in medians) in 41 s wall (before this gate: 36 files / 511 tests in about 172 s).
- **Corpus**: every one of the 67 corpus cases decides with its expected kind and passes its verifier (always-on test).
- **Medians**: `EQUATION_BENCH=1` before (unchanged main, separate worktree) and after, `--maxWorkers=1`; tables in the spec.
- **Enclosure correctness**: fixed-point sin/cos at 1/3, −7/10 and 999/1000 contain mpmath 60-digit values at 64, 128 and 180 bits, with width at most 16·2^−bits.
- **Real issue found and fixed**: the first π and refinement caches were process-global, so work charged (and typed stops) could depend on earlier computations in other contexts. They are now per context; a test checks equal work in two fresh contexts.
- **Budget test**: the composition resource test completed inside its 20 000-unit budget after charging got cheaper (7 548 units, about 10 500 polls). Its budgets were lowered to 3 000 units and 4 000 polls, and it still stops with typed `work` and `cancelled`.
- **Other checks**: `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries, file sizes and the memory protocol passed. Every file is under 1000 lines.
- **Not run**: no full suite and no UI gate, because there is no product caller.

## Part B backend gate: pass

- **Tests**: `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2` passed 38 files / 588 tests (1 skipped) in 28 s wall.
- **Targets (spec tables)**:
  - no corpus case slower;
  - every baseline case under 1 s (slowest S4, 0.47 s);
  - the named slow cases at least 3× faster (degree-100 test 3.3×, the rest 12–177×).
- **First measurement missed two targets** (S4 1.04 s; degree-100 1.6×). They were profiled and fixed (Kronecker products over ℤ and ℚ, balanced product trees, integer signs at rationals, a factorization cache, tick-free `limbs`), as the plan requires instead of hiding a miss.
- **New tests**:
  - fixed-point disk zeros and signs at algebraic points;
  - Kronecker equals the naive product over ℤ and ℚ;
  - a reused factorization is rebuilt in the caller's ring and equals a fresh one;
  - a duplicated system point is rejected without re-derivation.
- **Tampering**: every existing verifier tampering test still rejects. Where re-derivation was dropped (finite polynomial and linear systems), the rejection comes from the count, substitution, distinctness or Bareiss checks.
- **Determinism**: shared tables (word primes) charge a fixed unit per use; every other cache is per store or context.
- **Other checks**: `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries, file sizes and the memory protocol passed.

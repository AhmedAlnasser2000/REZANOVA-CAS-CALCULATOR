# Parameters gate verification (part A)

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

## Backend gate: pass

- **Environment**: cloud container, Node v22.22.2 (the repository requires 24.x); tools invoked directly with `node`.
- **Tests**: `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2` passed 32 files / 461 tests (16 new) in about 160 s. The isolation test and the no-caps ratchet cover `parameters/`.
- **Reference digits** (Python mpmath): the real roots of x⁵ − 5x + 1.
- **Real bugs found and fixed**:
  1. The exact decision at the algebraic breakpoint of x⁵ + a·x + 1 took 45 s. Exact zero tests built minimal polynomials of degree about 75, and real refinement bisected with normalized rationals. Fixed with Liouville-bound certified disks and homogeneous integer bisection: 11.5 s → 0.34 s per zero set, 2.7 s per decision.
  2. Specialization re-raised a resource stop by constructing the error outside the context, which the no-caps ratchet rejected. It now re-raises the context's own stop.
- **Verifier independence**: tampering is rejected by sample tiling and specialization before re-derivation runs. The tampering cases are a moved breakpoint, a wrong root index, a missing case, swapped ends and a dropped branch.
- **Other checks**: `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries and file sizes passed. Every file is under 1000 lines.
- **Not run**: no full suite and no UI gate, because there is no product caller.

## Part B backend gate: pass

- **Tests**: `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2` passed 34 files / 486 tests in about 160 s. That is 25 new tests (16 kernel, 9 constants); the part-A refusal test was rewritten.
- **Reference digits** (Python mpmath polyroots, 30 digits): π·x³ + x − e (0.8421191) and x⁵ − π·x + 1 (−1.4012416, 0.3193674, 1.2358080).
- **Intended behavior changes**: three routing rows that named this gate are now decided (a·eˣ = 1, sin(a·x) = 1/2, √(x + a) = 1). They are replaced by still-refused variants.
- **Real bug found and fixed**: a single unconditional parametric interval union was sorted by digest at the top level. Parametric interval unions and periodic sets now keep their built order everywhere.
- **Verifier independence**: tampering is rejected by tiling, specialization or Sturm bound checks before re-derivation. The tampering cases are a widened range case, a negated period, shifted root bounds, a wrong index and a widened interval.
- **Other checks**: `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries and file sizes passed. Every file is under 1000 lines.

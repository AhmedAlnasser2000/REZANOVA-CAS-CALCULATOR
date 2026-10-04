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

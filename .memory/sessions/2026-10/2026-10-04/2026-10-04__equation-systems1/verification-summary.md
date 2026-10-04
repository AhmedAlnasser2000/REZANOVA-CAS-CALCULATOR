# Systems gate verification (part A)

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
- **Tests**: `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2` passed 35 files / 496 tests (10 new) in about 170 s. The isolation test and the no-caps ratchet cover `systems/`.
- **Real bug found and fixed**: `constantSign` (parameters gate) misread a constant polynomial over an empty variable list, which turned an always-true exclusion into a fake case split.
- **Verifier independence**: tampering is rejected before re-derivation by:
  - exact substitution (a wrong point);
  - identity in the free targets (a non-identical direction);
  - the independent Bareiss nullity (a lost free direction);
  - sample tiling (a dropped parameter case).
- **Other checks**: `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries and file sizes passed. Every file is under 1000 lines.
- **Not run**: no full suite and no UI gate, because there is no product caller.

## Part B backend gate: pass

- **Tests**: `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2` passed 36 files / 511 tests (15 new) in about 172 s.
- **Reference digits**: x³ − x − 1 (mpmath), and Katsura-3 from SymPy `solve` and mpmath `findroot`. Both are independent of this code.
- **Real bugs found and fixed**:
  1. Family components were compared by object identity, which refused sin x = y, 2y = 1. They are now compared by value.
  2. My first Katsura-3 reference digits, written from memory, were wrong. They were replaced by SymPy/mpmath values; the engine's answer was right.
- **Verifier independence**:
  - a missing point is caught by the Hermite count;
  - a swapped coordinate, by exact substitution;
  - a false empty claim, by the count or re-derivation;
  - a dropped branch, by sampling the free target against independent decisions.
- **Other checks**: `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries and file sizes passed. Every file is under 1000 lines.

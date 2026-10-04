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

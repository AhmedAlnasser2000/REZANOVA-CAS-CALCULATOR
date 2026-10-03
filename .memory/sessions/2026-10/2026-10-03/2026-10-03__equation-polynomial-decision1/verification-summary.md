# Polynomial decision gate verification

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

- Environment: cloud container, Node v22.22.2 (the repository requires 24.x). Tools were invoked directly with `node`.
- `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2`: 18 files / 163 tests passed (about 14 s). The isolation test and the no-caps ratchet cover the new folder.
- Reference decimals came from Python mpmath at 30 digits (P4, P9, the complex roots of x^5 - x - 1 and x^5 - 1, 2^(1/5), 9^(1/9), (9/2)^(1/4), 2^(1/9)).
- Real bug found by the verifier: constant terms written as c*x^0 silently added the condition x != 0; fixed in `polynomialExpression`.
- Test expectations corrected without production changes: R3 is already in zero form (no move-to-zero step); x^3 = cbrt(2) gives 2^(1/9); a tampered measure is rejected structurally ("did not decrease"); non-real points follow canonical identity order, so the complex assertions compare members.
- Production change found by the tests: `decidePolynomialProblem` now returns normalized (canonically ordered) sets.
- `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries and file sizes passed.
- No full suite and no UI gate: there is no product caller.

## Documentation checks

- See commit-log.md.

# Algebraic-numbers gate verification

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

- Environment: cloud container, Node v22.22.2 (the repository requires 24.x). Tools were invoked directly with `node`, because npm scripts refuse to run under Node 22.
- `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2`: 12 files / 71 tests passed in about 7 s.
- `tsc -b`: passed after two fixes (an unused test parameter, and a generic domain comparison cast).
- Scoped ESLint passed.
- Compartment boundaries: 36 tests plus validation (1,644 files). OOE boundaries: 8 tests plus validation.
- Independent references were computed with Python mpmath for the x⁵−x−1 real root (50 digits), its complex roots, and √2+√3. Twice, my hand-written expected digits were wrong and the code matched mpmath: the 50-digit root, and the 15-digit rounding of √2+√3. The tests now use the mpmath values. Earlier, an exact-root expectation for ±i was too strong (approximations need not land exactly on i); that test now checks 20 exact digits. No production logic was changed to fit a test.
- Performance probes (`.task_tmp/equation-reconstruction-design1/profile*.test.ts`):
  - degree-60 complex isolation went from 22 s to 1.1 s;
  - the cause was global variable scaling in the double seeding, which underflowed low-order coefficients and lost the small roots (59 of 60 failed first certification);
  - the fix was Bini Newton-polygon starts with reversed-polynomial evaluation;
  - certifying all 60 roots exactly costs about 0.8 s.
- No full suite and no UI gate: there is no product caller.

## Documentation checks

- See commit-log.md.

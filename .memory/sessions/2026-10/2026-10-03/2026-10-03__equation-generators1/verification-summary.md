# Generators gate verification

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

- Environment: cloud container, Node v22.22.2 (the repository requires 24.x); tools invoked directly with `node`.
- `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2`: 21 files / 224 tests passed (61 new) in about 43 s. The isolation test and the no-caps ratchet cover the new folder.
- Reference digits from Python mpmath (e, pi, ln 2, e^{e^e}, W0(1), W-1 and W0 at -1/(2e), e^{cbrt 4}, ln(3/(e+1)), sqrt(e-1)).
- Real bugs found and fixed: (1) gap samples with 2^32 denominators made exact algebraic roots of degree 2^32 and exhausted memory before the work budget could stop them; samples are now the simplest rational in each gap and large root indices are enclosed through exp/log; iroot returns 1 directly when k >= bit length. (2) The Lambert form check evaluated 0^0. (3) The log-linear parser and the log-sum extractor did not distribute numeric factors over sums.
- Test expectations corrected without production changes: canonical log(36/49) = -2 ln(7/6); the coprime base of {6, 4, 9, 35} is {2, 3, 35} (no factoring); a reference tolerance tighter than the reference's printed digits.
- Intended behavior change in an existing test: closed-form points are now ordered numerically (ln 2 before 2).
- `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries and file sizes passed.
- No full suite and no UI gate: there is no product caller.

## Documentation checks

- See commit-log.md.

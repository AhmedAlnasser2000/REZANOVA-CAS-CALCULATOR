# Constraints gate verification

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
- `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2`: 23 files / 275 tests passed (52 new) in about 45 s. The isolation test and the no-caps ratchet cover the new folder.
- Reference digits from Python mpmath: S4 root 1.838601166658565639682409230952010602680 (30 digits checked), S1 (5+sqrt 13)/2, (9-sqrt 17)/2; the depth-10 nested abs zero set by exact brute force over integers (piecewise linear with integer breakpoints and slopes +-1).
- Real bugs found and fixed: (1) the double-precision Aberth seeding (gate 3) computed 2^(52-e), which is infinite for approximations below about 2^-971, and crashed with a RangeError on M1; it now divides by the exact power of two and falls back to the standard starts for non-finite seeds. (2) An identity at the top goal (0·sqrt x, kept by the store for its domain) was refused; it is now "zero wherever defined".
- Intended behavior changes in existing tests: two slice-2 verifier tests now fail earlier with stronger messages (independent exact evidence runs before re-derivation; x = ln 5 in E1 has residual exactly 6); two slice-2 routing rows (e^|x| = 2, e^sqrt x = 2) are now solved and moved to this gate's tests, replaced by sqrt x + e^x = 3.
- `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries and file sizes passed.
- No full suite and no UI gate: there is no product caller.

## Documentation checks

- See commit-log.md.

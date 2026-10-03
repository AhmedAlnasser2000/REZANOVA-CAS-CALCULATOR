# Representation gate verification

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
- `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2`: 16 files / 111 tests passed (40 new representation tests). The isolation test and the no-caps ratchet cover the new folder.
- One test expectation was wrong and was corrected: `Root(x, 1)` is `x`, not invalid input. No production logic was changed to fit a test.
- `tsc -b` passed after test-only typing fixes (casts in tests, explicit search state type). Scoped ESLint passed.
- Compartment boundaries, OOE boundaries and file-size validators passed (test suites plus validation).
- SHA-256 is checked against FIPS 180-4 vectors.
- No full suite and no UI gate: there is no product caller.

## Documentation checks

- See commit-log.md.

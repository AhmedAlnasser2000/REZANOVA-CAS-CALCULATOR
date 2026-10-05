# Result-contract gate verification

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

## Part A gate: pass

- **Environment**: cloud container, Node v22.22.2. npm refuses it (`EBADDEVENGINES`, the repository requires 24.x), so every gate script was run as its underlying `node` commands.
- **Result contract**: `node tools/result-contract-runner.mjs` passed 21 files / 176 tests, including the 19 new V6 tests.
- **Enforcement**: `node --test tools/canonical-result-v2-enforcement.test.mjs`, `node tools/canonical-result-v2-enforcement.mjs`, the V2 contract and MathJSON coverage vitest files, the display-contract inversion test and ratchet, the codex agent-workflow test and validator, and the memory protocol all passed.
- **Other checks**: `tsc -b`, ESLint on the result contract and calculator types, OOE boundaries, compartment boundaries and file sizes all passed.
- **Updated by design**:
  - the V2 contract test's unsupported-version probe used version 6, which is now active, so it uses 7;
  - the coverage registry test enumerates leaf paths from a V6 document too.
- **Reverted**: adding V6 to the runtime outcome union broke History display typing. Transport belongs to adoption, so the union stays unchanged.

## Part B gate: pass

- **Tests**: `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation src/lib/result-contract --maxWorkers=2` passed 60 files / 845 tests (1 skipped: the opt-in medians) in about 3 min wall. This includes `equation/result.test.ts` (81 tests) and the core isolation test with the two registered adapters.
- **Corpus**: all 67 cases project, validate, replay and read back in a fresh store.
- **Set kinds**: 10 of 12 come from real decisions; reduced-form and unconfirmed are read from hand-built documents, since no slice produces them yet.
- **Tampering**: a moved isolation interval, swapped case sets, a family without its period term and a forged `outcomeKind` are all rejected.
- **Bounds and stops**: an answer over the shared bounds is reported as `stopped: result-size`; cancellation is reported as `stopped: cancelled`.
- **Real bug found and fixed**: `decideEquation` threw a typed stop raised while routing instead of returning the `resource` outcome.
- **Other checks**: `tsc -b`, ESLint (Equation, result contract, types), OOE, compartment, file sizes, memory protocol, codex agent-workflow, the V2 enforcement checker and the display-contract inversion ratchet all passed.

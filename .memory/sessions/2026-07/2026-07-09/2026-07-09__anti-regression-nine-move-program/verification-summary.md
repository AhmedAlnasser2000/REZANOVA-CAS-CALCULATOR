# Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live
- commit_hash: this milestone commit

## Scope
- Backend governance gate for `ATTRIBUTION-FAMILY-GOVERNANCE1`.

## Commands
- `node --test tools/validate-memory-protocol.test.mjs` - passed 21 tests.
- `npm run test:memory-protocol` - passed.
- `npm run test:file-sizes` - passed 8 tests and validated 1,580 files.
- `git diff --check` - passed after removing trailing whitespace from three migrated attribution lines in one reference handoff.
- Exact attribution audit - `gpt-5` and `gpt-5-codex` eligible values are zero.
- Protected attribution audit - 591 `gpt-5.4` and 116 `gpt-5.3-codex` occurrences retain their pre-edit content digests.
- Migration-only audit - 2,110 non-governance tracked files match `HEAD` plus only the approved exact-field substitution.

## Manual Checks
- Confirmed the migration targets only recognized exact attribution model fields.
- Confirmed historical family values were not backfilled.

## Outcome
- Passed as a `backend` governance gate.

## Outstanding Gaps
- The governance gate did not change product runtime or UI.

## WORKSPACE-CANARY-SUITE1
- Kind: `ui` with supporting `backend` gates.
- Focused tests: 77 passed across carrier follow-on, public Equation routes, inverse trig, Trigonometry, and Geometry; the dedicated linear readback test also passed after extraction for file-size compliance.
- `npm run test:canary-registry`: 3 passed.
- Full Chromium canaries: 19/19 passed in 74.90 seconds.
- Visual inspection: full-page evidence covered all nine workspaces with readable answer surfaces, no error cards, and no observed overlap or clipping.
- `npx tsc -b --pretty false`, `npm run build`, and `npm run lint`: passed.
- `npm run test:file-sizes`: 8 passed; 1,582 files validated within caps.
- Broad `npm run test:unit`: 3,423 passed and 2 Complex-abs tests failed. Both failures reproduced unchanged in a detached clean-`98c2641f` worktree, so they are pre-existing and outside this milestone.
- `git diff --check`: passed before durable closeout.

## Outstanding Gaps After Move 1
- CI integration belongs to `CI-GATE-ALIGNMENT1`; this milestone adds scripts but does not yet replace workflow lanes.
- Statistics guided-control defects remain out of scope; direct structured requests are the stable canary path.

## WORKSPACE-RUNTIME-PROBE-REGISTRY1
- Kind: `backend`.
- `npm run test:runtime-probes`: 19 passed across the exhaustive registry and direct Statistics/Table workers.
- Surrounding runtime/OOE suite: 74 passed across 12 files.
- `npm run test:ooe-boundaries`: 7 passed; 26 TypeScript and 6 Rust OOE files validated.
- `npm run test:compartments-boundaries`: 36 passed; 1,058 source files validated.
- `npx tsc -b --pretty false`, `npm run build`, and `npm run lint`: passed; build completed 2,804 modules with existing non-fatal chunk/dynamic-import warnings.
- `npm run test:file-sizes`: 8 passed; 1,586 files validated within caps.
- Restored Chrome path: the three Calculate canaries passed in 11.5 seconds with output redirected under `.task_tmp/`.
- `git diff --check`: passed before durable closeout.

## Outstanding Gaps After Move 2
- CI still does not run the new canary and runtime-probe lanes at the required pull-request, `main`, and Linux-release boundaries; this belongs to `CI-GATE-ALIGNMENT1`.
- Browser registry probes exercise the public OOE facades in Node fallback mode; direct worker lifecycle coverage exists for every host family, including the newly explicit Statistics and Table cases.

## CI-GATE-ALIGNMENT1
- Kind: `backend` workflow gate with `ui` browser evidence.
- `npm run test:ci-gate-alignment`: 7 passed; both workflows also parsed successfully through the installed YAML parser.
- Named static gates: app identity 2 passed; Surface Protocol 5 boundary and 39 runtime tests passed; OOE 7 passed; compartments 36 passed; file sizes 8 passed; canary registry 3 passed; runtime probes 19 passed.
- Chrome workspace canaries: 19/19 passed in 1.2 minutes under the exact workflow command.
- Preserved focused browser smoke: 11/11 passed in 52.8 seconds after currentizing Calculus routes and editor ownership.
- Carrier regression coverage: 61/61 focused Equation tests passed; the one-case real-app Chrome check passed and its full-page screenshot was inspected for answer/error state, badges, facts/details, readability, overflow, and double-minus serialization.
- `npx tsc -b --pretty false`, `npm run build`, `npm run lint`, and Cargo check passed; build completed 2,804 modules with existing non-fatal warnings.
- Broad `npm run test:unit`: 3,442 passed and two pre-existing Complex-abs tests failed exactly as isolated before this milestone.

## Outstanding Gaps After Move 3
- The static CI job remains red until the separately existing Complex-abs empty-set regression is fixed; independent browser canaries still run on every pull request and `main` push.
- The nested radical visual check restored success and clean serialization but exposed an older candidate-validation gap: two valid positive roots remain misclassified as extraneous. This is deferred to focused Equation correctness work, not widened inside CI alignment.

## SEAM-IMPACT-SELECTOR1
- Kind: `backend` tooling and workflow gate; no app-visible output changed.
- `npm run test:seam-impact-selector`: 8/8 passed, covering seam/lane classification, rename/copy/delete records, empty diffs, invalid input, GitHub event ranges, safe Git invocation, and allowlisted execution.
- `npm run test:ci-gate-alignment`: 8/8 passed; the validator reports 10 static gates plus workspace canaries and requires full history plus seam execution before broad units.
- All four allowlisted contract groups passed 445 tests: workspace runtime 74, app runtime/logic 188, Display 133, and app-state/schema 50. A real `--run` OOE selection also passed the 74-test workspace runtime group.
- Both edited workflows parsed through the installed YAML parser.
- `npx tsc -b --pretty false`, `npm run build`, `npm run lint`, `npm run test:file-sizes`, `npm run test:ooe-boundaries`, and `npm run test:compartments-boundaries` passed.
- Matrix-only and Vector-only paths select their own lanes; current shared Linear Algebra core/runtime paths select both.

## Outstanding Gaps After Move 4
- Mandatory Incident Review remains required before any Behavioral Ratchet begins.
- The two inherited Complex-abs failures and nested-radical positive-root classification gap remain separately recorded for the review; Move 4 does not alter mathematical output.

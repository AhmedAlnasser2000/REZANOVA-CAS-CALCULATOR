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

## Mandatory Incident Review
- Kind: `ui` review with supporting `backend` gates.
- Current shared `main` Chrome canaries: 19/19 passed in 1.3 minutes with retries zero. Full-page screenshots from all nine workspaces were inspected for answer/error state, facts/details, clipping, overlap, and readability.
- Inverse trig: `arcsin(1)` visibly rendered `90` under DEG and `\pi/2` under RAD.
- Current canary registry 3/3, runtime probes 19/19, app identity 2/2, Surface Protocol boundaries 5/5, and Surface Protocol runtime tests 39/39 passed.
- Seam review: app-runtime impact required workspace canaries, runtime probes, OOE, compartments, and UI evidence plus only the allowlisted workspace/app runtime contract commands. The shared Linear Algebra runtime selected both Matrix and Vector lanes.
- Full UI, build/TypeScript, and the broad unit readback completed on the shared checkout. Before the supplemental fix, the broad suite had only the two inherited Complex-abs failures; after repair it passed 476/476 files and 3,450/3,450 tests.

## INCIDENT-CLOSURE-REVIEW-CI-FIX1
- The four user-reported CI files pass 71/71. Current `main` had already closed the radical-carrier and embedded-derivative failures.
- Root cause for the remaining pair: the Complex boundary matcher recognized raw `abs(...)` and bar notation, while the routed parameterized input was canonical `\operatorname{abs}(...)`.
- The fix adds only plain and `\left` canonical operator forms to the existing affine no-solution matcher. General Complex absolute-value/locus policy remains deferred.
- Focused real-app Chromium passed and the rendered `x\in\varnothing` answer, `x-5\ge0` and `x\in\mathbb{R}` facts, Complex boundary detail, and candidate-check text were inspected without layout defects.
- The final shared-checkout file-size rerun was blocked only by a concurrent uncommitted Linear Algebra lane (`editor-dispatch.ts` at 901 lines and `editor-parser.ts` at 937). This commit does not stage those files; its only production source is the 68-line Complex boundary module, below the default cap.

## Review Checkpoint
- Verification is complete and the user accepted the checkpoint on `2026-07-10`.
- The older nested-radical candidate-validation gap remains separate: two valid positive roots may still be classified as extraneous in that deep Equation case.

## LINEAR-ALGEBRA-SHELL-SPLIT0
- Kind: `backend` audit; no product runtime or UI changed.
- Direct profile: five warmups plus twenty measured runs for each Matrix determinant, Matrix 6 by 6 profile, Vector unit, and Vector six-vector span fixture.
- Chromium lifecycle profile: five fresh-context cold and twenty same-context warm real worker runs per fixture. All 100 runs returned successful isolated worker evidence and stable commit legality.
- Browser P95 range was 88.0-92.0 ms cold and 89.4-90.3 ms warm; no Matrix/Vector timing divergence approached 2x.
- Maximum request bytes were 216 Matrix versus 189 Vector; maximum result bytes were 2,064 versus 1,581.
- Production shared worker was 1,240,488 raw / 334,342 gzip bytes. Matrix-only was 1,223,981 / 329,865; Vector-only was 1,169,115 / 317,628.
- Focused worker, pilot, runtime-shell, and registry tests passed 21/21, covering parity, pre-start fallback, post-start failure, hard-stop cancellation, diagnostics, launch tickets, commit legality, and stale drops.
- `npm run build` passed with the existing non-fatal chunk/dynamic-import warnings.
- `npm run test:memory-protocol` passed 21 validator tests and repository validation.
- `npm run test:file-sizes` passed 8 tests and validated 1,600 files within caps.
- `npm run test:ooe-boundaries` passed 7 tests; `npm run test:compartments-boundaries` passed 36 tests.
- `git diff --check` passed.
- Outcome: the approved 10% asset, 2x runtime/serialization, and concrete current-policy-divergence criteria all failed. The user subsequently authorized the split through a separate prospective product-containment decision; the audit is not reclassified as passed.

## MATRIX-VECTOR-RUNTIME-SHELL-SPLIT1
- Kind: `backend` topology change with `ui` behavior-parity evidence.
- `npx tsc -b --pretty false`: passed.
- Focused runtime set: 21/21 passed; complete workspace runtime contracts: 74/74 passed; runtime probes: 19/19 passed.
- `cargo test --manifest-path src-tauri/Cargo.toml ooe`: 43/43 passed.
- `npm run test:seam-impact-selector`: 8/8 passed after using the shared lifecycle helper, rather than the correctly seam-triggering OOE pilot, as the shared lane-only fixture.
- `npm run test:ooe-boundaries`: 7/7 passed; `npm run test:compartments-boundaries`: 36/36 passed.
- `npm run test:file-sizes`: 8/8 passed; 1,604 files remained within caps.
- `npm run build` and `npm run lint`: passed. Build emitted `matrix.worker` at 1,224.31 kB and `vector.worker` at 1,169.44 kB; no `linear-algebra.worker` asset remained.
- Focused Matrix/Vector Chromium canaries passed 4/4; the full workspace suite passed 19/19 in 1.2 minutes.
- Full-page Matrix `profile(...)` and Vector `independent(...)` evidence was inspected after final `Ready` status. Answers, rank-nullity/span facts, kernel/image/basis evidence, collapsed RREF sections, editor surfaces, and controls were readable without clipping or overlap.
- Outcome: independent Matrix/Vector topology is complete with unchanged visible mathematical behavior.

## FEATURE-PROBE-REGISTRY1
- Kind: `backend` anti-regression registry with supporting component and persistence tests; no app-visible behavior changed.
- `npm run test:feature-probes`: passed 124 native tests across 9 files and 37 UI/persistence tests across 6 files.
- Registry parity is exactly 24/24 live `Settings` keys and all four policy classes are represented. Every policy resolves to at least one named test in the committed source catalog.
- Required evidence pins DEG/RAD/GRAD inverse trig special values and domain stops, exact/decimal/both Equation output, Equation answer/domain/complex form, notation/precision/scientific interactions, UI/math/result scale and high contrast, language, History-disabled privacy, and calculator-memory restore/autosave policy.
- The first focused run correctly failed one inaccurate registered test label; the catalog was corrected to the exact live case name and the full gate then passed.
- Focused ModeStrip UI rerun passed 1/1 after adding quick-setting patch assertions. `npx tsc -b --pretty false`, `npm run test:file-sizes`, and `git diff --check` passed before durable closeout.

## GOLDEN-CORPUS-REGISTRY1
- Kind: `backend` native golden registry with required `ui` Playwright inspection; no production runtime behavior changed.
- `npm run test:golden`: passed 44/44, comprising one registry ratchet and 43 golden executions. The ratchet enforces unique IDs, exact initial total 43, and at least two cases for every launcher-derived computational workspace excluding Labs.
- Direct adapters cover Calculate, Equation, async Calculus, Trigonometry, Geometry, Statistics, Matrix, Vector, and Table. Table retains row-level response evidence alongside the common `DisplayOutcome`.
- The temporary Chromium audit under ignored `.task_tmp/golden-corpus-registry1/` passed all 16 additions in 55.7 seconds after correcting audit-only route/action selectors and removing a redundant Lower-field fill. All 16 screenshots were inspected for answer/error cards, facts/details, warnings/actions, clipping, overlap, and readability; no production defect remained.
- The Trigonometry periodic equation is native-core evidence in the corpus and was visually inspected through the current Equation-owned browser surface because Trigonometry no longer exposes an equation launcher leaf.
- The unchanged workspace canaries passed 19/19 in 1.2 minutes. `npx tsc -b --pretty false`, `npm run build`, `npm run lint`, `npm run test:ooe-boundaries`, `npm run test:compartments-boundaries`, `npm run test:file-sizes`, `npm run test:canary-registry`, and `git diff --check` passed before durable closeout.

## PRINT-HYGIENE-BASELINE1
- Kind: `backend` pure collector/baseline gate with required `ui` Playwright inspection; no runtime rendering or clipboard behavior changed.
- `npm run test:print-hygiene`: 7/7 passed, including complete field coverage, prose exclusion, bounded marker checks, legitimate Table `undefined`, parenthesis preservation, 43-case manifest equality, two-success-per-workspace floors, and updater policy.
- `npm run test:display-contracts`: 121/121 library and 21/21 UI tests passed.
- `npm run update:print-hygiene -- --accept --reason "Initial curated 43-case anti-regression print baseline"` generated the committed manifest, and the immediate focused rerun matched it exactly.
- Full Chromium canaries passed 19/19 in 1.2 minutes. Nine refreshed curated cases passed in 32.3 seconds and were inspected across Calculate, Equation, Calculus, Trigonometry, Geometry, Statistics, Matrix, Vector, and Table with no clipping, overlap, unreadable math, or unresolved errors.
- `npm run build`, `npm run lint`, OOE/compartment boundaries, file sizes, canary registry, golden 44/44, and diff hygiene passed before durable closeout.

## WORKSPACE-FRESHNESS-REPORT1
- Kind: `backend` deterministic operational report and workflow gate with `ui` weekly canary execution; no application behavior changed.
- `npm run test:workspace-freshness`: 5/5 passed. Synthetic evidence covers shared/all-workspace and Linear Algebra aliases, exact 14-day freshness, 15-day staleness, future evidence exclusion, missing warning data, stable ordering, invalid dates/flags, unreadable repository state, and workflow requirements.
- Live human and JSON reports for `--as-of 2026-07-11` were stable and showed all nine workspaces fresh. Stale/missing report states remain exit zero by construction and tests.
- `npm run test:ci-gate-alignment`: 8/8 passed. The weekly workflow parsed through installed `js-yaml`, schedules Monday at `03:17 UTC`, supports manual dispatch, builds, runs all 19 canaries, publishes human/JSON artifacts and the job summary, and contains no Git write command.
- Local workflow-equivalent Chromium canaries passed 19/19 in 1.2 minutes.
- `npm run build`, `npm run lint`, file sizes, OOE/compartment boundaries, canary registry, and diff hygiene passed before durable closeout.

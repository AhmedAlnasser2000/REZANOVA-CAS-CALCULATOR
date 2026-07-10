# Calcwiz Anti-Regression Nine-Move Roadmap

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Program Contract
- This roadmap closes the dormant-workspace regression incident before adding behavioral ratchets.
- `ATTRIBUTION-FAMILY-GOVERNANCE1` is a prerequisite and is not counted among the nine moves.
- Each named milestone is one verified commit. Internal gates are not automatic commit boundaries.
- Explicit user approval is required before every commit and push.
- The user granted standing commit approval for remaining Moves 6-9 on `2026-07-11`; pushes remain separately unapproved.
- The four Incident Closure moves must pass a mandatory user review before any Behavioral Ratchet starts.
- The user accepted the mandatory Incident Review on `2026-07-10`.
- Statistics guided-control defects are out of scope. Stable direct structured Statistics requests are used for program evidence.
- The later Printer Core, detail-segment, and canonical clipboard arcs begin only after the nine-move closeout.
- Matrix/Vector capability expansion is frozen through Move 9.

## Prerequisite - ATTRIBUTION-FAMILY-GOVERNANCE1
- Correct exact attribution-field values `gpt-5` and `gpt-5-codex` to `gpt-5.5`.
- Preserve `gpt-5.4`, `gpt-5.3-codex`, and lower/versioned historical values byte-for-byte.
- Add prospective `sol`, `terra`, and `luna` family provenance with role-specific fields from `2026-07-09`.
- Record current work as `codex`, model `gpt-5.6`, family `sol`.
- Persist this roadmap, current-state posture, approval, decision, journal, and master dossier.

## Incident Closure

### 1. WORKSPACE-CANARY-SUITE1
- Derive the nine computational workspaces from launcher leaves, excluding Labs.
- Register at least two stable Playwright cases per workspace; initial floor is 19.
- Pin Calculate `arcsin(1)` as DEG `90` and RAD `\pi/2`, plus arithmetic precedence.
- Cover quadratic and linear Equation, derivative and integral Calculus, Trigonometry exact value/conversion, Geometry circle/distance, structured Statistics descriptive/frequency, Matrix determinant/eigen, Vector unit/cross, and two Table ranges.
- Repair bounded exact `asin`, `acos`, and `atan` boundaries across DEG/RAD/GRAD plus honest real-domain stops.
- Use fresh persisted state per case, explicit settings, stable raw-LaTeX assertions, and no screenshot assertions.
- Add `test:canary-registry` and `test:canaries`; keep the browser suite below three minutes.

### 2. WORKSPACE-RUNTIME-PROBE-REGISTRY1
- Add one native executable probe per computational workspace.
- Preserve every workspace's host descriptor, capability ID, request shape, result handler, fallback, diagnostics, replay seed, stale/cancel semantics, commit legality, and history tickets.
- Do not force all probes through `launchWorkspaceRuntimeJob`; use each workspace's existing native runtime/OOE entry point.
- Add missing direct Statistics and Table worker coverage and a nine-workspace probe floor.

### 3. CI-GATE-ALIGNMENT1
- Keep CI steps explicit and add app identity, Surface Protocol, OOE, compartment, file-size, canary, and runtime-probe gates.
- Replace the single browser smoke lane with the canary suite.
- Run canaries on pull requests, `main`, and tag/manual Linux releases before Tauri packaging.
- Install Chromium in release CI and never mask flaky failures with retries.

### 4. SEAM-IMPACT-SELECTOR1
- Implement a declarative selector under `tools/` with stable JSON and human output.
- Accept base/head revisions or explicit path lists and run only allowlisted commands.
- Cover AppMain, app runtime/logic, workspace instances, OOE, kernel, engine, Display, app-state schemas, and shared configuration seams.
- Seam protection is additive and never skips the repository's baseline CI gates.
- Test seam matches, lane-only changes, rename/delete cases, empty input, invalid input, and correct pull-request/push revision selection.

## Mandatory Incident Review
- Run the complete focused gate family and Playwright inspection across all nine workspaces.
- Review CI behavior, selector classification, inverse-trig readback, answer/error cards, facts, assumptions, details, overflow, and readability.
- Update the manual checklist, current state, journal, decisions, and dossier.
- Pause for explicit user acceptance before Behavioral Ratchets.

Status: accepted by the user on `2026-07-10`.

## Pre-Move-5 Linear Algebra Transition

### `LINEAR-ALGEBRA-SHELL-SPLIT0`
- Measure the shared worker with deterministic cold/warm browser runs, direct compute profiles, serialized request/result sizes, production assets, fallback, cancellation, diagnostics, stale/commit legality, and History tickets.
- Require a 10% asset reduction, 2x runtime/serialization divergence, or a concrete current runtime-policy difference before changing host topology.

Status: verified on `2026-07-10`; no split criterion was met. Matrix-only reduced loaded gzip bytes by 1.34%, Vector-only by 5.00%, and browser/runtime/serialization profiles remained below the 2x threshold.

### `MATRIX-VECTOR-RUNTIME-SHELL-SPLIT1`
- Conditionally split into independent Matrix and Vector workers only when the audit gate passes.

Status: implemented and verified on `2026-07-10` under the explicit user product-containment decision. Matrix and Vector now have independent primary/fallback hosts, worker entrypoints, clients, runtime-shell evidence, probes, and seam lanes while preserving capabilities, requests, replay seeds, History, stale/cancel rules, commit legality, and shared math cores. Move 5 is next.

## Behavioral Ratchets

### 5. FEATURE-PROBE-REGISTRY1
- Define exhaustive `Record<keyof Settings, ProbePolicy>` coverage for all 24 live settings.
- Separate semantic runtime, formatting, shell/accessibility, and persistence/privacy probes.
- Require at least one executable probe per setting with no unclassified settings.
- Use native runtime/formatter probes and reserve Playwright for component-level wiring.
- Pin DEG/RAD/GRAD inverse trig and exact/decimal interactions.

Status: implemented and verified on `2026-07-10`. The exhaustive 24-key registry references 18 executable native, component, and persistence probes; the focused gate passed 124 native tests and 37 UI/persistence tests. `GOLDEN-CORPUS-REGISTRY1` is next.

### 6. GOLDEN-CORPUS-REGISTRY1
- Extend `src/lib/__golden__`; do not create a parallel corpus system.
- Add adapters and at least two cases for every computational workspace.
- Add two inverse-trig Calculate cases and raise the initial total floor from 27 to at least 43.
- Keep large Equation and Calculus benchmark ledgers separate from the fast curated corpus.
- Fail when a launcher computational workspace lacks golden coverage.

Status: committed as `ccb9e642` on `2026-07-11`. The existing 27 cases remain intact and exactly 16 rich-success cases extend the fast corpus to 43 across all nine launcher-derived computational workspaces. Direct native adapters return a shared `GoldenExecution`, with Table retaining structured response evidence. The focused gate passed 44/44, all 16 additions passed real Chromium inspection, and the unchanged 19-case canary suite passed.

### 7. PRINT-HYGIENE-BASELINE1
- Add a pure shared collector for mathematical `DisplayOutcome` fragments, including exact answers, rows, branches, systems, periodic output, supplements, transforms, and typed detail math.
- Hard-fail mathematical fragments containing `NaN`, `undefined`, internal-error markers, or `[object Object]`.
- Do not reject legitimate prose or Table text merely containing the word `undefined`.
- Establish per-workspace style floors without treating pedagogical parentheses as automatic failures.
- Commit curated whitespace-normalized printouts before later printer architecture work; accepts require durable rationale.

Status: implemented and verified on `2026-07-11`. A pure typed collector covers every explicit mathematical `DisplayOutcome` surface plus narrow Table row cells, while legitimate Table `undefined` remains allowed. All 43 golden executions are committed as a whitespace-normalized structured manifest with at least two successful cases per workspace. Baseline updates require `--accept` and a non-empty durable `--reason`; snapshot `-u` paths are rejected. `WORKSPACE-FRESHNESS-REPORT1` is next.

### 8. WORKSPACE-FRESHNESS-REPORT1
- Add `tools/workspace-freshness.mjs` with one central session-to-domain alias table.
- Report domains older than 14 days as operational warnings only, never correctness or release blockers.
- Add synthetic tests and a weekly workflow that runs real canaries, publishes a summary/artifact, and does not commit timestamp churn.

Status: committed as `85583ed2` on `2026-07-11`. The deterministic CLI requires `--as-of`, emits stable human or JSON output, and uses one alias registry over dated session slugs. Exactly 14 full days remains fresh; stale and missing are warnings with exit zero. Monday `03:17 UTC` automation builds, runs all 19 Chromium canaries, publishes both reports and the human job summary, and never commits generated output.

### 9. HISTORY-REPLAY-RATCHET1
- Gate A adds optional versioned `HistoryReplaySnapshotV1` data to new entries.
- Snapshot angle/output/equation/complex/notation/symbolic/root/digit/scientific/detail settings plus launch-time `Ans`; existing route seeds and variable snapshots remain authoritative owners.
- Parse legacy entries unchanged and classify missing snapshots as `legacy-nondeterministic`; never infer defaults or hard-compare them.
- Define sanitized versioned fixtures and an opt-in local importer that writes only ignored task storage.
- Gate B runs 100 deterministic fixtures: Calculate 20, Equation 25, Calculus 25, and five each for Matrix, Vector, Table, Trigonometry, Statistics, and Geometry.
- Hard-compare stable outcome identity and report normalized LaTeX differences without failing initially.
- Run replay weekly and on seam changes, not on every ordinary commit.

Status: implemented, verified, and included in the completed manual closeout on `2026-07-11`; standing commit approval applies. New entries freeze `HistoryReplaySnapshotV1` at ticket reservation and consume it at finalization, while snapshot-less entries remain loadable and classify internally as `legacy-nondeterministic`. Nine versioned JSON files contain exactly 100 sanitized fixtures at the approved distribution. Stable identity and cardinality comparisons hard-pass; normalized LaTeX is report-only. Human/JSON reports show 100 fixtures, zero hard failures, and zero current LaTeX differences. The opt-in importer writes only beneath ignored `.task_tmp/history-replay-import/`. Weekly automation and the additive seam selector run the ratchet, and nine real Chromium create/replay flows passed with inspected screenshots.

## Verification And Delivery
- Every milestone runs focused tests, TypeScript where applicable, file-size validation, memory validation, and `git diff --check`.
- App-visible mathematical behavior requires real Playwright inspection and recorded evidence.
- Preserve independent runtime hosts and capability identities throughout.
- Preserve the existing ahead-one commit and unrelated untracked `test-results/`.
- After Move 9, run a manual closeout before opening the Printer Core, detail-segment, and canonical clipboard roadmap.

Closeout status: complete on `2026-07-11`, pending user acceptance. Full unit passed 3,500 tests, full UI passed 441, all named anti-regression gates and runtime/boundary/file-size checks passed, build/lint/TypeScript passed, 19 rebuilt canaries passed in 1.2 minutes, and all nine History replay surfaces passed visual review. Printer/detail/clipboard planning remains paused until the user accepts the closeout.

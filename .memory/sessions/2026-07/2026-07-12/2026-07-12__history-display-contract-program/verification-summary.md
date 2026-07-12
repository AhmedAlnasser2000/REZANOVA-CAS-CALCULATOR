# RESULT-INTENT-DECLARATION-CLOSURE1 Verification Summary

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

## Gate

- Kind: `backend` result-intent contract with `ui` mathematical-output parity evidence.
- Runtime behavior changed: contract metadata and malformed sanitized replay input only.
- Intentional mathematical or visible wording change: no.
- Result: pass.

## Coverage

- Result-intent source/runtime ratchet: 8/8 direct object assignments paired; 43 golden plus 100 replay executions project without undeclared intent.
- Detail migration ratchet: 447/447 live producers declared; zero undeclared.
- Print hygiene: 43-case manifest accepted with three existing range-guard fragments and no malformed markers.
- Full unit suite: 1,063 files and 3,631 tests passed.
- Focused Equation, Matrix, worker, absolute-value, golden, replay, Display, feature-probe, runtime-contract, and runtime-probe suites passed.
- TypeScript, production build, file-size ratchet, OOE, compartment, Surface Protocol, seam selection, and `git diff --check` passed.
- Chromium workspace canaries: 19/19 passed.

## Visual Evidence

- `.task_tmp/result-intent-declaration-closure1/equation-range-summary.png`: Equation `sin(x)=2` range stop, typed solve-note math, no clipping or overlap.
- `.task_tmp/result-intent-declaration-closure1/matrix-rank-facts.png`: Matrix `Ax=b` rank facts and solve note, typed math, no clipping or overlap.
- Playwright focused inspection: 2/2 passed. Verification was headless so it did not open desktop windows while the user was using the computer.

## Mixed-Tree Limits

- Assistant-owned ESLint paths pass. Repo-wide lint currently reports only concurrent Notebook edits, which this program must not modify.
- The printer inventory sees concurrent Notebook serialization plus the isolated uncommitted `CANONICAL-RESULT-DOCUMENT1` projection file. This prerequisite adds no unclassified printer path; classification belongs to each owning lane before its commit.
- The unrelated Playwright test server and `test-results/` were left untouched.

## CANONICAL-RESULT-DOCUMENT1 Gate

- Kind: `backend` neutral result contract and compatibility projection.
- Live app-visible behavior changed: no; no producer writes `canonicalResult` in this milestone.
- Result: pass for the intended commit slice.

### Contract Evidence

- Focused result-contract suite: 3 files, 20 tests; all 43 golden and 100 replay executions round-trip with stable math, details, metadata, warnings, and exact Table response parity.
- Full unit suite: 1,063 suites and 3,633 tests passed with zero failures.
- Validation covers structured cloning, detachment, strict shapes, future versions, prohibited transient fields, invalid MathJSON, nested MathJSON node/byte bounds, whole-document node/depth/byte bounds, cycles, non-plain objects, symbols, accessors, sparse/custom arrays, and controlled-error rules.
- Production build, TypeScript, global ESLint, file sizes, Display contracts, result intent, print hygiene, golden corpus, History replay, Surface Protocol, OOE, compartments, and seam selector passed.
- Surface Protocol remains at eight production files and its DTO firewall rejects MathJSON/Display leakage; OOE remains 26 TypeScript and six Rust files.

### Printer Evidence

- The official accepted update command ran in `.task_tmp/canonical-result-document1-printer-snapshot-20260712-0515/`, a branchless snapshot of `HEAD` plus only this milestone's files and without the unrelated Notebook migration source.
- Intended commit report: 1,118 source files, 522 result paths, zero compatibility fallbacks, 277 migrated dual writes, 239 forwarders, and a passing baseline.
- Live mixed-tree report: this milestone's three projections are classified, the registry digest matches the accepted baseline, and only four concurrent Notebook-owned `resultLatex` paths remain unclassified. No Notebook file or registration is staged here.

### UI Boundary

- No Playwright run is required for this backend-only carrier milestone because no live producer, renderer, History row, or visible string consumes the new document. The 143 native executions prove exact projection parity; app-visible slices later in the roadmap retain mandatory Playwright review.

## HISTORY-STRUCTURED-RESULT2 Gate

- Kind: `backend` persistence/read-model contract with mandatory `ui` History and mathematical-output evidence.
- Intentional mathematical or visible formatting change: no.
- Result: pass for the intended History commit slice.

### Contract Evidence

- Result-contract and app-state focused suites: 76 and 58 tests passed; all 43 golden executions and 100 replay fixtures project and validate.
- Focused History/Table UI: 6 files and 55 tests passed. Full app runtime: 59 logic plus 141 runtime UI tests passed. Full UI: 64 files and 469 tests passed.
- Display contracts: 153 unit plus 25 UI tests passed. Golden, print hygiene, History replay, clipboard, detail, Surface, OOE, compartment, app identity, runtime probes, and workspace runtime contracts passed.
- TypeScript and production build passed. The assistant-owned ESLint slice passed. File-size ratchet passed with the large History runtime test held at 898 lines and `runtime-types.ts` lowered to 1,340 lines.
- Native persistence: `cargo check` and all 50 Rust library tests passed, including extension-rich structured History and Calculator Memory restart.

### Browser Evidence

- `e2e/history-replay-ratchet.spec.ts`: 9/9 workspaces passed. Every persisted row has `resultDocument.version = 1`, a separate replay snapshot, no serialized actions, visible title parity, and exact Table rendered-text parity.
- `e2e/history-persistence-parity.spec.ts`: 4/4 passed for extension-rich browser reload and Calculator Memory, non-blocking save failure, current roots/powers presentation, and legacy-only replay.
- Workspace canaries: 19/19 passed in Chromium, including inverse trig, all nine workspaces, Matrix/Vector independent runtime hosts, and both Table profiles.
- Verification used headless Chromium and did not open desktop windows while the user was using the computer.

### Mixed-Tree Limits

- Repo-wide lint reports seven Notebook-owned `no-useless-escape` errors in `src/lib/notebook/document/templates.ts`; no History/Display file is implicated.
- The live printer inventory reports five Notebook-owned unclassified `resultLatex` paths in `extensions.tsx`, `migrate-v1.ts`, `templates.ts`, and two `tiptap-adapter.ts` locations. This milestone's History paths remain classified with zero fallback debt.
- Concurrent Notebook files and untracked `test-results/` are excluded from staging and commit.

## DISPLAY-CONTRACT-INVERSION-RATCHET1 Gate

- Kind: `backend` source-authority inventory and CI ratchet.
- Live app-visible behavior changed: no.
- Result: pass for the intended tooling and governance slice.

### Inventory Evidence

- Eight focused Node tests pass for deterministic classification, native adapter calls, canonical projection exits, forwarding, parameter destructuring, dynamic/rest rejection, unknown lanes, line-only movement, debt growth, native loss, and golden reference fixtures.
- Live scan: 1,136 source files, 575 producer boundaries, 753 consumer reads, and zero unclassified paths.
- Producer split: one native History adapter, two canonical projection exits, 159 compatibility projections, 331 forwarders, and 82 control-only outcomes.
- Consumer split: 554 legacy reads, two canonical reads, 191 control reads, and six transient reads.
- Seam selector and CI alignment pass; CI and Linux release now require 14 static gates including this ratchet.

### Contract Evidence

- Result contract: 23 tests pass, including exact projection coverage for all 43 golden executions and all 100 deterministic replay fixtures.
- Display: 153 unit and 25 UI tests pass. Detail migration remains 447/447 declared; result intent remains 8/8 source assignments plus all golden/replay executions.
- History replay, golden corpus, TypeScript, production build, global ESLint, file sizes, Surface Protocol, OOE, compartments, and diff hygiene pass.
- No new Playwright run is required for this backend-only inventory: no producer, renderer, stored record, output string, or mathematical behavior changed.

### Mixed-Tree Limits

- The live printer inventory remains red only on five concurrent Notebook-owned `resultLatex` paths. Its seven unit tests pass and this milestone adds no printer fallback or unclassified serializer.
- Concurrent Notebook files and untracked `test-results/` remain excluded from staging and commit.

## EQUATION-SOLVE-RESULT-CONTRACT1 Gate

- Kind: `backend` internal solver-evidence contract.
- Live app-visible behavior changed: no; no live producer or consumer uses the carrier in this milestone.
- Result: pass for the intended Equation carrier slice.

### Contract Evidence

- Focused carrier suite: 2 files and 6 tests pass. Coverage includes solved evidence, compatibility controlled stops, prompt rejection, mirrored-evidence mismatch, malformed values, cycles, byte bounds, status parity, all six Equation golden executions, and all 25 Equation replay fixtures.
- Canonical result contract: 4 files and 23 tests pass, including all 43 golden executions and all 100 replay fixtures after extracting the shared structured-value inspector.
- Complete Equation verification: 142 files and 1,206 tests pass across private solvers, mode orchestration, worker/fallback runtime, exact and numeric routes, Complex boundaries, benchmarks, domains, branches, and readback.
- TypeScript, production build, global ESLint, focused ESLint, Display inversion, result intent, History replay, file sizes, Surface Protocol, OOE, compartments, seam selector, CI alignment, and `git diff --check` pass. CI and Linux release now require 15 static gates.

### UI Boundary

- No Playwright run is required for this backend-only gate because the carrier has no live producer, renderer, History consumer, or output string. Exact canonical-document equality across 31 native Equation executions proves this milestone's behavior-invisible boundary; live boundary migration retains mandatory Playwright evidence.

### External Limit

- The printer ratchet's seven tests pass. Its live inventory fails only on five Notebook-owned `resultLatex` paths in the already committed parallel Notebook program; this carrier adds no printer result path and does not register or modify those files.
- `test-results/` remains untracked and excluded. No push is authorized.

## EQUATION-OUTCOME-BOUNDARY1 Gate

- Kind: `backend` runtime-boundary migration with mandatory `ui` mathematical-output parity evidence.
- Intentional mathematical or visible wording change: no.
- Result: pass for the intended Equation worker/fallback boundary slice.

### Contract Evidence

- Focused carrier, boundary, worker, OOE, Complex, and parameterized suites: 7 files and 57 tests passed after receipt validation was added.
- Boundary tests cover canonical/runtime-policy separation, prompt/action rejection, cancellation projection, clone-safe validation, malformed carriers, invalid advisory extensions, forged cancellation completions, and no post-start fallback.
- Complete Equation verification: 143 files and 1,213 tests passed across private solvers, orchestration, worker/fallback, exact/numeric routes, Complex boundaries, benchmarks, domains, branches, and readback.
- Display inversion passes at 1,144 source files, 574 producer boundaries, 757 consumer reads, 159 compatibility projections, 554 legacy reads, and two native-document calls. Equation records one native boundary adapter, 120 compatibility producers, 245 forwarders, 16 controls, 265 legacy reads, and zero canonical reads.
- TypeScript, production build, global ESLint, file sizes, Surface Protocol, OOE, compartments, seam selector, and diff hygiene pass. Existing build chunk and dynamic-import notices remain non-fatal.

### Browser Evidence

- Headless Chromium: two Equation canaries, three equation-card credibility cases, and three QA cases passed, covering DEG/RAD/GRAD interval behavior, solved-condition supplements, and controlled same-base log domain errors.
- Inspected `.task_tmp/equation-card-credibility-polish1/screenshots/sin-quotient-domain-periodic.png`, `mixed-trig-periodic-structure.png`, and `exact-periodic-solve-note-collapsed.png` for answer cards, facts, branch/periodic details, collapse policy, and long-layout overflow; no clipping, overlap, or visible drift was found.

### External Limit

- The printer ratchet's seven tests pass. Its live inventory remains red only on five Notebook-owned `resultLatex` paths in the separately committed Notebook program; this milestone adds no printer result path and does not register unrelated debt.
- `test-results/` remains untracked and excluded. No push is authorized.

## RESULT-DOCUMENT-CALCULATE-EQUATION-CORE1 Gate

- Kind: `backend` native producer migration with mandatory `ui` mathematical-output parity evidence.
- Intentional mathematical or visible formatting change: no.
- Result: pass for the intended Calculate and proven Equation finite-root slice.

### Contract Evidence

- Result contract: 5 files and 25 tests pass; all 43 golden executions and all 100 deterministic replay fixtures preserve canonical and compatibility projections.
- Equation solve-result: 4 files and 12 tests pass; all six Equation golden executions and 25 replay fixtures keep carrier/document parity, including stale-native-document removal after enrichment.
- Full unit suite: 523 files and 3,659 tests pass. The first run had one contention-only 10.542-second numeric golden timeout; the isolated file passed with its slow case at 2.894 seconds, and a clean complete rerun passed.
- Full UI: 64 files and 469 tests pass. Display contracts, golden corpus, History replay, runtime probes/contracts, Equation, printer migration, inversion inventory, TypeScript, production build, global ESLint, file sizes, Surface Protocol, OOE, compartments, seam selection, CI alignment, and diff hygiene pass.
- Accepted inversion inventory: 1,148 source files, 585 producer boundaries, 773 consumer reads, 157 compatibility projections, 554 legacy reads, and seven native-document calls.
- Printer inventory: 533 result paths, zero compatibility fallbacks, 278 migrated dual writes, and 244 forwarders. Five Notebook document-content paths are narrowly classified without editing Notebook source.

### Browser Evidence

- Chromium workspace canaries: 19/19 passed in 1.2 minutes. A focused six-case Calculate/Equation/Calculus subset also passed.
- Three temporary headless Playwright inspections cover `arcsin(1)` as DEG `90` and RAD `pi/2`, factor output `(x-1)(x+1)`, Equation quadratic finite roots, and the Calculus COMP12B detail card.
- Inspected screenshots under `.task_tmp/history-display-contract/result-document-core-screenshots/` show answer cards, typed details, provenance, and overflow with no clipping or accepted output drift.
- Real Chromium caught an undefined `runtimeAdvisories.stopReason` own property at the strict Equation worker boundary and a canonical-roundtrip loss of uniform text intent. Both were repaired and covered before the final canary/UI runs.

### Boundary

- Worker hosts, capabilities, requests, cancellation, stale/commit legality, fallback semantics, History tickets, Surface DTOs, solver mathematics, and Notebook source remain unchanged.
- `test-results/` remains untracked and excluded. No push is authorized.

## RESULT-DOCUMENT-EQUATION-ADVANCED1 Gate

- Kind: `backend` native producer migration with mandatory `ui` mathematical-output parity evidence.
- Intentional mathematical or visible formatting change: no.
- Result: pass for the intended advanced Equation producer slice.

### Contract Evidence

- Full Equation: 145 files and 1,217 tests pass. Focused guarded, composition/system, parameterized/symbolic, numeric/Complex, guided/Trig, and solve-result suites pass.
- Result contract: 5 files and 25 tests pass; all 43 golden executions and all 100 replay fixtures retain canonical/compatibility parity. All six Equation golden and all 25 Equation replay executions are native.
- Result intent passes all eight source assignments and all 143 runtime executions. Detail migration reports 450 declared live lines and zero undeclared lines. Printer inventory reports 533 paths and zero compatibility fallbacks.
- Accepted inversion inventory: 1,149 source files, 586 producer boundaries, 768 consumer reads, 37 compatibility projections, 554 legacy reads, and 127 native calls. Equation records 124 native, zero compatibility, 251 forwarders, 17 controls, 265 legacy reads, and five canonical reads.
- TypeScript, production build, global ESLint, full UI, History replay, golden corpus, runtime probes/contracts, file sizes, CI alignment, seam selector, app identity, Surface Protocol, OOE, compartments, and diff hygiene pass. Existing build chunk/dynamic-import notices remain non-fatal.

### Browser Evidence

- Chromium workspace canaries: 19/19 passed in 1.2 minutes.
- Focused Equation Advanced evidence: 3/3 headless tests passed after correcting temporary harness assumptions. Seven full-page screenshots were inspected for answer/error cards, facts, typed details, periodic branches, controlled boundaries, runtime completion, and overflow.
- Covered routes: parameterized linear success, exponential Exact-mode controlled stop, bounded numeric interval, Complex quadratic, guided quartic, impossible trig range guard, and live legacy Trigonometry equation handoff. No clipping, overlap, malformed fragments, or output drift was found.

### Boundaries

- OOE cancellation remains control-only. Runtime advisories and executable actions remain transient. Equation's request, hosts, capability, worker/fallback policy, stale/cancel rules, commit legality, diagnostics, and History-ticket behavior are unchanged.
- Trigonometry drops Equation-owned canonical truth after its owner-specific presentation changes and remains compatibility-owned until `RESULT-DOCUMENT-GUIDED-DOMAINS1`.
- Notebook source, ignored `.task_tmp/` evidence, and untracked `test-results/` are excluded. No push is authorized.

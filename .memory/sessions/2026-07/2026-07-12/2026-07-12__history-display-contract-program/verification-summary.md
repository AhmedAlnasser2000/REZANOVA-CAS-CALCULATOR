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

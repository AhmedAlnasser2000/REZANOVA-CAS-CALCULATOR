# HISTORY-DISPLAY-CONTRACT-ROADMAP0

Date: 2026-07-11
Last updated: 2026-07-12
Status: active; advanced Equation native result documents are verified through Gate 10 and entering their approved commit; `RESULT-DOCUMENT-SYMBOLIC-LIMITS1` is next; no push is authorized

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

## Purpose

Close the current browser/Tauri History persistence drift, add one bounded producer-owned canonical result document shared by live Display and structured History, and invert Display from mathematical authority into presentation policy without changing mathematical output.

This is an expandable sequence of named gates, not a fixed commit count. A newly discovered prerequisite must be evidenced, added to this roadmap, and approved before implementation. Discoveries may increase correctness work but may not quietly widen product scope.

## Measured Baseline

- Git starts at `bb6fc4ba` on `main`, aligned with `origin/main`; untracked `test-results/` is excluded and no push is authorized.
- The printer inventory contains 519 result paths: zero compatibility fallbacks, 277 migrated paths, 239 forwarders, and one non-producer slot.
- All 445 live detail producers are declared, all 100 replay fixtures hard-compare normalized LaTeX, and nine of 43 golden executions currently carry proven `canonicalMath`.
- Production has 137 files referencing `DisplayOutcome`; Equation is the exceptional internal coupling with 31 core files and 33 mode/orchestration files.
- TypeScript `HistoryEntry` has 35 fields. The browser schema currently strips `systemReadback`, `equationScreen`, and `equationSeed`.
- The Rust History struct preserves only 27 fields, including two obsolete advanced-calculus names, and drops current typed details, system readback, Calculus/Equation/Trig seeds, Matrix/Vector seeds, runtime duration, and `replaySnapshot` across native restart.
- Existing nine-workspace browser History evidence proves same-session create/replay. It does not prove browser reload or packaged Tauri restart durability.
- The existing `DisplayBlock` model is presentation-only: it carries render kinds, test IDs, collapse policy, CSS classes, scheduler hints, and Formula Viewer state. It must not become the persisted canonical contract.

## Locked Contracts

- `CanonicalResultDocumentV1` is a neutral producer-owned document beneath Display blocks.
- It stores original card identity, primary math, answer rows, branch/system/periodic structures, supplements, typed details and summaries, warnings, approximations, stable semantic metadata, and bounded Table headers/rows.
- Each math value carries canonical LaTeX and optional proven MathJSON. Existing per-MathJSON bounds remain 2,000 nodes, depth 64, and 320,000 serialized bytes.
- The whole document is plain structured-clone-safe data capped at 10,000 nodes, depth 64, and 640,000 serialized UTF-8 bytes.
- Structured History remains success-only, shows the stored result without recomputation, restores the original card, renders with current preferences, and stores no executable actions.
- New History entries dual-write the canonical document and legacy fields. Old records remain loadable and are never reparsed into invented structure.
- Invalid or oversized structured data falls back to legacy fields with a durable `unavailable`, `invalid`, or `over-size` omission reason; mathematical content is never truncated.
- Exact Table headers and rows are stored when within the document bound. Table capability growth and row regeneration remain out of scope.
- New History appends are capped at 2,000,000 serialized bytes. A persistence failure keeps the row for the session and shows a non-blocking restart-durability warning.
- `HistoryReplaySnapshotV1` remains the separate launch-time settings and `Ans` contract.
- Live controlled errors may carry canonical mathematical content, but History continues to persist successful outcomes only. Prompts remain control outcomes.
- OOE, Surface Protocol DTO shapes, solver mathematics, worker topology, and capability identities remain unchanged.
- Legacy `exactLatex`, detail, and readback fields become derived compatibility projections at inversion closeout; physical removal requires a later approved audit.
- No intentional mathematical formatting drift is accepted in this program.

## Sequence

1. `HISTORY-DISPLAY-CONTRACT-ROADMAP0`: record this roadmap, baseline, protected paths, approval, session dossier, and prior-program checklist.
2. `HISTORY-PERSISTENCE-PARITY-CLOSURE1`: align TypeScript, browser, Calculator Memory, and native History round trips through a minimally validated extension-preserving Rust envelope.
3. `RESULT-INTENT-DECLARATION-CLOSURE1`: approved inserted prerequisite. Require every live solve summary and detail line to declare math/text intent before a compatibility projection may create a canonical result document; correct the malformed numeric replay request discovered by the projection audit.
4. `CANONICAL-RESULT-DOCUMENT1`: add neutral versioned types, validation, a no-reparse compatibility projection, and optional `DisplayOutcome.canonicalResult`.
5. `HISTORY-STRUCTURED-RESULT2`: dual-write/read the full result document, preserve exact Table rows, and retain legacy fallback.
6. `DISPLAY-CONTRACT-INVERSION-RATCHET1`: inventory native/projected/forwarded/control producers and legacy consumers with nonincreasing lane floors.
7. `EQUATION-SOLVE-RESULT-CONTRACT1`: separate Equation solver evidence from the Display contract.
8. `EQUATION-OUTCOME-BOUNDARY1`: migrate Equation orchestration and worker/fallback boundaries to one final canonical-result adapter.
9. `RESULT-DOCUMENT-CALCULATE-EQUATION-CORE1`.
10. `RESULT-DOCUMENT-EQUATION-ADVANCED1`.
11. `RESULT-DOCUMENT-SYMBOLIC-LIMITS1`.
12. `RESULT-DOCUMENT-SYMBOLIC-INTEGRATION1`.
13. `RESULT-DOCUMENT-CALCULUS1`.
14. `RESULT-DOCUMENT-GUIDED-DOMAINS1`.
15. `RESULT-DOCUMENT-LINEAR-ALGEBRA1`.
16. `RESULT-DOCUMENT-PRODUCER-CLOSEOUT1`: reduce live compatibility projection to zero for successful producer results.
17. `DISPLAY-READ-MODEL-INVERSION1`: derive Display blocks, scheduling, and Formula Viewer content from canonical documents.
18. `CANONICAL-RESULT-CONSUMER-INVERSION1`: migrate Clipboard, `Ans`, editor transfer, workspace display state, History, print hygiene, and Surface mapping.
19. `DISPLAY-CONTRACT-INVERSION1`: make canonical documents authoritative while retaining derived legacy projections.
20. `HISTORY-DISPLAY-CONTRACT-CLOSEOUT0`: run the full gate, inspect restart behavior and all nine workspaces, and review accumulated evidence with the user.

## Progress

- `HISTORY-DISPLAY-CONTRACT-ROADMAP0`: committed as `6a4c0d0d`.
- `HISTORY-PERSISTENCE-PARITY-CLOSURE1`: committed as `1e6e894f`. Browser validation covers all 35 current fields and preserves unknown extensions; Rust validates only the stable envelope and 2,000,000-byte append cap while retaining the original JSON value.
- Restart evidence: an extension-rich row survives real Chromium reload, Calculator Memory, file-backed Rust restart, and two isolated real Tauri desktop launches. A forced browser storage failure leaves the row in session and renders the durability warning.
- `RESULT-INTENT-DECLARATION-CLOSURE1`: committed as `c2469318` after the first compatibility-projection audit found 13 undeclared fragments across the 43 golden and 100 replay executions. All live solve-summary object literals now pair text with typed parts, all 447 live detail producers declare intent, and runtime coverage projects all 143 executions without guessing math from prose.
- The prerequisite also corrects the obsolete `{min,max}` Equation replay interval to the current `{start,end,subdivisions}` request, adds source/runtime ratchets, and accepts three previously rendered range-guard fragments into the print-hygiene baseline without changing wording or mathematics.
- `CANONICAL-RESULT-DOCUMENT1`: committed as `a5b63e39`. The neutral compartment defines the version-1 document, nested math values, strict clone-safe validation, 10,000-node/64-depth/640,000-byte document bounds, existing per-MathJSON bounds, no-reparse compatibility projections, and optional live `DisplayOutcome.canonicalResult` carriage.
- Coverage round-trips every stable field in all 43 golden and 100 replay executions, rejects prompts and prohibited transient fields, drops actions/runtime advisories by contract, and preserves exact Table rows. No live producer writes the document yet, so this gate changes no visible output, History schema, Surface DTO, OOE authority, worker topology, or capability identity.
- The intended commit snapshot passes the accepted printer inventory at 522 result paths, zero compatibility fallbacks, 277 migrated paths, and 239 forwarders. The live mixed tree separately reports four Notebook-owned `resultLatex` paths; they remain outside this program's staging and must be classified by the Notebook lane.
- `HISTORY-STRUCTURED-RESULT2`: committed as `25e7af6b`. New successful rows dual-write `resultDocument` and all legacy fields; stored documents are read first by replay, quick History, full History, copy, search, and Table restoration, while legacy-only or malformed/future extension rows fall back without reparsing LaTeX.
- Exact Table headers/rows and warnings are stored and restored directly without running the Table engine. Transient commit context and executable actions are excluded. Invalid or oversized documents preserve the full legacy row and add `unavailable`, `invalid`, or `over-size`; malformed new structured appends are rejected while load remains extension-preserving.
- Browser evidence passes all nine workspaces with versioned result/replay payloads, visible title parity, exact Table row parity, current root/power presentation, legacy replay, reload, Calculator Memory, and save-failure warning coverage. Rust preserves the document verbatim across file-backed restart.
- At the History milestone checkpoint, the mixed tree reported five Notebook-owned unclassified printer paths and seven Notebook-only lint errors in `templates.ts`; the History milestone's exact lint slice, build, TypeScript, 469 UI tests, 19 canaries, 50 Rust tests, and all scoped contracts passed. Global lint is green at the later inversion-ratchet checkpoint; the five Notebook printer registrations remain separate.
- `DISPLAY-CONTRACT-INVERSION-RATCHET1`: committed as `8d0af6fc`. A TypeScript compiler inventory records 575 producer boundaries and 753 direct consumer reads across declared ownership lanes with line-movement-stable source fingerprints.
- The accepted pre-inversion producer surface is one native structured-History adapter call, two canonical-result-to-Display projection exits, 159 compatibility projections, 331 forwarders, and 82 control-only outcomes. All computational producer lanes remain at zero native documents, so later migrations cannot overclaim readiness.
- The accepted consumer surface is 554 legacy reads, two canonical reads, 191 control reads, and six transient reads. Dynamic and rest reads fail closed; every `DisplayOutcome` field must remain explicitly classified. Curated golden expected outcomes are reference fixtures rather than live producers, while the golden execution adapter remains measured evidence.
- Compatibility and legacy-read debt cannot rise by lane, native-document coverage cannot fall, and any fingerprint, registry, forwarder, or control-topology change requires an explicit `--accept --reason` baseline refresh. CI, Linux release, and relevant seam plans run the additive gate without skipping baseline evidence.
- Focused inversion, seam, CI-alignment, result-contract, detail, result-intent, Display, golden, replay, TypeScript, build, lint, file-size, Surface, OOE, and compartment gates pass. The printer inventory remains red only on five Notebook-owned serializers outside this program's lane.
- `EQUATION-SOLVE-RESULT-CONTRACT1`: committed as `1f488623`. A private Equation district and narrow public facade define a version-1 solver carrier over a validated canonical document, accepted/rejected candidate evidence, optional candidate validation, branch evidence, planner/solve badges, substitution and numeric diagnostics, explicit analysis evidence, and solved versus controlled-stop state.
- Carrier validation is strict JSON-compatible and structured-clone-safe at 20,000 nodes, depth 64, and 1,280,000 UTF-8 bytes. Candidate, validation, and analysis arrays have explicit count caps; document-mirrored evidence must agree exactly, controlled-stop text must match the canonical error, and duplicate analysis IDs fail.
- The carrier core has no `DisplayOutcome` dependency. A single compatibility boundary projects current Equation outcomes without reparsing LaTeX, labels legacy errors as compatibility controlled stops, and rejects prompts.
- All six Equation golden executions and all 25 sanitized Equation replay fixtures preserve canonical-document equality and clone parity. The complete Equation district passed 142 files and 1,206 tests at the carrier commit.
- `EQUATION-OUTCOME-BOUNDARY1`: committed as `42a5efd6`. The isolated worker and main-thread fallback now return `EquationResultOutcomeBoundaryV1`; the OOE job carries that boundary and invokes one memoized canonical-result-to-Display adapter only for final payload and provenance projection.
- The boundary is strict clone-safe data bounded by the carrier limit plus a small transient-policy allowance. The client revalidates worker completions, rejects malformed carriers and cancellation-shaped completed messages, and never falls back after a post-start invalid response. Cancellation remains a local hard-stop control boundary, while runtime advisories remain transient and outside the canonical document.
- Host IDs, capability identity, request shape, guarded trace, stale/cancel rules, commit legality, diagnostics, fallback policy, and History-ticket behavior remain unchanged. Prompts and executable result actions fail closed rather than being silently embedded in result truth.
- The accepted inversion inventory now measures 574 producer boundaries and 757 consumer reads. Equation records one native canonical-to-Display boundary adapter, 120 compatibility producers, 245 forwarders, 16 controls, 265 legacy reads, and zero canonical reads; this is boundary infrastructure, not a claim that Equation producers are already native.
- Full verification passes 143 Equation files and 1,213 tests, focused boundary/worker suites, TypeScript, production build, global lint, file sizes, Display inversion, Surface, OOE, compartments, seam selection, and diff hygiene. Eight headless Chromium Equation cases and three inspected screenshots preserve answer, domain, branch, periodic, detail, and overflow behavior.
- The printer ratchet's seven tests pass, but its live inventory remains red on five Notebook-owned `resultLatex` paths committed by the parallel Notebook lane. This carrier adds no result serializer or printer debt, so the unrelated paths remain outside this milestone rather than being silently registered here.
- `RESULT-DOCUMENT-CALCULATE-EQUATION-CORE1`: committed as `9cde95f1`. A neutral producer builder creates validated documents directly from typed producer fields; Calculate evaluate/simplify/factor/expand routes and proven Equation finite-root routes dual-write native documents without parsing LaTeX or changing presentation.
- Native Equation documents survive orchestration only while they exactly match the current compatibility projection. Target rewrites, Calculus enrichment, or any other legacy-field mutation removes stale native truth and remains on the compatibility path until its owning producer slice migrates.
- The accepted inventory now measures 585 producer boundaries, 773 consumer reads, 157 compatibility projections, 554 legacy reads, and seven native-document calls. Calculate records two native boundaries and one compatibility producer; Equation records four native boundaries, 120 compatibility producers, and 265 legacy reads.
- Browser verification found and closed two migration defects before commit: undefined runtime-advisory properties could not cross the strict Equation JSON boundary, and canonical round-trip projection could lose uniform text/math row intent. Transport advisories are now compacted explicitly, and projection restores uniform `lineKind`/`lineKinds` before using mixed `lineParts`.
- All 43 golden executions and 100 replay fixtures preserve canonical-document and visible-field parity. The full unit suite passes 523 files and 3,659 tests; 19 Chromium canaries and focused Calculate/Equation/Calculus visual evidence pass with zero accepted output drift.
- The five separately committed Notebook result serializers are now classified narrowly as non-producer document content in the printer registry. Notebook source remains untouched, and the printer ratchet is green with zero compatibility fallbacks.
- `RESULT-DOCUMENT-EQUATION-ADVANCED1`: verified and entering its approved commit. One Equation-owned adapter builds validated native documents from every stable typed success or math-bearing controlled-stop field across parameterized, numeric, Complex, composition, system, guarded, guided-polynomial, target, stored-value, and orchestration routes; prompts remain control outcomes.
- Native Equation truth is now a hard post-producer invariant: every non-prompt Equation result must retain a native document at the worker/fallback boundary. Stale enrichment is rejected rather than silently returning to compatibility projection, and OOE cancellation remains an explicitly registered control-only boundary.
- The accepted inventory now measures 586 producer boundaries, 768 consumer reads, 37 compatibility projections, 554 legacy reads, and 127 native calls. Equation records 124 native producers, zero compatibility producers, 251 forwarders, 17 controls, 265 legacy reads, and five canonical reads. Consumer inversion remains later work; this gate does not disguise unchanged legacy-read debt.
- All six Equation golden executions and all 25 Equation replay fixtures are native. Full Equation verification passes 145 files and 1,217 tests; result-contract, solve-result, intent, detail, printer, replay, runtime, UI, TypeScript, build, lint, file-size, CI, seam, Surface, OOE, and compartment gates pass.
- Nineteen Chromium canaries pass in 1.2 minutes. Three focused headless tests and seven inspected screenshots cover parameterized success, the established exponential Exact-mode stop, interval numeric roots, Complex roots, guided quartic roots, range guards, and the live legacy Trigonometry equation handoff without clipping or output drift.
- Cross-workspace ownership is explicit: Trigonometry removes Equation's canonical document after changing title/actions/planner presentation and remains compatibility-owned until `RESULT-DOCUMENT-GUIDED-DOMAINS1`; the unit and browser gates pin that handoff.

## Verification Contract

- Every implementation gate runs focused tests, TypeScript, build, lint, file-size, memory, OOE/compartment/Surface boundaries, seam selection, and `git diff --check`.
- Persistence evidence covers all current fields, unknown extensions, malformed/future versions, sparse legacy records, 80-entry retention, deletion, Calculator Memory, browser reload, Rust file restart, and a real Tauri restart.
- Result-document evidence covers clone safety, bounds, invalid MathJSON, omission fallback, prohibited transient data, projection idempotence, all 43 golden executions, and all 100 replay fixtures.
- History browser evidence covers all nine workspaces, current notation preferences, original titles/details, no saved actions, exact Table rows, legacy records, warnings, and overflow.
- Equation carrier work runs the full Equation, worker/fallback, OOE, benchmark, domain, and branch-readback gates before presentation migration closes.
- Every app-visible slice uses Playwright and records exact old/new output parity. The final closeout runs the complete unit/UI/E2E, canary, replay, runtime, printer/detail/clipboard, TypeScript/build/lint/Rust, and static gate set.

## Governance And Parallel Work

- User acceptance grants standing commit approval only for the named milestones above. No push is authorized.
- Any inserted prerequisite, combined milestone, intentional output change, or scope change requires a pause and fresh approval.
- Notebook design/editor work may proceed concurrently. Durable Notebook persistence is deferred until `HISTORY-PERSISTENCE-PARITY-CLOSURE1` commits.
- This program must not edit `src/lib/notebook/**`, `src/app/shell/NotebookPage.tsx`, `src/styles/app/notebook.css`, or Notebook tests unless a later explicit coordination changes the lane.
- If another agent introduces tracked changes that touch shared app-state, History, Display, printer, Clipboard, `AppMain.tsx`, or Tauri persistence, stop and resync before editing or committing.
- Statistics guided controls, Table capability growth, Matrix/Vector capability expansion, Surface hosting, and legacy-field removal remain out of scope.

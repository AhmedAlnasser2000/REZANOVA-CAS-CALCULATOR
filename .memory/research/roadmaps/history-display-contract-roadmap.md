# HISTORY-DISPLAY-CONTRACT-ROADMAP0

Date: 2026-07-11
Status: accepted; implementation begins with History persistence parity; no push is authorized

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
3. `CANONICAL-RESULT-DOCUMENT1`: add neutral versioned types, validation, a no-reparse compatibility projection, and optional `DisplayOutcome.canonicalResult`.
4. `HISTORY-STRUCTURED-RESULT2`: dual-write/read the full result document, preserve exact Table rows, and retain legacy fallback.
5. `DISPLAY-CONTRACT-INVERSION-RATCHET1`: inventory native/projected/forwarded/control producers and legacy consumers with nonincreasing lane floors.
6. `EQUATION-SOLVE-RESULT-CONTRACT1`: separate Equation solver evidence from the Display contract.
7. `EQUATION-OUTCOME-BOUNDARY1`: migrate Equation orchestration and worker/fallback boundaries to one final canonical-result adapter.
8. `RESULT-DOCUMENT-CALCULATE-EQUATION-CORE1`.
9. `RESULT-DOCUMENT-EQUATION-ADVANCED1`.
10. `RESULT-DOCUMENT-SYMBOLIC-LIMITS1`.
11. `RESULT-DOCUMENT-SYMBOLIC-INTEGRATION1`.
12. `RESULT-DOCUMENT-CALCULUS1`.
13. `RESULT-DOCUMENT-GUIDED-DOMAINS1`.
14. `RESULT-DOCUMENT-LINEAR-ALGEBRA1`.
15. `RESULT-DOCUMENT-PRODUCER-CLOSEOUT1`: reduce live compatibility projection to zero for successful producer results.
16. `DISPLAY-READ-MODEL-INVERSION1`: derive Display blocks, scheduling, and Formula Viewer content from canonical documents.
17. `CANONICAL-RESULT-CONSUMER-INVERSION1`: migrate Clipboard, `Ans`, editor transfer, workspace display state, History, print hygiene, and Surface mapping.
18. `DISPLAY-CONTRACT-INVERSION1`: make canonical documents authoritative while retaining derived legacy projections.
19. `HISTORY-DISPLAY-CONTRACT-CLOSEOUT0`: run the full gate, inspect restart behavior and all nine workspaces, and review accumulated evidence with the user.

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

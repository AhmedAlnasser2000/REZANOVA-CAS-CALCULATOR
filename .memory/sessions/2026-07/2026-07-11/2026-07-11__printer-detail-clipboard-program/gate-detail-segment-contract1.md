# DETAIL-SEGMENT-CONTRACT1 Gate

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

- Kind: `backend` contract with `ui` and real-browser rendering evidence.
- Result: pass.
- Runtime behavior changed: detail intent is now explicit in the shared renderer and typed solve-summary payload. Mathematical results, wording, History persistence, Surface Protocol, OOE, workers, and Clipboard behavior are unchanged.

## Contract Evidence

- `DetailLineContent` moved out of `DisplayResultBlocks.tsx` and is shared by the main Display, Formula Viewer, and solve-note surface.
- Renderer precedence is nonempty typed parts, explicit `math`/`text`, undeclared legacy inference, then plain text.
- Empty policy-generated part arrays do not suppress an explicit line kind.
- `mixedDetailSection()` and `solveSummaryFromParts()` derive legacy strings from typed source parts.
- Optional `solveSummaryParts` is additive; print hygiene collects only its math parts.
- `lines`, `lineKind`, `lineKinds`, and `solveSummaryText` remain compatibility inputs for stored History and older consumers.
- `DisplayResultBlocks.tsx` shrank from 898 to 842 lines; no file-size cap changed.

## Verification Evidence

- `npm run test:display-contracts`: 136 native and 25 UI tests passed.
- Printer: 12; golden: 44; print hygiene: seven across the 43-case/185-fragment manifest; all 100 History replay fixtures passed.
- Feature probes: 124 native plus 37 UI. Clipboard contract: 27 native, 32 UI, and three audit checks.
- Full unit: 3,541. Full UI: 452.
- Runtime probes: 19; workspace runtime: 74; app runtime: 59 native plus 140 UI; app-state: 52.
- All 19 Chromium canaries passed in 1.2 minutes; all nine History create/replay browser flows passed.
- One heavy Equation compact-result/Formula Viewer flow and three Matrix/Vector detail flows passed in Chromium.
- Visual inspection covered all nine replayed workspace surfaces, mixed math/prose, open and collapsed cards, a 39K-character virtualized Formula Viewer artifact, and Matrix/Vector detail density. No overlap, clipping, stale content, or unreadable overflow was found.
- Seam impact selected Display, Clipboard, shared types, runtime, app-state, and printer migration evidence; all required suites passed.
- TypeScript, production build, lint, app identity, CI alignment, Surface Protocol, OOE, compartments, file size, Cargo check, memory protocol, and `git diff --check` passed.

## Remaining Boundary

- Existing live producers are not declared migrated by this foundation. The eight approved risk slices must add the AST/runtime migration ratchet and reach zero undeclared live intent in each owned scope.
- Historical and snapshot-less History compatibility keeps inference after live producer closeout.
- Pedagogical printer profiles remain blocked by the mandatory contract review after all eight detail slices.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-11.md`
- `.memory/research/roadmaps/printer-detail-clipboard-roadmap.md`
- `.memory/sessions/2026-07/2026-07-11/2026-07-11__printer-detail-clipboard-program/`

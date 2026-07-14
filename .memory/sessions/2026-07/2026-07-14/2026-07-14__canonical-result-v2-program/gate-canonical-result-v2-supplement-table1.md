# CANONICAL-RESULT-V2-SUPPLEMENT-TABLE1

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

- kind: ui
- result: pass
- production V2 routes: Equation domain-boundary/rational-radical results with native typed labeled supplements, plus Table domain-boundary and rational-function
- residual change: five Equation supplement leaves and three Table undefined-cell leaves removed; 11 exemptions remain
- protected state: concurrent Notebook video work, Rust OOE edits, and untracked `test-results/` were excluded

## Implemented

- Threaded Equation's existing native domain relation evidence through the workspace-owned analysis carrier, preserving labeled presentation while assigning typed `exclusion` or `condition` roles without parsing semantic math from strings.
- Added an Equation V2 final-boundary adapter that activates only when every labeled supplement has matching producer-proven standard MathJSON. Internal Equation carrier ownership, workers, hosts, capabilities, replay seeds, and OOE authority remain unchanged.
- Migrated Table domain-boundary and rational-function routes to V2 value/undefined cells. The engine now classifies native evaluation failures as `outside-real-domain` or `pole`, and neighboring defined cells retain producer-owned MathJSON.
- Preserved normalized request readback for Equation V2 through existing resolved-input metadata. Builder failure remains explicit and never falls back to V1.
- Removed exactly eight reviewed coverage exemptions and accepted only the corresponding producer-boundary fingerprint changes in the display-inversion baseline.

## Verification

- `npm run test:result-contract`: 13 files / 83 tests pass, including the eight new supplement/Table cases, all 43 golden executions, all 100 replay executions, and strict V2 registry expectations.
- `npm run test:equation-solve-result`: 6 files / 19 tests pass; focused Table, replay, and golden suites: 3 files / 59 tests pass.
- MathJSON coverage: 143 executable cases, 455 leaves, 444 producer-proven, 11 exempt, zero missing.
- Display inversion: 401 producer boundaries, 150 native documents, 59 canonical reads, zero compatibility projections, and zero legacy reads. The accepted baseline reason names this gate.
- Production Vite build, file-size validation, and diff hygiene pass. Incremental TypeScript passed after the V2 implementation; the final shared recheck is blocked only by concurrent Notebook work importing the not-yet-present `NotebookVideoNodeView` from `src/app/shell/notebook/canvas/extensions.tsx`.
- Chromium: 2/2 focused scenarios pass against the real app, covering all five Equation supplement cases, both Table undefined reasons, defined neighboring cells, V2 History persistence/replay for successful results, visible cards, and no observed horizontal overflow.

## Recovery Notes

- Equation controlled-error results are not persisted by current History policy, so the browser gate visually inspects those result cards while contract tests validate their V2 documents. Successful Equation and Table results receive History persistence/replay coverage.
- Display renders the established mathematical suffix for supplements while the raw V2 document preserves the complete adapter-owned labeled presentation. No visible label or math output was changed.

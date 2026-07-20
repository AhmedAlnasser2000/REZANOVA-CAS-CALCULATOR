# GRAPHING-INSTANT-VIEWPORT-CORRECTION1 verification summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live
- gate_type: ui
- date: 2026-07-20

## Passing focused evidence

- Incremental TypeScript and the normal Vite web build pass. No Tauri or Linux package build was run.
- Focused Graph source coverage passes: 99 contract/sampling/scene/headless/OOE tests, 24 Graph UI tests, plus targeted final sampler/request regressions.
- Focused production Playwright passes tracing with scaled coordinates, rapid interaction, polar/parametric behavior, piecewise discovery, `log(sin x)` viewport-edge completion, and long-expression horizontal overflow. Required surface usability passes at 1180x760, 1280x800, 1440x940, and 1920x1080.
- Visual inspection confirms smooth rounded `log(sin x)` branches through the visible bottom edge and a fixed-action long-expression row with overflow-only scrolling.
- Clipboard contracts pass 64 Vitest assertions plus the three-case capability audit after the shared MathEditor read-only tab-order correction.
- Graph/OOE/compartment boundary tests and validators pass; file-size validation and `git diff --check` pass; Three.js dependency/import scan is empty.

## Recorded non-passing checkpoints

- The retained mixed workload test times out waiting for a settled baseline and truthfully renders `This view could not be completed safely` with 11 visible items. This is not a stuck worker or stale commit; it is the quality/throughput acceptance target for dedicated Move 16.
- The pre-existing eager-main bundle ratchet remains red: about 7,173.37 kB raw and 2,000.17 kB gzip versus 2,148.44/732.42 kB limits; largest app chunk is about 3,332.15 kB versus 878.91 kB. The lazy Graph chunk remains separate at about 127.13 kB raw / 39.13 kB gzip. No limit was changed.

## Visual evidence

- `test-results/graphing-minimum-visible-G-e5e70-h-the-visible-viewport-edge-chromium/graphing-log-sin-edge-completion-1440x940.png`
- `test-results/graphing-minimum-visible-G-71ffa-rollable-with-fixed-actions-chromium/graphing-long-expression-horizontal-scroll-1180x760.png`
- `test-results/graphing-performance-GRAPH-c5ce3-ling-and-lifecycle-contract-chromium/error-context.md`

## Scope integrity

- `GraphRelationIR` remains downstream authority and authored LaTeX remains source/provenance only.
- No Three.js, Analyze, analysis OOE, Complex/Both, Export, Presentation, History, Notebook, Surface Protocol, calculator Variables, solver/result authority, OOE diagnostics UI, or desktop packaging change entered this gate.

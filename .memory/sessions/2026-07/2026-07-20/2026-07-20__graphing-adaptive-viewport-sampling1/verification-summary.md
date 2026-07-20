# GRAPHING-ADAPTIVE-VIEWPORT-SAMPLING1 verification summary

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
- gate_type: backend and ui
- date: 2026-07-20

## Passing focused evidence

- Incremental TypeScript passes after the V3 contract/controller/worker migration.
- Focused contract/evaluator/sampler/request/OOE coverage passes 56 assertions; focused Graph viewport/workspace UI coverage passes 24 assertions.
- Production Playwright performance passes five cases: the canonical 25-row/10-visible workload plus 1180x760, 1280x800, 1440x940, and 1920x1080 surfaces.
- Measured workload evidence: 132.4ms first preview, 162.6ms settled scene, 47ms editor feedback, 16.8ms p95 frame interval under 4x slowdown, zero main-thread long tasks, zero stale preview commits, and no positive retained-heap growth after 20 open/close cycles.
- Targeted production Playwright passes `log(sin(x))` viewport-edge completion, high-degree/explicit-x/directed geometry after rapid interaction, and polar/parametric adaptive-grid behavior.
- Visual inspection confirms smooth branch tops and viewport-edge descent for `log(sin(x))`, complete high-degree and directed-region geometry after zoom, and polar grid coverage when the origin is displaced.
- The normal web build passes. No Tauri/Linux package build or full repository test suite was run.

## Visual evidence

- `test-results/graphing-minimum-visible-G-e5e70-h-the-visible-viewport-edge-chromium/graphing-log-sin-edge-completion-1440x940.png`
- `test-results/graphing-minimum-visible-G-7fee8-e-through-rapid-interaction-chromium/graphing-interaction-sampling-correction-1440x940.png`
- `test-results/graphing-minimum-visible-G-cf0c5-plicit-adaptive-grid-choice-chromium/graphing-polar-grid-1440x940.png`
- Playwright console evidence recorded the complete canonical workload metrics listed above; passing attachments were not retained by the configured reporter.

## Scope integrity

- `GraphRelationIR` remains downstream mathematical authority; authored LaTeX remains source/provenance only.
- OOE retains `graph.sample`, worker ownership, cancellation, and latest-only commit legality. SVG remains the reference renderer.
- No Three.js, Analyze, Complex/Both, Export, persistence, Notebook, History, Surface Protocol, calculator Variables, result-contract, solver-precedence, OOE diagnostics UI, or desktop packaging change entered Move 16.
- The pre-existing eager-main bundle ratchet remains separate and no threshold was changed.

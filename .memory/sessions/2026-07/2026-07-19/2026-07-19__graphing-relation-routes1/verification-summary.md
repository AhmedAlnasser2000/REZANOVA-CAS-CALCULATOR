# GRAPHING-RELATION-ROUTES1 verification summary

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
- date: 2026-07-19

## Focused evidence

- Pure Graph document, sampling, scene, hit-testing, and shared shortcut tests passed 23/23 with one worker.
- Focused Graph page/viewport/MathEditor UI tests passed 30/30 with one worker. The promotion regression proves the exact MathLive element survives its first authored character; pointer tests prove tracing and twenty-move gestures do not commit viewport state during movement.
- Graph OOE/request/manifest/outbox evidence passed 29/29 with one worker. Active-job registry and Graph OOE follow-up passed 18/18 and the compartment validator passed after replacing the prior Move 8 private event-outbox import with the audited registry subscription.
- Production Playwright used one worker. The existing visible/pan/reduced-motion scenarios passed, then the final optimized artifact passed uninterrupted `sin(x)`/`infinity` typing and explicit-x/point relation-correct tracing. The 1440x940 production screenshot is recorded in `design-qa.md`.
- Targeted ESLint, incremental TypeScript, production builds, Graph/OOE/compartment boundaries, seam selection, memory protocol, file-size validation, and diff hygiene passed. The Graph page remains lazy at 68.18 kB raw / 23.06 kB gzip. The global bundle ratchet remains red on the accumulated 3.3 MiB eager app entry against its existing 900 kB cap; Move 9 does not alter that eager import graph or raise the baseline, and the required repair is recorded before the Move 13 checkpoint. No full unit/UI suite is required.
- All heavy commands ran sequentially. No full-suite worker fan-out was used; focused Vitest and Playwright used one worker. Codex-owned preview/build processes are stopped before handoff; the pre-existing user development server on port 1420 was left untouched.

## Scope integrity

- Structured Graph relation/point authority remains downstream truth; source LaTeX is authoring provenance only.
- Pointer tracing never calls OOE and does not mutate document history.
- Move 9 does not implement implicit regions, inequalities, piecewise editing, parameters, polar/parametric plotting, adaptive polar grids, Analyze, Complex/Both, Export, Presentation, Three.js, History, Notebook, Surface Protocol, calculator Variables, solver precedence, result contracts, or OOE diagnostics UI.

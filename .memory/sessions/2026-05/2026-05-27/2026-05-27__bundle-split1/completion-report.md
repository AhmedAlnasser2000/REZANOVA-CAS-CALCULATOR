# BUNDLE-SPLIT1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Summary

Implemented `BUNDLE-SPLIT1` as a frontend startup bundle split and measurement pass before `OOE-RS0`.

The work moved non-initial workspaces, side surfaces, selected runtime modules, exact algebra transform analysis, Table runtime, Equation UI target analysis, variable-memory panel helpers, and symbolic display normalization off the initial import graph where safe.

## Changes

- Added `npm run build:analyze` and `npm run test:bundle-size`.
- Added `tools/report-bundle-size.mjs` to read the Vite manifest, follow eager imports, report raw/gzip chunk sizes, write `dist/bundle-report.json`, and enforce startup/app-chunk budgets.
- Added named Vite manual chunks for React, MathLive, Compute Engine, Tauri API, Zod, and remaining vendor code.
- Lazy-loaded major non-initial workspaces and side surfaces through `React.lazy`/`Suspense`.
- Dynamically imported heavy runtime modules for Equation, Advanced Calc, Table, Trigonometry, Geometry, Statistics, and exact algebra transform analysis.
- Split light UI-only helpers out of heavier solver/runtime modules:
  - `equation-ui-model`
  - `equation-target-resolution`
  - `variable-memory-store`
  - `algebra-transform-ui`
- Deferred symbolic display normalization behind a dynamic import so ordinary startup display rendering does not eagerly load Compute Engine.

## Measured Result

Before:

- single startup app chunk around `3370.44 kB` raw / `893.22 kB` gzip.

After:

- `38` JavaScript chunks.
- eager startup JS: `1519.62 kB` raw / `411.13 kB` gzip.
- largest app chunk: `470.41 kB` raw / `114.36 kB` gzip.
- Compute Engine remains a named lazy vendor chunk at `1039.54 kB` raw / `283.91 kB` gzip.

## Non-Goals Preserved

- No solver behavior changes.
- No history schema changes.
- No variable policy changes.
- No OOE runtime scheduling or cancellation behavior.
- No result-origin, badge, or UI redesign changes.

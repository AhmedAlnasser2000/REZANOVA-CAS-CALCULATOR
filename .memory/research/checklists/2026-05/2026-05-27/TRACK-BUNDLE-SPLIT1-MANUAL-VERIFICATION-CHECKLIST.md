# TRACK-BUNDLE-SPLIT1 Manual Verification Checklist

Date: 2026-05-27
Milestone: `BUNDLE-SPLIT1`
Status: implemented locally

## Scope

- Analyze the current production bundle and add a repeatable bundle-size report.
- Split obvious startup-heavy surfaces without changing calculator behavior.
- Keep initial Calculate editor eager and usable.
- Do not change solver behavior, OOE runtime scheduling, history schema, variable policy, or result semantics.

## Build/Bundle Checks

- [x] `npm run build`
- [x] `npm run build:analyze`
- [x] `npm run test:bundle-size`

Measured after split:

- JS chunks: `38`
- Eager JS: `1519.62 kB` raw, `411.13 kB` gzip
- Largest app chunk: `assets/index-*.js`, `470.41 kB` raw, `114.36 kB` gzip
- Largest vendor chunk: `assets/vendor-compute-engine-*.js`, `1039.54 kB` raw, `283.91 kB` gzip

Baseline before split:

- Single startup app chunk: about `3370.44 kB` raw, `893.22 kB` gzip.

## Regression Checks

- [x] `npm run test:unit -- src/app/logic/modeActionHandlers.test.ts src/app/logic/runtimeControllers.test.ts src/lib/input/input-canonicalization.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`

## Manual Checks

- [ ] Fresh startup opens Calculate with the MathLive editor ready.
- [ ] Equation workspace opens after lazy load and solves an existing selected-target example.
- [ ] Advanced Calc workspace opens after lazy load and evaluates a derivative/integral example.
- [ ] Guide, History, Settings, Variables, Labs, Trigonometry, Geometry, Statistics, Table, Matrix, and Vector surfaces still open from navigation.
- [ ] History replay and Guide example launch still route into lazy workspaces correctly.

## Notes

- Compute Engine remains a named vendor chunk, but is no longer part of the eager startup import graph.
- MathLive stays eager because the initial Calculate path needs the math field immediately.
- The bundle-size script enforces app/eager budgets so the Vite chunk warning limit is documented rather than used as the real safety net.

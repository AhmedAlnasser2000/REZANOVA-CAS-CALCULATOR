# BUNDLE-SPLIT1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Passed

- `npm run build`
- `npm run build:analyze`
- `npm run test:bundle-size`
- `npm run test:unit -- src/app/logic/modeActionHandlers.test.ts src/app/logic/runtimeControllers.test.ts src/lib/input/input-canonicalization.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx`
- `npm run test:golden`
- `npm run test:memory-protocol`
- `npm run lint`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Bundle Evidence

`npm run test:bundle-size` reported:

- JS chunks: `38`
- Eager JS: `1519.62 kB` raw, `411.13 kB` gzip
- Largest chunk: `vendor-compute-engine`, `1039.54 kB` raw, `283.91 kB` gzip
- Largest app chunk: `index`, `470.41 kB` raw, `114.36 kB` gzip

## Notes

- The AppMain UI suite passed after lazy loading changes, including launcher, Guide, history replay, Equation selected-target flows, Table, and stored-variable UI paths.
- The focused unit bundle passed; the listed `modeActionHandlers.test.ts` path did not exist in the current run target set, so Vitest executed the existing matching files in the command.
- Full broader gates passed after the lazy-load, deferred-display, and memory metadata fixes.

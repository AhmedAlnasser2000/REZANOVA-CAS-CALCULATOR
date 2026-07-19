# APP-SHELL-UTILITY-OVERLAY-FIX1 verification summary

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
- date: 2026-07-18

## Automated evidence

- `npm run test:ui -- src/app/shell/SideSurfaceHost.ui.test.tsx` — 4/4 passed for retained exit, rapid reopen, presentation changes, and OOE immediate behavior.
- `npm run build` — TypeScript and production Vite build passed; only existing chunk/dynamic-import warnings were reported.
- `npx playwright test e2e/qa1-smoke.spec.ts --project=chromium --grep "transparent, responsive overlay"` — passed after rebuilding the production preview.
- The browser assertion proves transparent computed backdrop color, 180ms entry, 140ms exit, outside-click dismissal, and eventual unmount.
- `npx eslint e2e/qa1-smoke.spec.ts` passed.
- `npm run test:memory-protocol` passed all 21 validator tests and live validation.
- `npm run test:file-sizes` passed all 10 validator tests and 2,025 live files against five baseline caps.
- `git diff --check` passed.

## Playwright visual evidence

- Chromium captures under `.task_tmp/app-shell-utility-overlay-fix1/visual/` cover Settings, History, Variables, and Menu at 1440x900; Settings at 1920x1080 with 130% UI Scale; and Settings outboard at 2560x1440 with 100% UI Scale.
- Every overlay reported `rgba(0, 0, 0, 0)` and retained readable panel contrast without document dimming. The 2560px case remained outboard with no backdrop.
- Reduced-motion Chromium evidence reported `transitionDuration: 0.001s, 0.001s` and `transform: none` while retaining transparent outside-click dismissal.
- Visual inspection found no clipping, stale veil, contrast regression, or ownership change.

## Scope integrity

- Runtime changes are limited to `src/styles/app/side-surfaces.css`; the focused Playwright assertion is in `e2e/qa1-smoke.spec.ts`.
- Graphing, OOE diagnostics code/styles, workspace launcher menus, result contracts, and panel presence lifecycle were not changed.

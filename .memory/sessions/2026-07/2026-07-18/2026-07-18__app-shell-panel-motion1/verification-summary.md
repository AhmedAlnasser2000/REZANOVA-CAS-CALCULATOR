# APP-SHELL-PANEL-MOTION1 verification summary

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

- `npx eslint src/app/shell/SideSurfaceHost.tsx src/app/shell/SideSurfaceHost.ui.test.tsx src/AppMain.tsx`
- `npx vitest run --config vitest.ui.config.ts src/app/shell/SideSurfaceHost.ui.test.tsx --maxWorkers=1` — 4/4 passed.
- Focused `AppMain.ui.test.tsx` panel cases — 5/5 passed.
- `src/AppMain.workspace-tabs.ui.test.tsx` plus host suite — 12/12 passed.
- `git diff --check` passed before memory recording.

## Playwright visual evidence

- Existing development server at `http://127.0.0.1:1420/` captured Settings at overlay entry/settled/closing, wide outboard, left Menu Inspector overlay, and reduced-motion states.
- No page errors were reported in the final visual captures.
- Wide Settings reported `outboard`; narrow Menu Inspector reported `overlay`; reduced motion reported `transform: none` and `transitionDuration: 0.001s, 0.001s`; closing host reported `exiting`, `aria-hidden=true`, then unmounted.
- Captures are ignored under `.task_tmp/app-shell-panel-motion1/`.

## Scope integrity

- Production changes are limited to `SideSurfaceHost`, its AppMain renderer seam, and side-surface CSS; the AppMain test change observes the new exit lifetime.
- OOE diagnostics, workspace launcher menus, Graphing, result contracts, and the unrelated Equation dirty lane were not changed.

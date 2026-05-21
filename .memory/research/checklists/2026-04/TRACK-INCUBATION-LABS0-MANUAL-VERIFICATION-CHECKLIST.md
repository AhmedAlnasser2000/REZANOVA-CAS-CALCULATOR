# TRACK INCUBATION-LABS0 Manual Verification Checklist

Date: 2026-04-30

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- `INCUBATION-LABS0` adds a generated Labs catalog pipeline.
- The tool reads `playground/manifests/*.yaml` and `playground/records/INDEX.md`.
- The committed runtime snapshot lives under `src/lib/labs/`.
- `npm run generate:labs-catalog` refreshes the snapshot.
- `npm run test:labs-catalog` verifies:
  - generated snapshot freshness
  - manifest/index consistency
  - allowed statuses and levels
  - duplicate experiment id rejection
  - Labs runtime files do not import or dynamically load Playground code
- `test:labs-catalog` is wired into `npm run test:gate`, `ci-linux`, and `Release Linux`.
- A developer-only `Labs` launcher/mode surface appears when `VITE_SHOW_LABS=1`.
- The Labs UI renders experiment list/detail metadata with status and level chips.

## Boundaries Preserved

- Stable app runtime imports only `src/lib/labs/*`, not `playground/`.
- `playground/...` paths in the catalog are inert display text only.
- The Labs UI does not execute experiments.
- No remote controls were added.
- No stable result delegation was added.
- No history mixing was added.
- No normal-user experimental mode was added.
- No FriCAS research, math capability, solver behavior, or product architecture change was added.

## Automation Gate

```bash
npm run generate:labs-catalog
npm run test:labs-catalog
npm run test:memory-protocol
npm run test:unit
npm run test:ui
npm run lint
npm run build
```

## Manual App Steps

Run only in a development shell:

```bash
VITE_SHOW_LABS=1 npm run dev
```

1. Open the launcher.
2. Confirm a `Labs` category appears.
3. Open `Labs`.
4. Confirm active, promoted, and paused experiments are visible.
5. Select each experiment state.
6. Confirm the detail panel shows record path, manifest path, last review, next review, candidate stable home, and next step.
7. Confirm the boundary note says the view is read-only and not product behavior.
8. Confirm there is no run button, remote control, result delegation, or history behavior.
9. Restart without `VITE_SHOW_LABS=1`.
10. Confirm the `Labs` launcher category is absent.

Expected result:
- Labs is visible only in dev when explicitly enabled.
- The dashboard is useful for visual inspection but cannot execute or promote Playground behavior.
- The one-way law remains intact.

## Pass/Fail

- Catalog generation: passed on 2026-04-30.
- Labs catalog validation: passed on 2026-04-30.
- Focused unit coverage: passed on 2026-04-30.
- Focused Labs UI coverage: passed on 2026-04-30.
- Memory protocol: passed on 2026-04-30.
- Full unit suite: passed on 2026-04-30.
- Full UI suite: passed on 2026-04-30.
- ESLint: passed on 2026-04-30.
- Production build: passed on 2026-04-30.
- Rust cargo check: passed on 2026-04-30.
- Manual smoke: optional after automation.

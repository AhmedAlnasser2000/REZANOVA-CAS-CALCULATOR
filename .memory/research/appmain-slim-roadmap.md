# APPMAIN-SLIM Follow-Up Roadmap

date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5  
status: active roadmap

## Context

`APPMAIN-SLIM0` reduced `src/AppMain.tsx` from the previous 10k+ line shape to roughly 8.1k lines by wiring existing workspace components back into the runtime shell. It preserved AppMain as the orchestration root and moved only render/view ownership into existing workspace boundaries.

`INT-RAT1` remains postponed until the app-shell organization pass is stable enough that future capability work does not keep touching one oversized root file.

## APPMAIN-SLIM1: Render Shell Extraction And Statistics Parity

Goal: reduce AppMain further through render-only extraction, still without moving state or changing behavior.

Planned outcomes:
- Bring `StatisticsWorkspace` to parity and wire it into `AppMain`.
- Extract shell render surfaces into small components, likely:
  - mode strip / top controls
  - display panel
  - soft menu
  - keypad panel
  - launcher workspace
  - side-surface host
- Keep AppMain owning state, refs, routing, history replay, execution handlers, keyboard handling, and shell orchestration.
- Preserve visible behavior, test selectors, CSS classes, result surfaces, and history behavior.

Acceptance target:
- AppMain below 7,000 lines if parity is straightforward.
- No math, solver, UI redesign, runtime behavior, or state-machine changes.

## APPMAIN-SLIM2: Controller/Handler Boundary Extraction

Goal: move already-coherent handler/controller glue out of AppMain after `SLIM1` proves render extraction is stable.

Candidate boundaries:
- soft-action dispatch
- keypad dispatch
- launcher dispatch
- history replay helpers
- mode switching helpers
- side-surface open/close helpers

Rules:
- Keep behavior-compatible pure/controller helpers first.
- Avoid moving React state ownership unless the helper boundary is already stable.
- Preserve old history replay and keyboard behavior.

Acceptance target:
- AppMain below 5,500 lines if controller extraction is clean.
- No new app architecture rewrite, reducer migration, or runtime capability work.

## APPMAIN-SLIM3: Grouped Runtime Hooks

Goal: only after render and controller boundaries are stable, evaluate grouped hooks for coherent mode/runtime state.

Completed outcomes:
- Added `useSideSurfaceRuntime` for settings/history surface state, outboard layout measurement, side-surface presentation flags, and shell scale styles.
- Added `useLauncherRuntime` for launcher categories/state, selected launcher derivation, open/back/move/digit/category/app-launch helpers, and local launcher catalog loading.
- Added `useShellFocusRuntime` for the existing focus-restoration effect across launcher-hidden workspaces without moving mode-specific state ownership.
- Kept AppMain owning current mode, settings, history entries, display outcome, mode-specific workbench state, refs, execution handlers, history replay, keyboard listener registration, and render composition.

Rules:
- Do not split hooks merely for line count.
- Each hook must have a stable owned state cluster and a small public shape.
- Focus/focus-ref behavior and history replay must remain regression-covered.
- Avoid creating hidden cross-hook cycles.

Acceptance target:
- AppMain reduced from `6094` lines to `5619` lines, below the `5700` minimum target.
- AppMain is closer to an orchestration composition file, but mode-specific state is still intentionally owned there.
- No product behavior change; capability work such as `INT-RAT1` can resume after deciding whether another AppMain slice is needed first.

## Sequencing Default

Default next decision: choose between `APPMAIN-SLIM4` for mode-specific runtime hook slicing or resuming `INT-RAT1` now that shell runtime extraction is stable.

Preferred order:
1. `APPMAIN-SLIM1` - complete
2. `APPMAIN-SLIM2` - complete
3. `APPMAIN-SLIM3` - complete
4. Optional `APPMAIN-SLIM4` only if mode-specific hook extraction is still worth doing before capability work.
5. Resume `INT-RAT1` or another capability milestone once the app-shell risk is acceptable.

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

Possible hooks:
- `useCalculateRuntime`
- `useAdvancedCalcRuntime`
- `useEquationRuntime`
- `useLinearAlgebraRuntime`
- `useGuidedCoreRuntime`
- `useHistoryRuntime`

Rules:
- Do not split hooks merely for line count.
- Each hook must have a stable owned state cluster and a small public shape.
- Focus/focus-ref behavior and history replay must remain regression-covered.
- Avoid creating hidden cross-hook cycles.

Acceptance target:
- AppMain becomes an orchestration composition file rather than a state warehouse.
- No product behavior change; capability work such as `INT-RAT1` resumes only after this risk is acceptable.

## Sequencing Default

Default next milestone: `APPMAIN-SLIM1`.

Preferred order:
1. `APPMAIN-SLIM1`
2. `APPMAIN-SLIM2`
3. `APPMAIN-SLIM3`
4. Resume `INT-RAT1` or another capability milestone only if the app-shell risk is under control.

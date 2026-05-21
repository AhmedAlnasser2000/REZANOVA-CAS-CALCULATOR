# NP1 Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: historical-user-confirmed

- Gate: `ui`
- Status: verified, not committed

## Delivered
- Added Settings-based numeric output controls for typed approximate digits, notation mode, and scientific style.
- Routed app-owned approximate output through one shared formatter across Equation, Calculate, Table, and other numeric summaries.
- Prevented decimal-only symbolic Equation outcomes from appearing in the exact line while preserving symbolic provenance and notes.
- Finished the guarded Equation wording sweep and fixed additive-right-hand-side candidate validation issues uncovered during the PRL4 follow-up.

## Main Files
- `src/types/calculator/runtime-types.ts`
- `src/lib/schemas.ts`
- `src-tauri/src/lib.rs`
- `src/AppMain.tsx`
- `src/components/SettingsPanel.tsx`
- `src/lib/numeric-output.ts`
- `src/lib/format.ts`
- `src/lib/equation/domain-guards.ts`
- `src/lib/equation/guarded/run.ts`
- `src/lib/equation/guarded/substitution-stage.ts`
- `src/lib/modes/equation.ts`
- `src/AppMain.ui.test.tsx`
- `e2e/qa1-smoke.spec.ts`

## Notes
- Numeric output controls are display-only in `NP1`; solver effort and CE precision were not changed.
- `Auto` notation switches to scientific form only at the configured large/small magnitude thresholds.

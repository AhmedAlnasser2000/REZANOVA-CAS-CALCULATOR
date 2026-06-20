# EQUATION-COMPACT-ROOT-READBACK1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

- Added the internal Equation compact root readback helper at `src/lib/equation/roots/readback.ts`.
- The helper adapts `EquationRootSet` into current visible exact readback surfaces or returns internal non-visible/structured-stop metadata for dormant root variants.
- Refactored factorable explicit-product and exact-rational expanded factorable paths to consume the helper instead of scattered root-set render helpers.
- Preserved current visible `exactLatex`, `branchReadback`, `exactSupplementLatex`, detail sections, stops, caps, and source labels.
- Bundled the existing `EQUATION-IMPLICIT-ROOT-READBACK-AUDIT0` docs/memory into this commit per user request.

## Gate

- gate_type: backend
- milestone: `EQUATION-COMPACT-ROOT-READBACK1`

## Files Updated

- `src/lib/equation/roots/readback.ts`
- `src/lib/equation/roots/readback.test.ts`
- `src/lib/equation/parameterized/factorable-polynomial.ts`
- `.memory/research/audits/equation-implicit-root-readback-audit0-2026-06-20.md`
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-20.md`
- `.memory/research/roadmaps/equation-substrate-roadmap.md`
- `.memory/sessions/2026-06/2026-06-20/2026-06-20__equation-implicit-root-readback-audit0/`
- `.memory/sessions/2026-06/2026-06-20/2026-06-20__equation-compact-root-readback1/`

## Out Of Scope Preserved

- No visible `RootOf` / implicit-root notation.
- No implicit-root answer format.
- No DisplayOutcome or History schema change.
- No solver capability, cap, OOE, app-state, Tauri, UI, graphing, step-by-step, source-mirror, or Exact/Isolate behavior change.

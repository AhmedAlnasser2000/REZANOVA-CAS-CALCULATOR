# EQUATION-FORMULA-READBACK-SIMPLIFICATION1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate

- Gate label: backend
- Scope: producer-side Cardano/Ferrari formula readback polish.

## Summary

Added a narrow Equation-owned formula readback polish layer used by Cardano/Ferrari primary formula rows, related detail rows, and generated wrapper formula payloads. The layer removes obvious exact-arithmetic and neutral-term noise while keeping solver scope, coefficient policy, and display/copy contracts unchanged.

## Completed

- Added `formula-readback-polish.ts` under Equation parameterized ownership.
- Folded exact rational fragments such as `2/2`, `-2/2`, and simple rational powers where they appear in generated formula readback.
- Removed neutral additive noise such as `0+...` from Ferrari/Cardano rows and related detail rows.
- Preserved the existing three-way coefficient policy: generic full-slot symbolic templates keep helper-symbol readback, specialized/mixed cases show substituted rows, and concrete cases avoid generic helper-symbol primary output when formula routes are reached.
- Applied the polish to direct Cardano/Ferrari routes, rational-cleared formula routes, and generated wrapper formula payloads that consume the same producers.
- Kept derivation/detail sections available for formula explanation.

## Out Of Scope Preserved

- No broad algebraic simplification.
- No radical denesting or case-condition proving.
- No solver route widening.
- No persisted Display, History, OOE, app-state, Tauri, or copy-contract schema changes.
- No replacement of the longer-term producer-side presentation pipeline.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-25.md`
- `.memory/sessions/2026-06/2026-06-25/2026-06-25__equation-formula-readback-simplification1/`

## Commit Status

Implementation and verification are complete. Commit is pending the final staged checkpoint.

## Next Discussion Focus

Manual QA should compare formula-polished outputs against the longer-term presentation pipeline backlog: this gate removes the most obvious arithmetic noise, while deeper simplification and expression-structured rendering remain separate future work.
